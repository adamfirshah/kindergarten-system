-- Invoice-based school fees and verified bank transfers. Run after 014.
BEGIN;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS fee_student_name TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS fee_branch_name TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS fee_description TEXT;
CREATE TABLE IF NOT EXISTS public.branch_payment_accounts (
 branch_id UUID PRIMARY KEY REFERENCES public.branches(id),
 bank_name TEXT NOT NULL CHECK(length(btrim(bank_name)) BETWEEN 1 AND 100),
 account_name TEXT NOT NULL CHECK(length(btrim(account_name)) BETWEEN 1 AND 160),
 account_number TEXT NOT NULL CHECK(account_number ~ '^[0-9 -]{5,40}$'),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.payment_proofs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), payment_id INTEGER NOT NULL REFERENCES public.payments(id),
 branch_id UUID NOT NULL, submitted_by UUID NOT NULL, storage_path TEXT NOT NULL UNIQUE,
 reference TEXT NOT NULL CHECK(length(btrim(reference)) BETWEEN 1 AND 120),
 amount NUMERIC(12,2) NOT NULL CHECK(amount > 0), submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 reviewed_by UUID, reviewed_at TIMESTAMPTZ, rejection_reason TEXT,
 receipt_no TEXT UNIQUE, receipt_snapshot JSONB
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_proofs_one_pending ON public.payment_proofs(payment_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS payment_proofs_payment ON public.payment_proofs(payment_id, submitted_at DESC);
CREATE OR REPLACE FUNCTION public.can_read_fee(target INTEGER) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
 SELECT EXISTS(SELECT 1 FROM public.payments p WHERE p.id = target AND (
 public.auth_user_role() = 1 OR (public.auth_user_role() IN (2,5) AND p.branch_id = public.auth_user_branch())
 OR (public.auth_user_role() = 4 AND EXISTS(SELECT 1 FROM public.student_parents sp JOIN public.parents pr ON pr.id=sp.parent_id WHERE sp.student_id=p.student_id AND pr.user_id=auth.uid()))));
$$;
CREATE OR REPLACE FUNCTION public.can_manage_fee_branch(target UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
 SELECT COALESCE(public.auth_user_role()=1 OR (public.auth_user_role() IN (2,5) AND target=public.auth_user_branch()),FALSE);
$$;
REVOKE ALL ON FUNCTION public.can_read_fee(INTEGER), public.can_manage_fee_branch(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_fee(INTEGER), public.can_manage_fee_branch(UUID) TO authenticated;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_payment_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_proofs, public.branch_payment_accounts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.payment_proofs, public.branch_payment_accounts TO authenticated;
DROP POLICY IF EXISTS proof_read ON public.payment_proofs;
CREATE POLICY proof_read ON public.payment_proofs FOR SELECT TO authenticated USING(public.can_read_fee(payment_id));
DROP POLICY IF EXISTS bank_read ON public.branch_payment_accounts;
CREATE POLICY bank_read ON public.branch_payment_accounts FOR SELECT TO authenticated USING(
 public.can_manage_fee_branch(branch_id) OR EXISTS(SELECT 1 FROM public.payments p WHERE p.branch_id=branch_payment_accounts.branch_id AND public.can_read_fee(p.id)));
-- Fee state is only changed through validated server functions, not browser updates.
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM authenticated;
GRANT SELECT ON public.payments TO authenticated;

CREATE OR REPLACE FUNCTION public.save_branch_payment_account(target UUID, bank TEXT, holder TEXT, number TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
 IF public.auth_user_role() IS DISTINCT FROM 1 AND NOT COALESCE(public.auth_user_role()=2 AND target=public.auth_user_branch(),false) THEN RAISE EXCEPTION 'Only a branch administrator can configure this account'; END IF;
 INSERT INTO public.branch_payment_accounts(branch_id,bank_name,account_name,account_number) VALUES(target,btrim(bank),btrim(holder),btrim(number))
 ON CONFLICT(branch_id) DO UPDATE SET bank_name=EXCLUDED.bank_name,account_name=EXCLUDED.account_name,account_number=EXCLUDED.account_number,updated_at=now();
END; $$;

CREATE OR REPLACE FUNCTION public.create_fee_invoice(student INTEGER, description TEXT, total NUMERIC, due DATE)
RETURNS public.payments LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE s public.students; bname TEXT; saved public.payments;
BEGIN
 SELECT * INTO s FROM public.students WHERE id=student;
 IF NOT FOUND OR NOT public.can_manage_fee_branch(s.branch_id) THEN RAISE EXCEPTION 'Student is not available for this branch'; END IF;
 IF total IS NULL OR total::TEXT IN ('NaN','Infinity','-Infinity') OR total>9999999999.99 OR total<=0 OR total<>round(total,2) OR due IS NULL OR NULLIF(btrim(description),'') IS NULL OR length(description)>240 THEN RAISE EXCEPTION 'Enter a description, positive amount with at most two decimal places and due date'; END IF;
 SELECT name INTO bname FROM public.branches WHERE id=s.branch_id;
 INSERT INTO public.payments(student_id,branch_id,invoice_no,payment_type,amount,due_date,status,fee_student_name,fee_branch_name,fee_description)
 VALUES(student,s.branch_id,'INV-'||upper(gen_random_uuid()::TEXT),'Monthly Fee',total,due,'pending',COALESCE(s.full_name,s.name),bname,btrim(description)) RETURNING * INTO saved;
 INSERT INTO public.notifications(user_id,title,message,is_read,notification_type)
 SELECT DISTINCT pr.user_id,'New school fee invoice',saved.invoice_no||' · RM '||total::TEXT||' · due '||due::TEXT,false,'payment'
 FROM public.parents pr JOIN public.student_parents sp ON sp.parent_id=pr.id JOIN public.users u ON u.id=pr.user_id
 WHERE sp.student_id=student AND u.role_id=4 AND u.status='active';
 RETURN saved;
END; $$;

CREATE OR REPLACE FUNCTION public.submit_payment_proof(target INTEGER, path TEXT, transfer_reference TEXT)
RETURNS public.payment_proofs LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE p public.payments; proof public.payment_proofs;
BEGIN
 IF public.auth_user_role() IS DISTINCT FROM 4 OR NOT public.can_read_fee(target) THEN RAISE EXCEPTION 'Only a linked parent can submit proof'; END IF;
 SELECT * INTO p FROM public.payments WHERE id=target FOR UPDATE;
 IF COALESCE(lower(p.status),'') NOT IN ('pending','overdue') THEN RAISE EXCEPTION 'This invoice is not available for full payment'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.branch_payment_accounts WHERE branch_id=p.branch_id) THEN RAISE EXCEPTION 'Branch bank details are not configured'; END IF;
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

CREATE OR REPLACE FUNCTION public.review_payment_proof(target UUID, approve BOOLEAN, reason TEXT DEFAULT '')
RETURNS public.payment_proofs LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE proof public.payment_proofs; p public.payments;
BEGIN
 -- Always lock invoice first, matching the submission lock order.
 SELECT payment_id INTO p.id FROM public.payment_proofs WHERE id=target;
 SELECT * INTO p FROM public.payments WHERE id=p.id FOR UPDATE;
 IF NOT FOUND OR NOT public.can_manage_fee_branch(p.branch_id) THEN RAISE EXCEPTION 'Payment is not available for this branch'; END IF;
 SELECT * INTO proof FROM public.payment_proofs WHERE id=target FOR UPDATE;
 IF proof.submitted_by=auth.uid() THEN RAISE EXCEPTION 'You cannot review your own proof'; END IF;
 IF proof.status<>'pending' THEN RAISE EXCEPTION 'This proof has already been reviewed'; END IF;
 IF approve IS NULL OR (NOT approve AND (NULLIF(btrim(reason),'') IS NULL OR length(reason)>500)) THEN RAISE EXCEPTION 'Provide a rejection reason of up to 500 characters'; END IF;
 IF approve AND (COALESCE(lower(p.status),'') NOT IN ('pending','overdue') OR proof.amount<>p.amount) THEN RAISE EXCEPTION 'Invoice status or amount changed; review it before approving'; END IF;
 IF approve THEN
 UPDATE public.payments SET status='paid',payment_date=CURRENT_DATE,payment_method='Bank transfer',verified_by=auth.uid(),verified_at=now() WHERE id=p.id;
 END IF;
 UPDATE public.payment_proofs SET status=CASE WHEN approve THEN 'approved' ELSE 'rejected' END,
 reviewed_by=auth.uid(),reviewed_at=now(),rejection_reason=CASE WHEN NOT approve THEN btrim(reason) END,
 receipt_no=CASE WHEN approve THEN 'RCP-'||upper(id::TEXT) END,
 receipt_snapshot=CASE WHEN approve THEN jsonb_build_object('invoice',p.invoice_no,'student',p.fee_student_name,'branch',p.fee_branch_name,'description',p.fee_description,'amount',proof.amount,'reference',proof.reference,'paid_at',now()) END
 WHERE id=target RETURNING * INTO proof;
 INSERT INTO public.notifications(user_id,title,message,is_read,notification_type)
 VALUES(proof.submitted_by,CASE WHEN approve THEN 'Payment confirmed' ELSE 'Payment proof rejected' END,
 p.invoice_no||CASE WHEN approve THEN ' · Your receipt is available in Payments.' ELSE ' · '||btrim(reason) END,false,'payment');
 IF approve THEN
 INSERT INTO public.notifications(user_id,title,message,is_read,notification_type)
 SELECT id,'School fee payment confirmed',p.invoice_no||' · RM '||proof.amount::TEXT,false,'payment' FROM public.users
 WHERE branch_id=p.branch_id AND role_id IN (2,5) AND status='active' AND id<>auth.uid();
 END IF;
 RETURN proof;
END; $$;
REVOKE ALL ON FUNCTION public.save_branch_payment_account(UUID,TEXT,TEXT,TEXT), public.create_fee_invoice(INTEGER,TEXT,NUMERIC,DATE), public.submit_payment_proof(INTEGER,TEXT,TEXT), public.review_payment_proof(UUID,BOOLEAN,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_branch_payment_account(UUID,TEXT,TEXT,TEXT), public.create_fee_invoice(INTEGER,TEXT,NUMERIC,DATE), public.submit_payment_proof(INTEGER,TEXT,TEXT), public.review_payment_proof(UUID,BOOLEAN,TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.fee_payment_summary() RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
 SELECT jsonb_build_object(
 'unpaid',COALESCE(sum(amount) FILTER(WHERE lower(status) IN ('pending','overdue')),0),
 'paid',count(*) FILTER(WHERE lower(status)='paid'),
 'partial',count(*) FILTER(WHERE lower(status)='partial'),
 'awaiting',(SELECT count(*) FROM public.payment_proofs f WHERE f.status='pending' AND public.can_read_fee(f.payment_id)))
 FROM public.payments WHERE public.can_read_fee(id);
$$;
REVOKE ALL ON FUNCTION public.fee_payment_summary() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fee_payment_summary() TO authenticated;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('payment-proofs','payment-proofs',false,5242880,ARRAY['image/jpeg','image/png','application/pdf'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=5242880,allowed_mime_types=EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS fee_proof_upload ON storage.objects;
CREATE POLICY fee_proof_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(
 bucket_id='payment-proofs' AND public.auth_user_role()=4 AND split_part(name,'/',1)=auth.uid()::TEXT
 AND EXISTS(SELECT 1 FROM public.payments p WHERE p.id::TEXT=split_part(name,'/',2) AND public.can_read_fee(p.id) AND lower(p.status) IN ('pending','overdue')));
DROP POLICY IF EXISTS fee_proof_read ON storage.objects;
CREATE POLICY fee_proof_read ON storage.objects FOR SELECT TO authenticated USING(
 bucket_id='payment-proofs' AND EXISTS(SELECT 1 FROM public.payment_proofs p WHERE p.storage_path=name AND public.can_read_fee(p.payment_id)));
-- Restrictive guards also protect this bucket when older broad storage policies exist.
DROP POLICY IF EXISTS fee_proof_read_guard ON storage.objects;
CREATE POLICY fee_proof_read_guard ON storage.objects AS RESTRICTIVE FOR SELECT TO PUBLIC USING(
 bucket_id<>'payment-proofs' OR EXISTS(SELECT 1 FROM public.payment_proofs p WHERE p.storage_path=name AND public.can_read_fee(p.payment_id)));
DROP POLICY IF EXISTS fee_proof_upload_guard ON storage.objects;
CREATE POLICY fee_proof_upload_guard ON storage.objects AS RESTRICTIVE FOR INSERT TO PUBLIC WITH CHECK(
 bucket_id<>'payment-proofs' OR (public.auth_user_role()=4 AND split_part(name,'/',1)=auth.uid()::TEXT
 AND EXISTS(SELECT 1 FROM public.payments p WHERE p.id::TEXT=split_part(name,'/',2) AND public.can_read_fee(p.id) AND lower(p.status) IN ('pending','overdue'))));
DROP POLICY IF EXISTS fee_proof_update_guard ON storage.objects;
CREATE POLICY fee_proof_update_guard ON storage.objects AS RESTRICTIVE FOR UPDATE TO PUBLIC USING(bucket_id<>'payment-proofs') WITH CHECK(bucket_id<>'payment-proofs');
DROP POLICY IF EXISTS fee_proof_delete_guard ON storage.objects;
CREATE POLICY fee_proof_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE TO PUBLIC USING(bucket_id<>'payment-proofs');
-- No update/delete policy: a submitted proof cannot be silently replaced.
DROP TRIGGER IF EXISTS capture_audit_event ON public.payment_proofs;
CREATE TRIGGER capture_audit_event AFTER INSERT OR UPDATE ON public.payment_proofs FOR EACH ROW EXECUTE FUNCTION public.capture_audit_event();
DROP TRIGGER IF EXISTS capture_audit_event ON public.branch_payment_accounts;
CREATE TRIGGER capture_audit_event AFTER INSERT OR UPDATE ON public.branch_payment_accounts FOR EACH ROW EXECUTE FUNCTION public.capture_audit_event();
COMMIT;
