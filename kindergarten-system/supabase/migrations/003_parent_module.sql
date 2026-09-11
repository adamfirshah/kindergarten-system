-- PAPA Kindergarten System — Parent module for the EXISTING schema
-- Extends parents (int4 PK) and student_parents (int4 FKs); no duplicate tables.
-- Run after 001_branch_management.sql and 002_academic_foundation.sql.

-- ─── Extend Existing Parent Records ──────────────────────────────────────────
ALTER TABLE parents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE parents ADD COLUMN IF NOT EXISTS primary_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE parents ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE parents ADD COLUMN IF NOT EXISTS communication_preference TEXT NOT NULL DEFAULT 'WhatsApp';
ALTER TABLE parents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE student_parents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Link a parent portal user where an existing role-4 user has the same email.
UPDATE parents parent_record
SET user_id = user_record.id
FROM users user_record
WHERE parent_record.user_id IS NULL
  AND user_record.role_id = 4
  AND LOWER(user_record.email) = LOWER(parent_record.email);

-- Infer the primary branch from the primary child, then any linked child.
UPDATE parents parent_record
SET primary_branch_id = inferred.branch_id
FROM (
  SELECT DISTINCT ON (student_parent.parent_id)
    student_parent.parent_id,
    student.branch_id
  FROM student_parents student_parent
  JOIN students student ON student.id = student_parent.student_id
  WHERE student.branch_id IS NOT NULL
  ORDER BY student_parent.parent_id, student_parent.is_primary_contact DESC, student_parent.created_at
) inferred
WHERE parent_record.id = inferred.parent_id
  AND parent_record.primary_branch_id IS NULL;

-- Keep the compatibility field on students aligned with the primary relationship.
UPDATE students student
SET parent_name = parent_record.name
FROM student_parents student_parent
JOIN parents parent_record ON parent_record.id = student_parent.parent_id
WHERE student_parent.student_id = student.id
  AND student_parent.is_primary_contact = true
  AND (student.parent_name IS NULL OR student.parent_name <> parent_record.name);

-- ─── Indexes and Updated-at Triggers ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_parents_user_id ON parents(user_id);
CREATE INDEX IF NOT EXISTS idx_parents_primary_branch ON parents(primary_branch_id);
CREATE INDEX IF NOT EXISTS idx_parents_status ON parents(status);
CREATE INDEX IF NOT EXISTS idx_student_parents_student ON student_parents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_parents_parent ON student_parents(parent_id);

DROP TRIGGER IF EXISTS parents_updated_at ON parents;
CREATE TRIGGER parents_updated_at
  BEFORE UPDATE ON parents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS student_parents_updated_at ON student_parents;
CREATE TRIGGER student_parents_updated_at
  BEFORE UPDATE ON student_parents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Row-Level Security ──────────────────────────────────────────────────────
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_parents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parents_select_by_role" ON parents;
DROP POLICY IF EXISTS "parents_manage_by_role" ON parents;
DROP POLICY IF EXISTS "student_parents_select_by_role" ON student_parents;
DROP POLICY IF EXISTS "student_parents_manage_by_role" ON student_parents;

CREATE POLICY "parents_select_by_role" ON parents FOR SELECT TO authenticated
  USING (
    auth_user_role() = 1
    OR user_id = auth.uid()
    OR (
      auth_user_role() IN (2, 3)
      AND primary_branch_id = auth_user_branch()
    )
  );

CREATE POLICY "parents_manage_by_role" ON parents FOR ALL TO authenticated
  USING (
    auth_user_role() IN (1, 2)
    AND (
      auth_user_role() = 1
      OR primary_branch_id = auth_user_branch()
    )
  )
  WITH CHECK (
    auth_user_role() IN (1, 2)
    AND (auth_user_role() = 1 OR primary_branch_id = auth_user_branch())
  );

CREATE POLICY "student_parents_select_by_role" ON student_parents FOR SELECT TO authenticated
  USING (
    auth_user_role() = 1
    OR EXISTS (
      SELECT 1
      FROM students student
      WHERE student.id = student_parents.student_id
        AND auth_user_role() IN (2, 3)
        AND student.branch_id = auth_user_branch()
    )
    OR EXISTS (
      SELECT 1
      FROM parents parent_record
      WHERE parent_record.id = student_parents.parent_id
        AND parent_record.user_id = auth.uid()
    )
  );

CREATE POLICY "student_parents_manage_by_role" ON student_parents FOR ALL TO authenticated
  USING (
    auth_user_role() IN (1, 2)
    AND EXISTS (
      SELECT 1
      FROM students student
      WHERE student.id = student_parents.student_id
        AND (auth_user_role() = 1 OR student.branch_id = auth_user_branch())
    )
  )
  WITH CHECK (
    auth_user_role() IN (1, 2)
    AND EXISTS (
      SELECT 1
      FROM students student
      WHERE student.id = student_parents.student_id
        AND (auth_user_role() = 1 OR student.branch_id = auth_user_branch())
    )
  );

-- Parents update only safe contact fields through this function. Identity,
-- branch, status and child relationships remain school-managed.
CREATE OR REPLACE FUNCTION update_own_parent_profile(
  new_phone TEXT,
  new_email TEXT,
  new_address TEXT,
  new_occupation TEXT,
  new_communication_preference TEXT
)
RETURNS parents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_parent parents;
BEGIN
  IF new_communication_preference NOT IN ('WhatsApp', 'Email', 'SMS') THEN
    RAISE EXCEPTION 'Unsupported communication preference';
  END IF;

  UPDATE parents
  SET
    phone = new_phone,
    email = new_email,
    address = new_address,
    occupation = new_occupation,
    communication_preference = new_communication_preference
  WHERE user_id = auth.uid()
  RETURNING * INTO updated_parent;

  IF updated_parent.id IS NULL THEN
    RAISE EXCEPTION 'No parent profile is linked to the authenticated user';
  END IF;

  RETURN updated_parent;
END;
$$;

REVOKE ALL ON FUNCTION update_own_parent_profile(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_own_parent_profile(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
