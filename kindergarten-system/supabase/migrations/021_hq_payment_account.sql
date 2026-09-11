-- One HQ collection account for all school fee invoices. Apply after 020.
BEGIN;
CREATE TABLE IF NOT EXISTS public.hq_payment_account (
 id BOOLEAN PRIMARY KEY DEFAULT true CHECK(id),
 bank_name TEXT NOT NULL CHECK(length(btrim(bank_name)) BETWEEN 1 AND 100),
 account_name TEXT NOT NULL CHECK(length(btrim(account_name)) BETWEEN 1 AND 160),
 account_number TEXT NOT NULL CHECK(account_number ~ '^[0-9 -]{5,40}$' AND length(regexp_replace(account_number,'[^0-9]','','g'))>=5),
 version INTEGER NOT NULL DEFAULT 1,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hq_payment_account ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hq_payment_account FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.hq_payment_account TO authenticated;
DROP POLICY IF EXISTS hq_account_read ON public.hq_payment_account;
CREATE POLICY hq_account_read ON public.hq_payment_account FOR SELECT TO authenticated USING(public.auth_user_role() IN(1,2,4,5));
CREATE OR REPLACE FUNCTION public.save_hq_payment_account(bank TEXT,holder TEXT,number TEXT,expected_version INTEGER)
RETURNS public.hq_payment_account LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE current_version INTEGER; saved public.hq_payment_account;
BEGIN
 PERFORM pg_advisory_xact_lock(210021);
 IF public.auth_user_role() IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'Only superadmin can configure the HQ account' USING ERRCODE='42501'; END IF;
 SELECT version INTO current_version FROM hq_payment_account WHERE id=true FOR UPDATE;
 IF expected_version IS DISTINCT FROM COALESCE(current_version,0) THEN RAISE EXCEPTION 'Bank details changed. Refresh before saving again'; END IF;
 INSERT INTO hq_payment_account(id,bank_name,account_name,account_number) VALUES(true,btrim(bank),btrim(holder),btrim(number))
 ON CONFLICT(id) DO UPDATE SET bank_name=EXCLUDED.bank_name,account_name=EXCLUDED.account_name,account_number=EXCLUDED.account_number,version=hq_payment_account.version+1,updated_at=now() RETURNING * INTO saved;
 RETURN saved;
END $$;
REVOKE ALL ON FUNCTION public.save_hq_payment_account(TEXT,TEXT,TEXT,INTEGER) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_hq_payment_account(TEXT,TEXT,TEXT,INTEGER) TO authenticated;
-- Keep legacy account records for history, but retire the browser-facing endpoint.
REVOKE ALL ON FUNCTION public.save_branch_payment_account(UUID,TEXT,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.branch_payment_accounts FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS capture_audit_event ON public.hq_payment_account;
CREATE TRIGGER capture_audit_event AFTER INSERT OR UPDATE ON public.hq_payment_account FOR EACH ROW EXECUTE FUNCTION public.capture_audit_event();
-- No automatic copy: the authorised HQ account must be explicitly configured.
COMMIT;
