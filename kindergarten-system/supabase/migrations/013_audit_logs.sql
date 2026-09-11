-- Audit trail for database changes. Run after migrations 001–012.
-- No historical backfill: events start when these triggers are installed.
BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  actor_id UUID,
  actor_name TEXT NOT NULL,
  actor_role SMALLINT,
  branch_id UUID,
  branch_name TEXT,
  module TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id TEXT,
  changed_fields TEXT[] NOT NULL DEFAULT '{}'
);
-- Deliberately no foreign keys: deleting a user/branch must preserve history.
CREATE INDEX IF NOT EXISTS audit_logs_branch_time ON public.audit_logs(branch_id, occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS audit_logs_time ON public.audit_logs(occurred_at DESC, id DESC);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
DROP POLICY IF EXISTS audit_logs_read ON public.audit_logs;
CREATE POLICY audit_logs_read ON public.audit_logs FOR SELECT TO authenticated
USING (
  public.auth_user_role() = 1
  OR (public.auth_user_role() = 2 AND branch_id = public.auth_user_branch())
);

CREATE OR REPLACE FUNCTION public.capture_audit_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE
  before_row JSONB := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) ELSE '{}'::JSONB END;
  after_row JSONB := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) ELSE '{}'::JSONB END;
  row_data JSONB;
  scope_id UUID;
  scope_name TEXT;
  actor_label TEXT;
  actor_role_id SMALLINT;
  fields TEXT[];
BEGIN
  row_data := CASE WHEN TG_OP = 'DELETE' THEN before_row ELSE after_row END;
  SELECT COALESCE(array_agg(key ORDER BY key), '{}'::TEXT[]) INTO fields
  FROM jsonb_object_keys(before_row || after_row) AS keys(key)
  WHERE key NOT IN ('updated_at', 'created_at')
    AND before_row -> key IS DISTINCT FROM after_row -> key;
  IF TG_OP = 'UPDATE' AND cardinality(fields) = 0 THEN RETURN NEW; END IF;

  IF TG_TABLE_NAME = 'branches' THEN
    scope_id := (row_data ->> 'id')::UUID;
    scope_name := row_data ->> 'name';
  ELSIF TG_TABLE_NAME = 'parents' THEN
    scope_id := (row_data ->> 'primary_branch_id')::UUID;
  ELSIF TG_TABLE_NAME IN ('attendances', 'student_classes', 'assignment_submissions') THEN
    SELECT branch_id INTO scope_id FROM public.students WHERE id::TEXT = row_data ->> 'student_id';
  ELSE
    scope_id := (row_data ->> 'branch_id')::UUID;
  END IF;

  -- Transfers are platform-only: neither branch should see the other branch's activity.
  IF TG_OP = 'UPDATE' AND (
    before_row -> 'branch_id' IS DISTINCT FROM after_row -> 'branch_id'
    OR before_row -> 'primary_branch_id' IS DISTINCT FROM after_row -> 'primary_branch_id'
    OR before_row -> 'student_id' IS DISTINCT FROM after_row -> 'student_id'
  ) THEN scope_id := NULL; scope_name := NULL; END IF;
  IF scope_id IS NOT NULL AND scope_name IS NULL THEN
    SELECT name INTO scope_name FROM public.branches WHERE id = scope_id;
  END IF;
  SELECT COALESCE(NULLIF(full_name, ''), 'User'), role_id INTO actor_label, actor_role_id
  FROM public.users WHERE id = auth.uid();

  INSERT INTO public.audit_logs(actor_id, actor_name, actor_role, branch_id, branch_name, module, action, record_id, changed_fields)
  VALUES (auth.uid(), COALESCE(actor_label, CASE WHEN auth.uid() IS NULL THEN 'System / database' ELSE 'User' END),
    actor_role_id, scope_id, scope_name, TG_TABLE_NAME, TG_OP,
    COALESCE(row_data ->> 'id', row_data ->> 'code'), fields);
  -- Values are intentionally not copied: avoid retaining passwords, contact details,
  -- student information and announcement bodies in the audit trail.
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.capture_audit_event() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'branches', 'users', 'students', 'branch_staff', 'classes', 'parents',
    'attendances', 'payments', 'expenses', 'assignments', 'assignment_submissions',
    'student_classes', 'announcements', 'subscription_plans', 'subscription_invoices'
  ] LOOP
    IF to_regclass('public.' || table_name) IS NULL THEN
      RAISE EXCEPTION 'Missing audit prerequisite: public.%', table_name
        USING HINT = 'Complete migrations 001–012 before running 013_audit_logs.sql.';
    END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS capture_audit_event ON public.%I', table_name);
    EXECUTE format('CREATE TRIGGER capture_audit_event AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.capture_audit_event()', table_name);
  END LOOP;
END;
$$;
COMMIT;
