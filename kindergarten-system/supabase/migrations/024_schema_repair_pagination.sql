-- Apply after 023. Repairs legacy parent schemas used by master_visible/onboarding.
BEGIN;
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS communication_preference TEXT NOT NULL DEFAULT 'WhatsApp';
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS primary_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.branch_staff ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
CREATE OR REPLACE FUNCTION public.fee_aging_report(page_number INTEGER DEFAULT 0) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result JSONB;
BEGIN
 IF COALESCE(public.auth_user_role(),0) NOT IN(1,2,5) THEN RAISE EXCEPTION 'Finance access required' USING ERRCODE='42501'; END IF;
 IF page_number IS NULL OR page_number<0 OR page_number>100000 THEN RAISE EXCEPTION 'Invalid page'; END IF;
 WITH scoped AS (
 SELECT p.id,p.invoice_no,p.fee_student_name,p.fee_branch_name,p.amount,p.due_date,lower(p.status) AS status,
 CASE WHEN lower(p.status)='partial' THEN 'Needs reconciliation' WHEN p.due_date IS NULL THEN 'Missing due date'
 WHEN p.due_date >= (now() AT TIME ZONE 'Asia/Kuala_Lumpur')::DATE THEN 'Not overdue'
 WHEN (now() AT TIME ZONE 'Asia/Kuala_Lumpur')::DATE-p.due_date<=30 THEN '1–30 days'
 WHEN (now() AT TIME ZONE 'Asia/Kuala_Lumpur')::DATE-p.due_date<=60 THEN '31–60 days'
 WHEN (now() AT TIME ZONE 'Asia/Kuala_Lumpur')::DATE-p.due_date<=90 THEN '61–90 days' ELSE 'Over 90 days' END AS bucket,
 EXISTS(SELECT 1 FROM payment_proofs f WHERE f.payment_id=p.id AND f.status='pending') AS awaiting_verification
 FROM payments p WHERE lower(p.status) IN('pending','overdue','partial') AND public.can_manage_fee_branch(p.branch_id)
 ), buckets AS (SELECT bucket,count(*) AS count, CASE WHEN bucket='Needs reconciliation' THEN NULL ELSE sum(amount) END AS amount FROM scoped GROUP BY bucket),
 page AS (SELECT * FROM scoped ORDER BY due_date ASC NULLS FIRST,id LIMIT 10 OFFSET page_number*10)
 SELECT jsonb_build_object('as_of',(now() AT TIME ZONE 'Asia/Kuala_Lumpur')::DATE,'total',(SELECT count(*) FROM scoped),
 'buckets',COALESCE((SELECT jsonb_agg(to_jsonb(buckets)) FROM buckets),'[]'::JSONB),
 'rows',COALESCE((SELECT jsonb_agg(to_jsonb(page)) FROM page),'[]'::JSONB)) INTO result;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.notification_inbox(page_number INTEGER DEFAULT 0) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result JSONB;
BEGIN
 IF COALESCE(auth_user_role(),0) NOT IN(1,2,3,4,5) THEN RAISE EXCEPTION 'Active account required'; END IF;
 IF page_number IS NULL OR page_number<0 OR page_number>100000 THEN RAISE EXCEPTION 'Invalid page'; END IF;
 SELECT jsonb_build_object('total',(SELECT count(*) FROM notifications WHERE user_id=auth.uid()),
 'unread',(SELECT count(*) FROM notifications WHERE user_id=auth.uid() AND NOT COALESCE(is_read,false)),
 'rows',COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT id,title,message,is_read,notification_type,created_at FROM notifications WHERE user_id=auth.uid() ORDER BY created_at DESC,id DESC LIMIT 10 OFFSET page_number*10)t),'[]'::JSONB)) INTO result;
 RETURN result;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;
