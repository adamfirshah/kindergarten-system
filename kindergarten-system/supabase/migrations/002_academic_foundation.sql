-- PAPA Kindergarten System — Academic foundation for the EXISTING schema
-- Existing relationships are preserved:
--   students.id (int4) -> student_classes.student_id (int4)
--   classes.id  (int4) -> student_classes.class_id   (int4)
-- Run after 001_branch_management.sql. Safe to rerun after a partial failure.

-- ─── Academic Years ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academic_years (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  year       SMALLINT NOT NULL UNIQUE,
  starts_on  DATE NOT NULL,
  ends_on    DATE NOT NULL,
  status     TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on)
);

-- A previous partial run may have created academic_years without `year`.
ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS year SMALLINT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_year_number
  ON academic_years(year);

-- ─── Academic Terms ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academic_terms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  starts_on        DATE NOT NULL,
  ends_on          DATE NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (academic_year_id, name),
  CHECK (ends_on >= starts_on)
);

-- ─── Extend Existing Classes (classes.id remains int4) ───────────────────────
ALTER TABLE classes ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS room TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 20;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Infer a class branch from its existing enrolled students. Classes with no
-- students remain unassigned and can be assigned later by an administrator.
UPDATE classes class_record
SET branch_id = inferred.branch_id
FROM (
  SELECT DISTINCT ON (student_class.class_id)
    student_class.class_id,
    student.branch_id
  FROM student_classes student_class
  JOIN students student ON student.id = student_class.student_id
  WHERE student.branch_id IS NOT NULL
  ORDER BY student_class.class_id, student_class.created_at NULLS LAST
) inferred
WHERE class_record.id = inferred.class_id
  AND class_record.branch_id IS NULL;

-- ─── Extend Existing Student/Class Junction ──────────────────────────────────
-- student_classes already is the enrolment history table; do not duplicate it.
ALTER TABLE student_classes ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id) ON DELETE RESTRICT;
ALTER TABLE student_classes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE student_classes ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE student_classes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ─── Seed Years Already Used by Existing Enrolments ──────────────────────────
-- Repair rows created by the earlier partial migration before `year` existed.
UPDATE academic_years
SET year = LEFT(name, 4)::SMALLINT
WHERE year IS NULL
  AND name ~ '^[0-9]{4} Academic Year$';

INSERT INTO academic_years (name, year, starts_on, ends_on, status)
SELECT
  source_year.year::TEXT || ' Academic Year',
  source_year.year,
  make_date(source_year.year::INTEGER, 1, 1),
  make_date(source_year.year::INTEGER, 12, 31),
  CASE
    WHEN source_year.year < 2026 THEN 'closed'
    WHEN source_year.year = 2026 THEN 'active'
    ELSE 'draft'
  END
FROM (
  SELECT DISTINCT year
  FROM student_classes
  WHERE year BETWEEN 2000 AND 2100
  UNION
  SELECT 2026::SMALLINT
) source_year
ON CONFLICT (year) DO UPDATE SET
  name = EXCLUDED.name,
  starts_on = EXCLUDED.starts_on,
  ends_on = EXCLUDED.ends_on,
  status = EXCLUDED.status;

-- Keep the richer UUID relation while retaining the original SMALLINT year for
-- compatibility with existing reports and application code.
UPDATE student_classes student_class
SET academic_year_id = academic_year.id
FROM academic_years academic_year
WHERE academic_year.year = student_class.year
  AND student_class.academic_year_id IS NULL;

UPDATE student_classes
SET status = CASE
  WHEN end_date IS NULL OR end_date >= CURRENT_DATE THEN 'active'
  ELSE 'completed'
END
WHERE status IS NULL OR status = 'active';

-- Seed standard terms for the active 2026 academic year.
INSERT INTO academic_terms (academic_year_id, name, starts_on, ends_on)
SELECT year_record.id, term.name, term.starts_on, term.ends_on
FROM academic_years year_record
CROSS JOIN (
  VALUES
    ('Term 1', DATE '2026-01-05', DATE '2026-04-03'),
    ('Term 2', DATE '2026-04-20', DATE '2026-08-07'),
    ('Term 3', DATE '2026-08-24', DATE '2026-11-27')
) AS term(name, starts_on, ends_on)
WHERE year_record.year = 2026
ON CONFLICT (academic_year_id, name) DO UPDATE SET
  starts_on = EXCLUDED.starts_on,
  ends_on = EXCLUDED.ends_on;

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_terms_year ON academic_terms(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_classes_branch ON classes(branch_id);
CREATE INDEX IF NOT EXISTS idx_student_classes_student ON student_classes(student_id);
CREATE INDEX IF NOT EXISTS idx_student_classes_class ON student_classes(class_id);
CREATE INDEX IF NOT EXISTS idx_student_classes_year ON student_classes(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_student_classes_status ON student_classes(status);

-- Use a non-unique lookup index: existing data may legitimately contain class
-- transfers within the same year, represented by different date ranges.
CREATE INDEX IF NOT EXISTS idx_student_class_history
  ON student_classes(student_id, academic_year_id, start_date, end_date);

-- ─── Updated-at Triggers ─────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS academic_years_updated_at ON academic_years;
CREATE TRIGGER academic_years_updated_at
  BEFORE UPDATE ON academic_years
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS academic_terms_updated_at ON academic_terms;
CREATE TRIGGER academic_terms_updated_at
  BEFORE UPDATE ON academic_terms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS classes_academic_updated_at ON classes;
CREATE TRIGGER classes_academic_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS student_classes_updated_at ON student_classes;
CREATE TRIGGER student_classes_updated_at
  BEFORE UPDATE ON student_classes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Row-Level Security ──────────────────────────────────────────────────────
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "academic_years_select" ON academic_years;
DROP POLICY IF EXISTS "academic_years_write" ON academic_years;
DROP POLICY IF EXISTS "academic_terms_select" ON academic_terms;
DROP POLICY IF EXISTS "academic_terms_write" ON academic_terms;
DROP POLICY IF EXISTS "classes_select" ON classes;
DROP POLICY IF EXISTS "classes_write" ON classes;
DROP POLICY IF EXISTS "student_classes_select" ON student_classes;
DROP POLICY IF EXISTS "student_classes_write" ON student_classes;

CREATE POLICY "academic_years_select" ON academic_years FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "academic_years_write" ON academic_years FOR ALL TO authenticated
  USING (auth_user_role() = 1)
  WITH CHECK (auth_user_role() = 1);

CREATE POLICY "academic_terms_select" ON academic_terms FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "academic_terms_write" ON academic_terms FOR ALL TO authenticated
  USING (auth_user_role() = 1)
  WITH CHECK (auth_user_role() = 1);

CREATE POLICY "classes_select" ON classes FOR SELECT TO authenticated
  USING (
    auth_user_role() = 1
    OR branch_id = auth_user_branch()
    OR EXISTS (
      SELECT 1
      FROM student_classes student_class
      JOIN students student ON student.id = student_class.student_id
      WHERE student_class.class_id = classes.id
        AND student.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "classes_write" ON classes FOR ALL TO authenticated
  USING (
    auth_user_role() IN (1, 2)
    AND (auth_user_role() = 1 OR branch_id = auth_user_branch())
  )
  WITH CHECK (
    auth_user_role() IN (1, 2)
    AND (auth_user_role() = 1 OR branch_id = auth_user_branch())
  );

CREATE POLICY "student_classes_select" ON student_classes FOR SELECT TO authenticated
  USING (
    auth_user_role() = 1
    OR EXISTS (
      SELECT 1
      FROM students student
      WHERE student.id = student_classes.student_id
        AND (
          (auth_user_role() IN (2, 3, 5) AND student.branch_id = auth_user_branch())
          OR (auth_user_role() = 4 AND student.parent_user_id = auth.uid())
        )
    )
  );

CREATE POLICY "student_classes_write" ON student_classes FOR ALL TO authenticated
  USING (
    auth_user_role() IN (1, 2)
    AND EXISTS (
      SELECT 1
      FROM students student
      WHERE student.id = student_classes.student_id
        AND (auth_user_role() = 1 OR student.branch_id = auth_user_branch())
    )
  )
  WITH CHECK (
    auth_user_role() IN (1, 2)
    AND EXISTS (
      SELECT 1
      FROM students student
      WHERE student.id = student_classes.student_id
        AND (auth_user_role() = 1 OR student.branch_id = auth_user_branch())
    )
  );

-- Tighten the earlier broad student policy so parents only see their own child.
DROP POLICY IF EXISTS "students_select" ON students;
CREATE POLICY "students_select" ON students FOR SELECT TO authenticated
  USING (
    auth_user_role() = 1
    OR (auth_user_role() IN (2, 3, 5) AND branch_id = auth_user_branch())
    OR (auth_user_role() = 4 AND parent_user_id = auth.uid())
  );
