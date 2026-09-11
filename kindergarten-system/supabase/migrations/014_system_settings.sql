-- Superadmin platform configuration. Run after 013_audit_logs.sql.
BEGIN;
CREATE TABLE IF NOT EXISTS public.system_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  platform_name TEXT NOT NULL DEFAULT 'PAPA' CHECK (length(btrim(platform_name)) BETWEEN 1 AND 80),
  organisation_name TEXT NOT NULL DEFAULT '' CHECK (length(organisation_name) <= 160),
  support_email TEXT NOT NULL DEFAULT '' CHECK (support_email = '' OR support_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  support_phone TEXT NOT NULL DEFAULT '' CHECK (length(support_phone) <= 40),
  notice_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  notice_message TEXT NOT NULL DEFAULT '' CHECK (length(notice_message) <= 500),
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  CHECK (NOT notice_enabled OR length(btrim(notice_message)) > 0)
);
INSERT INTO public.system_settings(id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.system_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.system_settings TO authenticated;
DROP POLICY IF EXISTS system_settings_superadmin_read ON public.system_settings;
CREATE POLICY system_settings_superadmin_read ON public.system_settings FOR SELECT TO authenticated
USING (public.auth_user_role() = 1);

CREATE OR REPLACE FUNCTION public.save_system_settings(settings JSONB, expected_version INTEGER)
RETURNS public.system_settings LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE saved public.system_settings;
BEGIN
  IF public.auth_user_role() IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'Only a superadmin can change system settings' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(settings) IS DISTINCT FROM 'object'
    OR NOT (settings ?& ARRAY['platform_name','organisation_name','support_email','support_phone','notice_enabled','notice_message'])
    OR (settings - ARRAY['platform_name','organisation_name','support_email','support_phone','notice_enabled','notice_message']) <> '{}'::JSONB
    OR jsonb_typeof(settings->'notice_enabled') IS DISTINCT FROM 'boolean'
    OR EXISTS (SELECT 1 FROM jsonb_each(settings) WHERE key <> 'notice_enabled' AND jsonb_typeof(value) <> 'string')
  THEN RAISE EXCEPTION 'Invalid settings payload' USING ERRCODE = '22023'; END IF;
  UPDATE public.system_settings SET
    platform_name = btrim(settings->>'platform_name'),
    organisation_name = btrim(settings->>'organisation_name'),
    support_email = btrim(settings->>'support_email'),
    support_phone = btrim(settings->>'support_phone'),
    notice_enabled = (settings->>'notice_enabled')::BOOLEAN,
    notice_message = btrim(settings->>'notice_message'),
    version = version + 1,
    updated_at = now(), updated_by = auth.uid()
  WHERE id = 1 AND version = expected_version RETURNING * INTO saved;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Settings changed since you opened this page. Reload the latest settings before saving.' USING ERRCODE = '40001';
  END IF;
  RETURN saved;
END;
$$;
REVOKE ALL ON FUNCTION public.save_system_settings(JSONB, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_system_settings(JSONB, INTEGER) TO authenticated;

-- Expose only display/support fields to signed-in platform users.
-- The settings table and its change metadata remain superadmin-only.
CREATE OR REPLACE FUNCTION public.get_platform_display_settings()
RETURNS TABLE(platform_name TEXT, organisation_name TEXT, support_email TEXT, support_phone TEXT, notice_enabled BOOLEAN, notice_message TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
  SELECT platform_name, organisation_name, support_email, support_phone, notice_enabled,
    CASE WHEN notice_enabled THEN notice_message ELSE '' END
  FROM public.system_settings WHERE id = 1 AND public.auth_user_role() IN (1,2,3,4,5);
$$;
REVOKE ALL ON FUNCTION public.get_platform_display_settings() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_display_settings() TO authenticated;
DROP TRIGGER IF EXISTS capture_audit_event ON public.system_settings;
CREATE TRIGGER capture_audit_event AFTER UPDATE ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION public.capture_audit_event();
COMMIT;
