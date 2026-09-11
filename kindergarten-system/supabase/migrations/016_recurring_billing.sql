-- Recurring school fees. Run after 015. Drafts are separate from parent-visible payments.
BEGIN;
CREATE TABLE public.recurring_fees (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), student_id INTEGER NOT NULL REFERENCES public.students(id),
 branch_id UUID NOT NULL REFERENCES public.branches(id), description TEXT NOT NULL CHECK(length(btrim(description)) BETWEEN 1 AND 180),
 amount NUMERIC(12,2) NOT NULL CHECK(amount>0 AND amount::TEXT<>'NaN'),
 discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(discount>=0 AND discount::TEXT<>'NaN'),
 start_month DATE NOT NULL, end_month DATE, active BOOLEAN NOT NULL DEFAULT true,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), CHECK(discount<amount),
 CHECK(extract(day FROM start_month)=1), CHECK(end_month IS NULL OR (end_month>=start_month AND extract(day FROM end_month)=1)),
 UNIQUE(student_id,description)
);
CREATE TABLE public.billing_batches (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), branch_id UUID NOT NULL REFERENCES public.branches(id), billing_month DATE NOT NULL,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','reviewed','approved','published')),
 due_date DATE NOT NULL, reviewed_by UUID, approved_by UUID, published_at TIMESTAMPTZ,
 last_error TEXT, reminded_at DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(branch_id,billing_month)
);
CREATE TABLE public.billing_drafts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), batch_id UUID NOT NULL REFERENCES public.billing_batches(id),
 branch_id UUID NOT NULL, fee_id UUID NOT NULL REFERENCES public.recurring_fees(id), student_id INTEGER NOT NULL,
 description TEXT NOT NULL, amount NUMERIC(12,2) NOT NULL CHECK(amount>0 AND amount::TEXT<>'NaN'),
 excluded BOOLEAN NOT NULL DEFAULT false, note TEXT NOT NULL DEFAULT '', payment_id INTEGER REFERENCES public.payments(id),
 UNIQUE(batch_id,fee_id)
);
ALTER TABLE public.payments ADD COLUMN recurring_draft_id UUID UNIQUE REFERENCES public.billing_drafts(id);
DO $$ DECLARE t TEXT; BEGIN
 FOREACH t IN ARRAY ARRAY['recurring_fees','billing_batches','billing_drafts'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
 EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
 EXECUTE format('CREATE POLICY staff_read ON public.%I FOR SELECT TO authenticated USING(public.can_manage_fee_branch(branch_id))',t);
 EXECUTE format('CREATE TRIGGER capture_audit_event AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.capture_audit_event()',t);
 END LOOP;
END $$;
CREATE FUNCTION public.save_recurring_fee(target UUID, student INTEGER, label TEXT, total NUMERIC, reduction NUMERIC, starts DATE, ends DATE, enabled BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE branch UUID;
BEGIN
 SELECT branch_id INTO branch FROM public.students WHERE id=student;
 IF NOT public.can_manage_fee_branch(branch) THEN RAISE EXCEPTION 'Student unavailable for your branch'; END IF;
 IF target IS NULL THEN
 INSERT INTO public.recurring_fees(student_id,branch_id,description,amount,discount,start_month,end_month,active) VALUES(student,branch,btrim(label),total,reduction,starts,ends,enabled);
 ELSE
 UPDATE public.recurring_fees SET description=btrim(label),amount=total,discount=reduction,start_month=starts,end_month=ends,active=enabled
 WHERE id=target AND student_id=student AND branch_id=branch;
 IF NOT FOUND THEN RAISE EXCEPTION 'Fee rule unavailable'; END IF;
 END IF;
END $$;
CREATE FUNCTION public.edit_billing_draft(target UUID, total NUMERIC, skip BOOLEAN, explanation TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE b public.billing_batches; d public.billing_drafts;
BEGIN
 SELECT * INTO d FROM public.billing_drafts WHERE id=target;
 SELECT * INTO b FROM public.billing_batches WHERE id=d.batch_id FOR UPDATE;
 IF NOT FOUND OR NOT public.can_manage_fee_branch(b.branch_id) OR b.status NOT IN ('draft','reviewed') THEN RAISE EXCEPTION 'Batch is not editable'; END IF;
 IF NULLIF(btrim(explanation),'') IS NULL THEN RAISE EXCEPTION 'Enter a reason for this adjustment'; END IF;
 UPDATE public.billing_drafts SET amount=total,excluded=skip,note=btrim(explanation) WHERE id=target;
 UPDATE public.billing_batches SET status='draft',reviewed_by=NULL,last_error=NULL WHERE id=b.id;
END $$;
CREATE FUNCTION public.billing_batch_problem(target UUID) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE b public.billing_batches;
BEGIN
 SELECT * INTO b FROM public.billing_batches WHERE id=target;
 IF NOT EXISTS(SELECT 1 FROM public.billing_drafts WHERE batch_id=target AND NOT excluded) THEN RETURN 'No included invoices in this batch'; END IF;
 IF EXISTS(SELECT 1 FROM public.billing_drafts d LEFT JOIN public.students s ON s.id=d.student_id
 WHERE d.batch_id=target AND NOT d.excluded AND (s.id IS NULL OR s.branch_id IS DISTINCT FROM b.branch_id OR lower(COALESCE(s.status,''))<>'active')) THEN RETURN 'A student is inactive, missing or moved to another branch. Exclude the affected draft.'; END IF;
 IF EXISTS(SELECT 1 FROM public.billing_drafts d WHERE d.batch_id=target AND NOT d.excluded AND NOT EXISTS(
 SELECT 1 FROM public.student_parents sp JOIN public.parents pr ON pr.id=sp.parent_id JOIN public.users u ON u.id=pr.user_id
 WHERE sp.student_id=d.student_id AND u.role_id=4 AND u.status='active')) THEN RETURN 'A student has no active linked parent account'; END IF;
 RETURN NULL;
END $$;
CREATE FUNCTION public.review_billing_batch(target UUID, approve BOOLEAN, deadline DATE)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE b public.billing_batches; problem TEXT;
BEGIN
 SELECT * INTO b FROM public.billing_batches WHERE id=target FOR UPDATE;
 IF NOT FOUND OR NOT public.can_manage_fee_branch(b.branch_id) THEN RAISE EXCEPTION 'Batch unavailable'; END IF;
 IF approve IS NULL OR deadline IS NULL THEN RAISE EXCEPTION 'Decision and due date are required'; END IF;
 IF b.status NOT IN ('draft','reviewed') THEN RAISE EXCEPTION 'Batch already approved or published'; END IF;
 IF approve AND (public.auth_user_role() NOT IN (1,2) OR b.status<>'reviewed') THEN RAISE EXCEPTION 'An administrator must approve a reviewed batch'; END IF;
 IF deadline<(b.billing_month+4) OR deadline<(now() AT TIME ZONE 'Asia/Kuala_Lumpur')::DATE THEN RAISE EXCEPTION 'Due date must be on or after the fifth and not in the past'; END IF;
 problem:=public.billing_batch_problem(target); IF problem IS NOT NULL THEN RAISE EXCEPTION '%',problem; END IF;
 UPDATE public.billing_batches SET status=CASE WHEN approve THEN 'approved' ELSE 'reviewed' END,
 due_date=deadline,reviewed_by=CASE WHEN approve THEN reviewed_by ELSE auth.uid() END,
 approved_by=CASE WHEN approve THEN auth.uid() END,last_error=NULL WHERE id=target;
END $$;
CREATE FUNCTION public.publish_billing_batch(target UUID, today DATE)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE b public.billing_batches; d public.billing_drafts; s public.students; p INTEGER; inv TEXT; problem TEXT; bname TEXT;
BEGIN
 SELECT * INTO b FROM public.billing_batches WHERE id=target FOR UPDATE;
 IF b.status<>'approved' OR today<(b.billing_month-INTERVAL '1 month')::DATE+26 THEN RETURN; END IF;
 problem:=public.billing_batch_problem(target);
 IF b.due_date<today THEN problem:='Due date has passed. Return this batch to review and adjust the date.'; END IF;
 IF problem IS NOT NULL THEN RAISE EXCEPTION '%',problem; END IF;
 SELECT name INTO bname FROM public.branches WHERE id=b.branch_id;
 FOR d IN SELECT * FROM public.billing_drafts WHERE batch_id=target AND NOT excluded LOOP
 SELECT * INTO s FROM public.students WHERE id=d.student_id;
 inv:='INV-'||upper(d.id::TEXT);
 INSERT INTO public.payments(student_id,branch_id,invoice_no,payment_type,amount,due_date,status,fee_student_name,fee_branch_name,fee_description,recurring_draft_id)
 VALUES(d.student_id,b.branch_id,inv,'Monthly Fee',d.amount,b.due_date,'pending',COALESCE(s.full_name,s.name),bname,to_char(b.billing_month,'Mon YYYY')||' · '||d.description,d.id)
 ON CONFLICT(recurring_draft_id) DO NOTHING RETURNING id INTO p;
 IF p IS NOT NULL THEN
 UPDATE public.billing_drafts SET payment_id=p WHERE id=d.id;
 INSERT INTO public.notifications(user_id,title,message,is_read,notification_type)
 SELECT DISTINCT u.id,'New school fee invoice',inv||' · RM '||d.amount::TEXT||' · due '||b.due_date::TEXT,false,'payment'
 FROM public.student_parents sp JOIN public.parents pr ON pr.id=sp.parent_id JOIN public.users u ON u.id=pr.user_id
 WHERE sp.student_id=d.student_id AND u.role_id=4 AND u.status='active';
 END IF;
 END LOOP;
 UPDATE public.billing_batches SET status='published',published_at=now(),last_error=NULL WHERE id=target;
END $$;
CREATE FUNCTION public.reopen_billing_batch(target UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$ BEGIN
 IF public.auth_user_role() IS DISTINCT FROM 1 AND public.auth_user_role() IS DISTINCT FROM 2 THEN RAISE EXCEPTION 'Administrator required'; END IF;
 UPDATE public.billing_batches SET status='draft',approved_by=NULL,reviewed_by=NULL,last_error=NULL WHERE id=target AND status<>'published' AND public.can_manage_fee_branch(branch_id);
 IF NOT FOUND THEN RAISE EXCEPTION 'Batch unavailable or already published'; END IF;
END $$;
CREATE FUNCTION public.run_recurring_billing(today DATE DEFAULT (now() AT TIME ZONE 'Asia/Kuala_Lumpur')::DATE)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE f RECORD; b public.billing_batches; m DATE; bid UUID; failed TEXT;
BEGIN
 PERFORM pg_advisory_xact_lock(16002527);
 -- Catch up all due months since a rule starts. Future rules remain untouched.
 FOR f IN SELECT * FROM public.recurring_fees WHERE active LOOP
 FOR m IN SELECT generate_series(f.start_month,LEAST(COALESCE(f.end_month,today+INTERVAL '1 month'),date_trunc('month',today)+INTERVAL '1 month'),INTERVAL '1 month')::DATE LOOP
 IF today<(m-INTERVAL '1 month')::DATE+24 THEN CONTINUE; END IF;
 INSERT INTO public.billing_batches(branch_id,billing_month,due_date) VALUES(f.branch_id,m,m+4) ON CONFLICT(branch_id,billing_month) DO NOTHING;
 SELECT * INTO b FROM public.billing_batches WHERE branch_id=f.branch_id AND billing_month=m FOR UPDATE;
 IF b.status<>'draft' THEN CONTINUE; END IF;
 INSERT INTO public.billing_drafts(batch_id,branch_id,fee_id,student_id,description,amount)
 VALUES(b.id,f.branch_id,f.id,f.student_id,f.description,f.amount-f.discount) ON CONFLICT(batch_id,fee_id) DO NOTHING;
 END LOOP;
 END LOOP;
 FOR b IN SELECT * FROM public.billing_batches WHERE status<>'published' LOOP
 BEGIN
 PERFORM public.publish_billing_batch(b.id,today);
 EXCEPTION WHEN OTHERS THEN
 GET STACKED DIAGNOSTICS failed=MESSAGE_TEXT;
 UPDATE public.billing_batches SET last_error=failed WHERE id=b.id;
 END;
 IF EXISTS(SELECT 1 FROM public.billing_batches WHERE id=b.id AND status<>'published' AND reminded_at IS DISTINCT FROM today) THEN
 INSERT INTO public.notifications(user_id,title,message,is_read,notification_type)
 SELECT id,'Recurring billing needs review',to_char(b.billing_month,'Mon YYYY')||' billing batch · review in Finance → Recurring Billing.',false,'payment'
 FROM public.users WHERE status='active' AND (role_id=1 OR (branch_id=b.branch_id AND role_id IN (2,5)));
 UPDATE public.billing_batches SET reminded_at=today WHERE id=b.id;
 END IF;
 END LOOP;
END $$;
CREATE FUNCTION public.publish_approved_billing(target UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE branch UUID; scheduled DATE; state TEXT;
BEGIN
 SELECT branch_id,(billing_month-INTERVAL '1 month')::DATE+26,status INTO branch,scheduled,state FROM public.billing_batches WHERE id=target;
 IF NOT public.can_manage_fee_branch(branch) OR public.auth_user_role() NOT IN (1,2) THEN RAISE EXCEPTION 'Administrator required'; END IF;
 IF state<>'approved' THEN RAISE EXCEPTION 'Only an approved batch can be published'; END IF;
 IF (now() AT TIME ZONE 'Asia/Kuala_Lumpur')::DATE<scheduled THEN RAISE EXCEPTION 'This batch can be published from %',scheduled; END IF;
 PERFORM public.publish_billing_batch(target,(now() AT TIME ZONE 'Asia/Kuala_Lumpur')::DATE);
END $$;
-- Worker/internal functions are callable only by the database scheduler/owner.
REVOKE ALL ON FUNCTION public.billing_batch_problem(UUID),public.publish_billing_batch(UUID,DATE),public.run_recurring_billing(DATE) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.save_recurring_fee(UUID,INTEGER,TEXT,NUMERIC,NUMERIC,DATE,DATE,BOOLEAN),public.edit_billing_draft(UUID,NUMERIC,BOOLEAN,TEXT),public.review_billing_batch(UUID,BOOLEAN,DATE),public.reopen_billing_batch(UUID),public.publish_approved_billing(UUID) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_recurring_fee(UUID,INTEGER,TEXT,NUMERIC,NUMERIC,DATE,DATE,BOOLEAN),public.edit_billing_draft(UUID,NUMERIC,BOOLEAN,TEXT),public.review_billing_batch(UUID,BOOLEAN,DATE),public.reopen_billing_batch(UUID),public.publish_approved_billing(UUID) TO authenticated;
COMMIT;
