-- Apply after 021. No deletion of invoices or historical payment records.
BEGIN;
CREATE OR REPLACE FUNCTION public.submit_payment_proof(target INTEGER, path TEXT, transfer_reference TEXT)
RETURNS public.payment_proofs LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE p public.payments; proof public.payment_proofs;
BEGIN
 IF public.auth_user_role() IS DISTINCT FROM 4 OR NOT public.can_read_fee(target) THEN RAISE EXCEPTION 'Only a linked parent can submit proof'; END IF;
 SELECT * INTO p FROM public.payments WHERE id=target FOR UPDATE;
 IF COALESCE(lower(p.status),'') NOT IN ('pending','overdue') THEN RAISE EXCEPTION 'This invoice is not available for full payment'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.hq_payment_account WHERE id=true) THEN RAISE EXCEPTION 'HQ bank details are not configured'; END IF;
 IF split_part(path,'/',1)<>auth.uid()::TEXT OR split_part(path,'/',2)<>target::TEXT OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='payment-proofs' AND name=path) THEN RAISE EXCEPTION 'Upload a valid proof file for this invoice first'; END IF;
 SELECT * INTO proof FROM public.payment_proofs WHERE storage_path=path AND payment_id=target AND submitted_by=auth.uid();
 IF FOUND THEN RETURN proof; END IF;
 INSERT INTO public.payment_proofs(payment_id,branch_id,submitted_by,storage_path,reference,amount)
 VALUES(target,p.branch_id,auth.uid(),path,btrim(transfer_reference),p.amount) RETURNING * INTO proof;
 INSERT INTO public.notifications(user_id,title,message,is_read,notification_type)
 SELECT id,'Payment proof awaiting verification',p.invoice_no||' · verify the bank transaction before approval.',false,'payment'
 FROM public.users WHERE branch_id=p.branch_id AND role_id IN (2,5) AND status='active';
 RETURN proof;
END; $$;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS void_reason TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS voided_by UUID;
CREATE OR REPLACE FUNCTION public.void_fee_invoice(target INTEGER,reason TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE p payments;
BEGIN
 IF COALESCE(public.auth_user_role(),0) NOT IN(1,2) THEN RAISE EXCEPTION 'Only an administrator can void invoices' USING ERRCODE='42501'; END IF;
 SELECT * INTO p FROM payments WHERE id=target FOR UPDATE;
 IF NOT FOUND OR NOT public.can_manage_fee_branch(p.branch_id) THEN RAISE EXCEPTION 'Invoice unavailable' USING ERRCODE='42501'; END IF;
 IF NULLIF(btrim(reason),'') IS NULL OR length(reason)>500 THEN RAISE EXCEPTION 'Enter a reason of up to 500 characters'; END IF;
 IF lower(p.status)='void' THEN RETURN; END IF;
 IF COALESCE(lower(p.status),'') NOT IN('pending','overdue') OR EXISTS(SELECT 1 FROM payment_proofs WHERE payment_id=p.id AND status IN('pending','approved')) THEN RAISE EXCEPTION 'Only unpaid invoices without pending or approved proofs can be voided'; END IF;
 UPDATE payments SET status='void',void_reason=btrim(reason),voided_at=now(),voided_by=auth.uid() WHERE id=p.id;
 INSERT INTO notifications(user_id,title,message,is_read,notification_type)
 SELECT DISTINCT pr.user_id,'School fee invoice cancelled',p.invoice_no||' · '||btrim(reason),false,'payment'
 FROM parents pr JOIN student_parents l ON l.parent_id=pr.id JOIN users u ON u.id=pr.user_id
 WHERE l.student_id=p.student_id AND u.role_id=4 AND u.status='active';
END $$;
REVOKE ALL ON FUNCTION public.void_fee_invoice(INTEGER,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.void_fee_invoice(INTEGER,TEXT) TO authenticated;
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
 page AS (SELECT * FROM scoped ORDER BY due_date ASC NULLS FIRST,id LIMIT 20 OFFSET page_number*20)
 SELECT jsonb_build_object('as_of',(now() AT TIME ZONE 'Asia/Kuala_Lumpur')::DATE,'total',(SELECT count(*) FROM scoped),
 'buckets',COALESCE((SELECT jsonb_agg(to_jsonb(buckets)) FROM buckets),'[]'::JSONB),
 'rows',COALESCE((SELECT jsonb_agg(to_jsonb(page)) FROM page),'[]'::JSONB)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.fee_aging_report(INTEGER) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fee_aging_report(INTEGER) TO authenticated;
COMMIT;
