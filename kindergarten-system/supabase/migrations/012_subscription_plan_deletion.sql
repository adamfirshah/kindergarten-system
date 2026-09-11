-- PAPA Kindergarten System — Safe subscription plan deletion
-- Only unused plans can be deleted. Plans referenced by a branch or historical
-- invoice must be deactivated instead so billing history remains intact.
-- Run after 011_subscription_plan_management.sql.

CREATE OR REPLACE FUNCTION delete_subscription_plan(target_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalised_code TEXT;
  existing_plan subscription_plans;
BEGIN
  IF auth_user_role() <> 1 THEN
    RAISE EXCEPTION 'Only a superadmin can delete subscription plans';
  END IF;

  normalised_code := LOWER(TRIM(target_code));

  SELECT * INTO existing_plan
  FROM subscription_plans
  WHERE code = normalised_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription plan not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM branches
    WHERE subscription_plan_code = normalised_code
  ) THEN
    RAISE EXCEPTION 'Plan is assigned to a branch; deactivate it instead';
  END IF;

  IF EXISTS (
    SELECT 1 FROM subscription_invoices
    WHERE plan_code = normalised_code
  ) THEN
    RAISE EXCEPTION 'Plan has historical invoices and cannot be deleted';
  END IF;

  INSERT INTO subscription_plan_changes (
    plan_code,
    changed_by,
    old_value,
    new_value
  ) VALUES (
    normalised_code,
    auth.uid(),
    to_jsonb(existing_plan),
    jsonb_build_object('deleted', TRUE, 'code', normalised_code)
  );

  DELETE FROM subscription_plans
  WHERE code = normalised_code;
END;
$$;

REVOKE ALL ON FUNCTION delete_subscription_plan(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_subscription_plan(TEXT) TO authenticated;
