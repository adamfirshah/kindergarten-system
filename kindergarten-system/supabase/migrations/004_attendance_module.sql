-- PAPA Kindergarten System — Attendance module for the EXISTING schema
-- Extends attendances (int4 PK, int4 student/class FKs); no duplicate table.
-- Run after 001_branch_management.sql, 002_academic_foundation.sql and
-- 003_parent_module.sql. Safe to rerun after a partial failure.

-- ─── Repair Parent Account Link After a Partial 003 Run ─────────────────────
-- Attendance parent policies require this link. Keep the guard here because
-- some existing projects have the original parents table but only part of 003.
ALTER TABLE parents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_parents_user_id ON parents(user_id);

-- Connect an existing parent record to its role-4 portal user where possible.
UPDATE parents parent_record
SET user_id = user_record.id
FROM users user_record
WHERE parent_record.user_id IS NULL
  AND user_record.role_id = 4
  AND parent_record.email IS NOT NULL
  AND user_record.email IS NOT NULL
  AND LOWER(parent_record.email) = LOWER(user_record.email);

-- ─── Extend Existing Attendance Records ─────────────────────────────────────
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_in TIME;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_out TIME;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS absence_reason TEXT;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS absence_reported_at TIMESTAMPTZ;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS absence_reported_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- ─── Indexes and Updated-at Trigger ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendances_student_date
  ON attendances(student_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendances_class_date
  ON attendances(class_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendances_status
  ON attendances(status);

DROP TRIGGER IF EXISTS attendances_updated_at ON attendances;
CREATE TRIGGER attendances_updated_at
  BEFORE UPDATE ON attendances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Row-Level Security ──────────────────────────────────────────────────────
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_select_by_role" ON attendances;
DROP POLICY IF EXISTS "attendance_insert_by_staff" ON attendances;
DROP POLICY IF EXISTS "attendance_update_by_staff" ON attendances;
DROP POLICY IF EXISTS "attendance_delete_by_admin" ON attendances;

-- Superadmin: all records.
-- Branch admin / teacher: records for students in their branch.
-- Parent: records belonging to a child linked through student_parents.
CREATE POLICY "attendance_select_by_role" ON attendances FOR SELECT TO authenticated
  USING (
    auth_user_role() = 1
    OR EXISTS (
      SELECT 1
      FROM students student
      WHERE student.id = attendances.student_id
        AND auth_user_role() IN (2, 3)
        AND student.branch_id = auth_user_branch()
    )
    OR EXISTS (
      SELECT 1
      FROM student_parents student_parent
      JOIN parents parent_record ON parent_record.id = student_parent.parent_id
      WHERE student_parent.student_id = attendances.student_id
        AND auth_user_role() = 4
        AND parent_record.user_id = auth.uid()
    )
  );

CREATE POLICY "attendance_insert_by_staff" ON attendances FOR INSERT TO authenticated
  WITH CHECK (
    auth_user_role() IN (1, 2, 3)
    AND EXISTS (
      SELECT 1
      FROM students student
      WHERE student.id = attendances.student_id
        AND (auth_user_role() = 1 OR student.branch_id = auth_user_branch())
    )
    AND EXISTS (
      SELECT 1
      FROM student_classes student_class
      WHERE student_class.student_id = attendances.student_id
        AND student_class.class_id = attendances.class_id
        AND (student_class.start_date IS NULL OR student_class.start_date <= attendances.attendance_date)
        AND (student_class.end_date IS NULL OR student_class.end_date >= attendances.attendance_date)
    )
  );

CREATE POLICY "attendance_update_by_staff" ON attendances FOR UPDATE TO authenticated
  USING (
    auth_user_role() IN (1, 2, 3)
    AND EXISTS (
      SELECT 1
      FROM students student
      WHERE student.id = attendances.student_id
        AND (auth_user_role() = 1 OR student.branch_id = auth_user_branch())
    )
  )
  WITH CHECK (
    auth_user_role() IN (1, 2, 3)
    AND EXISTS (
      SELECT 1
      FROM students student
      WHERE student.id = attendances.student_id
        AND (auth_user_role() = 1 OR student.branch_id = auth_user_branch())
    )
  );

-- Only the platform superadmin can permanently delete an attendance record.
-- Branch corrections should be updates so the audit trail can be retained.
CREATE POLICY "attendance_delete_by_admin" ON attendances FOR DELETE TO authenticated
  USING (auth_user_role() = 1);

-- Parents submit a reason through a narrow function. They cannot change date,
-- class, status, time or the student attached to an attendance record.
CREATE OR REPLACE FUNCTION submit_own_absence_reason(
  target_attendance_id INTEGER,
  submitted_reason TEXT
)
RETURNS attendances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_attendance attendances;
BEGIN
  IF submitted_reason IS NULL OR char_length(trim(submitted_reason)) < 3 THEN
    RAISE EXCEPTION 'Absence reason must contain at least 3 characters';
  END IF;

  IF char_length(submitted_reason) > 500 THEN
    RAISE EXCEPTION 'Absence reason cannot exceed 500 characters';
  END IF;

  UPDATE attendances attendance_record
  SET
    absence_reason = trim(submitted_reason),
    absence_reported_at = now(),
    absence_reported_by = auth.uid()
  WHERE attendance_record.id = target_attendance_id
    AND LOWER(attendance_record.status) IN ('absent', 'excused')
    AND EXISTS (
      SELECT 1
      FROM student_parents student_parent
      JOIN parents parent_record ON parent_record.id = student_parent.parent_id
      WHERE student_parent.student_id = attendance_record.student_id
        AND parent_record.user_id = auth.uid()
    )
  RETURNING attendance_record.* INTO updated_attendance;

  IF updated_attendance.id IS NULL THEN
    RAISE EXCEPTION 'Attendance record is not available for this parent account';
  END IF;

  RETURN updated_attendance;
END;
$$;

REVOKE ALL ON FUNCTION submit_own_absence_reason(INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submit_own_absence_reason(INTEGER, TEXT) TO authenticated;
