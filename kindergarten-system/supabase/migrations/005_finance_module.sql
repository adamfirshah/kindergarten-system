-- PAPA Kindergarten System — Finance module for the EXISTING schema
-- Extends payments and expenses (both use int4 primary keys); no duplicate
-- transaction tables are created. Run after 004_attendance_module.sql.

-- ─── Extend Existing Payments ───────────────────────────────────────────────
ALTER TABLE payments ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_no TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- A payment belongs to the same branch as its student.
UPDATE payments payment_record
SET branch_id = student.branch_id
FROM students student
WHERE student.id = payment_record.student_id
  AND payment_record.branch_id IS NULL;

UPDATE payments
SET invoice_no = 'PAY-' || LPAD(id::TEXT, 6, '0')
WHERE invoice_no IS NULL;

-- ─── Extend Existing Expenses ───────────────────────────────────────────────
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Existing historical expenses are treated as approved; new records default
-- to pending so entry and approval remain separate responsibilities.
UPDATE expenses SET status = 'approved' WHERE status IS NULL;
ALTER TABLE expenses ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE expenses ALTER COLUMN status SET NOT NULL;

-- Infer the branch from the staff member who originally entered the expense.
UPDATE expenses expense_record
SET branch_id = user_record.branch_id
FROM users user_record
WHERE user_record.id = expense_record.created_by
  AND expense_record.branch_id IS NULL;

-- ─── Indexes and Updated-at Triggers ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payments_branch ON payments(branch_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_due ON payments(student_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_no ON payments(invoice_no);
CREATE INDEX IF NOT EXISTS idx_expenses_branch_date ON expenses(branch_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);

DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS expenses_updated_at ON expenses;
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Row-Level Security: Payments ───────────────────────────────────────────
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select_by_role" ON payments;
DROP POLICY IF EXISTS "payments_insert_by_finance" ON payments;
DROP POLICY IF EXISTS "payments_update_by_finance" ON payments;
DROP POLICY IF EXISTS "payments_delete_by_superadmin" ON payments;

CREATE POLICY "payments_select_by_role" ON payments FOR SELECT TO authenticated
  USING (
    auth_user_role() = 1
    OR (auth_user_role() IN (2, 5) AND branch_id = auth_user_branch())
    OR (
      auth_user_role() = 4
      AND EXISTS (
        SELECT 1
        FROM student_parents student_parent
        JOIN parents parent_record ON parent_record.id = student_parent.parent_id
        WHERE student_parent.student_id = payments.student_id
          AND parent_record.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "payments_insert_by_finance" ON payments FOR INSERT TO authenticated
  WITH CHECK (
    auth_user_role() IN (1, 2, 5)
    AND (auth_user_role() = 1 OR branch_id = auth_user_branch())
    AND EXISTS (
      SELECT 1 FROM students student
      WHERE student.id = payments.student_id
        AND student.branch_id = payments.branch_id
    )
  );

CREATE POLICY "payments_update_by_finance" ON payments FOR UPDATE TO authenticated
  USING (
    auth_user_role() IN (1, 2, 5)
    AND (auth_user_role() = 1 OR branch_id = auth_user_branch())
  )
  WITH CHECK (
    auth_user_role() IN (1, 2, 5)
    AND (auth_user_role() = 1 OR branch_id = auth_user_branch())
  );

CREATE POLICY "payments_delete_by_superadmin" ON payments FOR DELETE TO authenticated
  USING (auth_user_role() = 1);

-- ─── Row-Level Security: Expenses ───────────────────────────────────────────
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_select_by_role" ON expenses;
DROP POLICY IF EXISTS "expenses_insert_by_finance" ON expenses;
DROP POLICY IF EXISTS "expenses_update_by_finance" ON expenses;
DROP POLICY IF EXISTS "expenses_delete_by_superadmin" ON expenses;

CREATE POLICY "expenses_select_by_role" ON expenses FOR SELECT TO authenticated
  USING (
    auth_user_role() = 1
    OR (auth_user_role() IN (2, 5) AND branch_id = auth_user_branch())
  );

CREATE POLICY "expenses_insert_by_finance" ON expenses FOR INSERT TO authenticated
  WITH CHECK (
    auth_user_role() IN (1, 2, 5)
    AND (auth_user_role() = 1 OR branch_id = auth_user_branch())
    AND status = 'pending'
  );

CREATE POLICY "expenses_update_by_finance" ON expenses FOR UPDATE TO authenticated
  USING (
    auth_user_role() IN (1, 2, 5)
    AND (auth_user_role() = 1 OR branch_id = auth_user_branch())
    AND (auth_user_role() IN (1, 2) OR status = 'pending')
  )
  WITH CHECK (
    auth_user_role() IN (1, 2, 5)
    AND (auth_user_role() = 1 OR branch_id = auth_user_branch())
    AND (auth_user_role() IN (1, 2) OR status = 'pending')
  );

CREATE POLICY "expenses_delete_by_superadmin" ON expenses FOR DELETE TO authenticated
  USING (auth_user_role() = 1);

-- Only a superadmin or the matching branch admin can approve/reject expenses.
CREATE OR REPLACE FUNCTION review_expense(
  target_expense_id INTEGER,
  review_status TEXT
)
RETURNS expenses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_expense expenses;
BEGIN
  IF auth_user_role() NOT IN (1, 2) THEN
    RAISE EXCEPTION 'Only an administrator can review expenses';
  END IF;

  IF review_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Review status must be approved or rejected';
  END IF;

  UPDATE expenses expense_record
  SET
    status = review_status,
    approved_by = auth.uid(),
    approved_at = now()
  WHERE expense_record.id = target_expense_id
    AND (
      auth_user_role() = 1
      OR expense_record.branch_id = auth_user_branch()
    )
  RETURNING expense_record.* INTO updated_expense;

  IF updated_expense.id IS NULL THEN
    RAISE EXCEPTION 'Expense record is not available for this administrator';
  END IF;

  RETURN updated_expense;
END;
$$;

REVOKE ALL ON FUNCTION review_expense(INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION review_expense(INTEGER, TEXT) TO authenticated;
