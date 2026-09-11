-- PAPA Kindergarten System — Platform subscription module
-- Reuses branches.subscription as the legacy display name and links each
-- branch to a normalised plan. Student fee payments remain in Finance.
-- Run after 009_ai_analytics.sql.

CREATE TABLE IF NOT EXISTS subscription_plans (
  code             TEXT PRIMARY KEY,
  name             TEXT NOT NULL UNIQUE,
  monthly_price    NUMERIC(12,2) NOT NULL CHECK (monthly_price >= 0),
  student_limit    INTEGER CHECK (student_limit IS NULL OR student_limit > 0),
  analytics_level  TEXT NOT NULL DEFAULT 'none',
  features         JSONB NOT NULL DEFAULT '[]'::JSONB,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO subscription_plans (
  code, name, monthly_price, student_limit, analytics_level, features
) VALUES
  ('basic', 'Basic', 400, 100, 'none', '["Up to 100 students", "Core modules only"]'::JSONB),
  ('standard', 'Standard', 800, 200, 'reports', '["Up to 200 students", "Reports", "Email support"]'::JSONB),
  ('premium', 'Premium', 1200, NULL, 'full', '["Unlimited students", "Full AI analytics", "Multi-branch sync"]'::JSONB)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_price = EXCLUDED.monthly_price,
  student_limit = EXCLUDED.student_limit,
  analytics_level = EXCLUDED.analytics_level,
  features = EXCLUDED.features;

ALTER TABLE branches ADD COLUMN IF NOT EXISTS subscription_plan_code TEXT REFERENCES subscription_plans(code) ON DELETE SET NULL;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS subscription_status TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS subscription_started_at DATE;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS subscription_renews_at DATE;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS subscription_ends_at DATE;

UPDATE branches branch
SET subscription_plan_code = plan.code
FROM subscription_plans plan
WHERE branch.subscription_plan_code IS NULL
  AND (
    LOWER(branch.subscription) = LOWER(plan.name)
    OR LOWER(branch.subscription) = LOWER(plan.code)
  );

UPDATE branches
SET
  subscription_plan_code = COALESCE(subscription_plan_code, 'standard'),
  subscription_status = COALESCE(subscription_status, 'active'),
  subscription_started_at = COALESCE(subscription_started_at, created_at::DATE, CURRENT_DATE),
  subscription_renews_at = COALESCE(subscription_renews_at, (CURRENT_DATE + INTERVAL '1 month')::DATE)
WHERE subscription_plan_code IS NULL
   OR subscription_status IS NULL
   OR subscription_started_at IS NULL
   OR subscription_renews_at IS NULL;

ALTER TABLE branches ALTER COLUMN subscription_plan_code SET DEFAULT 'standard';
ALTER TABLE branches ALTER COLUMN subscription_plan_code SET NOT NULL;
ALTER TABLE branches ALTER COLUMN subscription_status SET DEFAULT 'active';
ALTER TABLE branches ALTER COLUMN subscription_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'branches_subscription_status_check'
      AND conrelid = 'branches'::regclass
  ) THEN
    ALTER TABLE branches
      ADD CONSTRAINT branches_subscription_status_check
      CHECK (subscription_status IN ('active', 'past_due', 'cancelled'));
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS subscription_invoices (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id          UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  plan_code          TEXT NOT NULL REFERENCES subscription_plans(code),
  invoice_no         TEXT NOT NULL UNIQUE,
  billing_start      DATE NOT NULL,
  billing_end        DATE NOT NULL,
  amount             NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  due_date           DATE NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'void')),
  paid_at            TIMESTAMPTZ,
  external_reference TEXT,
  created_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (billing_end >= billing_start)
);

CREATE INDEX IF NOT EXISTS idx_subscription_invoices_branch
  ON subscription_invoices(branch_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_status
  ON subscription_invoices(status);
CREATE INDEX IF NOT EXISTS idx_branches_subscription_plan
  ON branches(subscription_plan_code, subscription_status);

DROP TRIGGER IF EXISTS subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS subscription_invoices_updated_at ON subscription_invoices;
CREATE TRIGGER subscription_invoices_updated_at
  BEFORE UPDATE ON subscription_invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_plans_select_admin" ON subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_manage_superadmin" ON subscription_plans;
DROP POLICY IF EXISTS "subscription_invoices_select_admin" ON subscription_invoices;
DROP POLICY IF EXISTS "subscription_invoices_insert_superadmin" ON subscription_invoices;
DROP POLICY IF EXISTS "subscription_invoices_update_superadmin" ON subscription_invoices;
DROP POLICY IF EXISTS "subscription_invoices_delete_superadmin" ON subscription_invoices;

CREATE POLICY "subscription_plans_select_admin"
  ON subscription_plans FOR SELECT TO authenticated
  USING (auth_user_role() IN (1, 2));

CREATE POLICY "subscription_plans_manage_superadmin"
  ON subscription_plans FOR ALL TO authenticated
  USING (auth_user_role() = 1)
  WITH CHECK (auth_user_role() = 1);

CREATE POLICY "subscription_invoices_select_admin"
  ON subscription_invoices FOR SELECT TO authenticated
  USING (
    auth_user_role() = 1
    OR (auth_user_role() = 2 AND branch_id = auth_user_branch())
  );

CREATE POLICY "subscription_invoices_insert_superadmin"
  ON subscription_invoices FOR INSERT TO authenticated
  WITH CHECK (auth_user_role() = 1);

CREATE POLICY "subscription_invoices_update_superadmin"
  ON subscription_invoices FOR UPDATE TO authenticated
  USING (auth_user_role() = 1)
  WITH CHECK (auth_user_role() = 1);

CREATE POLICY "subscription_invoices_delete_superadmin"
  ON subscription_invoices FOR DELETE TO authenticated
  USING (auth_user_role() = 1);

CREATE OR REPLACE FUNCTION assign_branch_subscription(
  target_branch_id UUID,
  target_plan_code TEXT,
  target_status TEXT DEFAULT 'active',
  target_renews_at DATE DEFAULT NULL
)
RETURNS branches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_plan subscription_plans;
  updated_branch branches;
BEGIN
  IF auth_user_role() <> 1 THEN
    RAISE EXCEPTION 'Only a superadmin can assign a branch subscription';
  END IF;

  IF target_status NOT IN ('active', 'past_due', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid subscription status';
  END IF;

  SELECT * INTO selected_plan
  FROM subscription_plans
  WHERE code = LOWER(target_plan_code)
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription plan not found or inactive';
  END IF;

  UPDATE branches
  SET
    subscription = selected_plan.name,
    subscription_plan_code = selected_plan.code,
    subscription_status = target_status,
    subscription_started_at = COALESCE(subscription_started_at, CURRENT_DATE),
    subscription_renews_at = COALESCE(target_renews_at, (CURRENT_DATE + INTERVAL '1 month')::DATE),
    subscription_ends_at = CASE WHEN target_status = 'cancelled' THEN CURRENT_DATE ELSE NULL END
  WHERE id = target_branch_id
  RETURNING * INTO updated_branch;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Branch not found';
  END IF;

  RETURN updated_branch;
END;
$$;

CREATE OR REPLACE FUNCTION mark_subscription_invoice_paid(
  target_invoice_id UUID,
  payment_reference TEXT DEFAULT NULL
)
RETURNS subscription_invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_invoice subscription_invoices;
BEGIN
  IF auth_user_role() <> 1 THEN
    RAISE EXCEPTION 'Only a superadmin can record subscription payment';
  END IF;

  UPDATE subscription_invoices
  SET
    status = 'paid',
    paid_at = now(),
    external_reference = COALESCE(payment_reference, external_reference)
  WHERE id = target_invoice_id
  RETURNING * INTO updated_invoice;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription invoice not found';
  END IF;

  RETURN updated_invoice;
END;
$$;

REVOKE ALL ON FUNCTION assign_branch_subscription(UUID, TEXT, TEXT, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION mark_subscription_invoice_paid(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION assign_branch_subscription(UUID, TEXT, TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_subscription_invoice_paid(UUID, TEXT) TO authenticated;

GRANT SELECT ON subscription_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON subscription_invoices TO authenticated;
