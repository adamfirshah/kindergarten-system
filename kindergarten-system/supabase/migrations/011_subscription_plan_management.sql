-- PAPA Kindergarten System — Superadmin plan configuration
-- Adds audited plan editing. Historical invoices keep their original amount;
-- updated prices are used only when future invoices are created.
-- Run after 010_subscription_module.sql.

-- Fail before making changes when this file is pasted out of order.
DO $$
BEGIN
  IF to_regclass('public.subscription_plans') IS NULL THEN
    RAISE EXCEPTION 'Missing prerequisite: public.subscription_plans does not exist'
      USING HINT = 'Run the full 010_subscription_module.sql migration successfully in this Supabase project, then run 011_subscription_plan_management.sql again.';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS subscription_plan_changes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code   TEXT NOT NULL,
  changed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  old_value   JSONB,
  new_value   JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plan_changes_plan
  ON subscription_plan_changes(plan_code, created_at DESC);

ALTER TABLE subscription_plan_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_plan_changes_select_superadmin" ON subscription_plan_changes;
CREATE POLICY "subscription_plan_changes_select_superadmin"
  ON subscription_plan_changes FOR SELECT TO authenticated
  USING (auth_user_role() = 1);

GRANT SELECT, INSERT, UPDATE ON subscription_plans TO authenticated;
GRANT SELECT ON subscription_plan_changes TO authenticated;

CREATE OR REPLACE FUNCTION save_subscription_plan(
  target_code TEXT,
  target_name TEXT,
  target_monthly_price NUMERIC,
  target_student_limit INTEGER,
  target_analytics_level TEXT,
  target_features JSONB,
  target_is_active BOOLEAN DEFAULT TRUE
)
RETURNS subscription_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalised_code TEXT;
  existing_plan subscription_plans;
  saved_plan subscription_plans;
BEGIN
  IF auth_user_role() <> 1 THEN
    RAISE EXCEPTION 'Only a superadmin can configure subscription plans';
  END IF;

  normalised_code := LOWER(REGEXP_REPLACE(TRIM(target_code), '[^a-zA-Z0-9_-]', '', 'g'));

  IF normalised_code = '' THEN
    RAISE EXCEPTION 'Plan code is required';
  END IF;

  IF NULLIF(TRIM(target_name), '') IS NULL THEN
    RAISE EXCEPTION 'Plan name is required';
  END IF;

  IF target_monthly_price IS NULL OR target_monthly_price < 0 THEN
    RAISE EXCEPTION 'Monthly price must be zero or greater';
  END IF;

  IF target_student_limit IS NOT NULL AND target_student_limit <= 0 THEN
    RAISE EXCEPTION 'Student limit must be greater than zero or null for unlimited';
  END IF;

  IF target_features IS NULL OR jsonb_typeof(target_features) <> 'array' THEN
    RAISE EXCEPTION 'Plan features must be a JSON array';
  END IF;

  SELECT * INTO existing_plan
  FROM subscription_plans
  WHERE code = normalised_code;

  INSERT INTO subscription_plans (
    code,
    name,
    monthly_price,
    student_limit,
    analytics_level,
    features,
    is_active
  ) VALUES (
    normalised_code,
    TRIM(target_name),
    target_monthly_price,
    target_student_limit,
    COALESCE(NULLIF(TRIM(target_analytics_level), ''), 'none'),
    target_features,
    target_is_active
  )
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    monthly_price = EXCLUDED.monthly_price,
    student_limit = EXCLUDED.student_limit,
    analytics_level = EXCLUDED.analytics_level,
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active
  RETURNING * INTO saved_plan;

  INSERT INTO subscription_plan_changes (
    plan_code,
    changed_by,
    old_value,
    new_value
  ) VALUES (
    normalised_code,
    auth.uid(),
    CASE WHEN existing_plan.code IS NULL THEN NULL ELSE to_jsonb(existing_plan) END,
    to_jsonb(saved_plan)
  );

  RETURN saved_plan;
END;
$$;

REVOKE ALL ON FUNCTION save_subscription_plan(TEXT, TEXT, NUMERIC, INTEGER, TEXT, JSONB, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION save_subscription_plan(TEXT, TEXT, NUMERIC, INTEGER, TEXT, JSONB, BOOLEAN) TO authenticated;
