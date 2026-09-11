-- PAPA Kindergarten System — Branch Management Schema
-- Safe to re-run on existing Supabase projects (adds missing columns/policies)
-- Run in: Supabase Dashboard → SQL Editor → New query

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Roles ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id    SMALLINT PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

-- Add label column if your roles table was created without it
ALTER TABLE roles ADD COLUMN IF NOT EXISTS label TEXT;

INSERT INTO roles (id, name, label) VALUES
  (1, 'super_admin',  'Super Admin'),
  (2, 'branch_admin', 'Branch Admin'),
  (3, 'teacher',      'Teacher'),
  (4, 'parent',       'Parent'),
  (5, 'finance',      'Finance')
ON CONFLICT (id) DO UPDATE SET
  name  = EXCLUDED.name,
  label = EXCLUDED.label;

-- ─── Branches ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE branches ADD COLUMN IF NOT EXISTS name         TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS address      TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS phone        TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS capacity     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS status       TEXT NOT NULL DEFAULT 'active';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS subscription TEXT NOT NULL DEFAULT 'Standard';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE branches ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ NOT NULL DEFAULT now();

-- ─── Users (extends existing auth.users profile table) ────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id    SMALLINT NOT NULL REFERENCES roles(id)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id  UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email      TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status     TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ─── Students ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE students ADD COLUMN IF NOT EXISTS branch_id      UUID REFERENCES branches(id) ON DELETE CASCADE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS name           TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS full_name      TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_name     TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS age            SMALLINT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_name    TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS status         TEXT NOT NULL DEFAULT 'active';
ALTER TABLE students ADD COLUMN IF NOT EXISTS created_at     TIMESTAMPTZ NOT NULL DEFAULT now();

-- Sync legacy `name` column with full_name for existing rows
UPDATE students SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;
UPDATE students SET name = full_name WHERE name IS NULL AND full_name IS NOT NULL;

-- ─── Branch Staff ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branch_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE branch_staff ADD COLUMN IF NOT EXISTS branch_id  UUID REFERENCES branches(id) ON DELETE CASCADE;
ALTER TABLE branch_staff ADD COLUMN IF NOT EXISTS user_id    UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE branch_staff ADD COLUMN IF NOT EXISTS name       TEXT;
ALTER TABLE branch_staff ADD COLUMN IF NOT EXISTS full_name  TEXT;
ALTER TABLE branch_staff ADD COLUMN IF NOT EXISTS staff_role TEXT;
ALTER TABLE branch_staff ADD COLUMN IF NOT EXISTS email      TEXT;
ALTER TABLE branch_staff ADD COLUMN IF NOT EXISTS phone      TEXT;
ALTER TABLE branch_staff ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE branch_staff SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;
UPDATE branch_staff SET name = full_name WHERE name IS NULL AND full_name IS NOT NULL;

-- ─── Login History ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE login_history ADD COLUMN IF NOT EXISTS user_id      UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS logged_in_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS ip_address   TEXT;
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS device_info  TEXT;

-- ─── Branch Stats View ────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW branch_stats AS
SELECT
  b.id,
  b.name,
  b.address,
  b.phone,
  b.capacity,
  b.status,
  b.subscription,
  COALESCE(s.student_count, 0) AS students,
  COALESCE(st.staff_count, 0)  AS staff
FROM branches b
LEFT JOIN (
  SELECT branch_id, COUNT(*) AS student_count
  FROM students GROUP BY branch_id
) s ON s.branch_id = b.id
LEFT JOIN (
  SELECT branch_id, COUNT(*) AS staff_count
  FROM branch_staff GROUP BY branch_id
) st ON st.branch_id = b.id;

-- ─── Updated_at Trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS branches_updated_at ON branches;
CREATE TRIGGER branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Seed Data (matches frontend mock) ────────────────────────────────────────
INSERT INTO branches (id, name, address, phone, capacity, status, subscription) VALUES
  ('11111111-1111-1111-1111-111111111001', 'KL HQ',     'Jalan Ampang, Kuala Lumpur',     '+60 3-1234 5678', 250, 'active',   'Premium'),
  ('11111111-1111-1111-1111-111111111002', 'Shah Alam', 'Seksyen 7, Shah Alam, Selangor', '+60 3-8765 4321', 200, 'active',   'Standard'),
  ('11111111-1111-1111-1111-111111111003', 'Penang',    'Georgetown, Pulau Pinang',       '+60 4-1111 2222', 150, 'inactive', 'Basic')
ON CONFLICT (id) DO UPDATE SET
  name         = EXCLUDED.name,
  address      = EXCLUDED.address,
  phone        = EXCLUDED.phone,
  capacity     = EXCLUDED.capacity,
  status       = EXCLUDED.status,
  subscription = EXCLUDED.subscription;

INSERT INTO students (branch_id, name, full_name, class_name, age, parent_name, status) VALUES
  ('11111111-1111-1111-1111-111111111001', 'Ahmad Zaki',     'Ahmad Zaki',     'Kindergarten A', 5, 'Zainal Abidin',  'active'),
  ('11111111-1111-1111-1111-111111111001', 'Siti Aisyah',    'Siti Aisyah',    'Kindergarten A', 5, 'Fatimah Zahra',  'active'),
  ('11111111-1111-1111-1111-111111111001', 'Muhammad Hafiz', 'Muhammad Hafiz', 'Kindergarten B', 6, 'Roslan Ibrahim', 'active'),
  ('11111111-1111-1111-1111-111111111001', 'Nurul Iman',     'Nurul Iman',     'Kindergarten B', 6, 'Aminah Yusof',   'active'),
  ('11111111-1111-1111-1111-111111111001', 'Daniel Lim',     'Daniel Lim',     'Kindergarten C', 5, 'Lim Wei Ming',   'active'),
  ('11111111-1111-1111-1111-111111111001', 'Priya Devi',     'Priya Devi',     'Kindergarten C', 5, 'Raj Kumar',      'active'),
  ('11111111-1111-1111-1111-111111111002', 'Adam Hakim',     'Adam Hakim',     'Kindergarten A', 5, 'Hakim Rahman',   'active'),
  ('11111111-1111-1111-1111-111111111002', 'Emily Tan',      'Emily Tan',      'Kindergarten A', 6, 'Tan Mei Ling',   'active'),
  ('11111111-1111-1111-1111-111111111002', 'Arif Danish',    'Arif Danish',    'Kindergarten B', 5, 'Danish Ali',     'active'),
  ('11111111-1111-1111-1111-111111111002', 'Chloe Wong',     'Chloe Wong',     'Kindergarten B', 6, 'Wong Siew Leng', 'active'),
  ('11111111-1111-1111-1111-111111111003', 'Haziq Imran',    'Haziq Imran',    'Kindergarten A', 5, 'Imran Hassan',   'active'),
  ('11111111-1111-1111-1111-111111111003', 'Sophia Lee',     'Sophia Lee',     'Kindergarten A', 5, 'Lee Jia Hui',    'active'),
  ('11111111-1111-1111-1111-111111111003', 'Farhan Azmi',    'Farhan Azmi',    'Kindergarten B', 6, 'Azmi Rahman',    'active');

INSERT INTO branch_staff (branch_id, name, full_name, staff_role, email, phone) VALUES
  ('11111111-1111-1111-1111-111111111001', 'Dr. Nor Azlina', 'Dr. Nor Azlina', 'branch_admin', 'azlina@papa.edu.my',     '+60 12-345 6789'),
  ('11111111-1111-1111-1111-111111111001', 'Encik Kamal',    'Encik Kamal',    'branch_admin', 'kamal@papa.edu.my',      '+60 12-345 6790'),
  ('11111111-1111-1111-1111-111111111001', 'Cik Farah',      'Cik Farah',      'teacher',      'farah@papa.edu.my',      '+60 12-345 6791'),
  ('11111111-1111-1111-1111-111111111001', 'Mr. Raj',        'Mr. Raj',        'teacher',      'raj@papa.edu.my',        '+60 12-345 6792'),
  ('11111111-1111-1111-1111-111111111001', 'Pn. Siti',       'Pn. Siti',       'teacher',      'siti@papa.edu.my',       '+60 12-345 6793'),
  ('11111111-1111-1111-1111-111111111001', 'Ahmad Finance',  'Ahmad Finance',  'finance',      'finance.kl@papa.edu.my', '+60 12-345 6794'),
  ('11111111-1111-1111-1111-111111111002', 'Pn. Rashidah',   'Pn. Rashidah',   'branch_admin', 'rashidah@papa.edu.my',   '+60 13-111 2222'),
  ('11111111-1111-1111-1111-111111111002', 'Cik Mira',       'Cik Mira',       'teacher',      'mira@papa.edu.my',       '+60 13-111 2223'),
  ('11111111-1111-1111-1111-111111111002', 'Mr. Kevin',      'Mr. Kevin',      'teacher',      'kevin@papa.edu.my',      '+60 13-111 2224'),
  ('11111111-1111-1111-1111-111111111002', 'Nurul Finance',  'Nurul Finance',  'finance',      'finance.sa@papa.edu.my', '+60 13-111 2225'),
  ('11111111-1111-1111-1111-111111111003', 'Encik Hafiz',    'Encik Hafiz',    'branch_admin', 'hafiz@papa.edu.my',      '+60 14-555 6666'),
  ('11111111-1111-1111-1111-111111111003', 'Cik Lina',       'Cik Lina',       'teacher',      'lina@papa.edu.my',       '+60 14-555 6667'),
  ('11111111-1111-1111-1111-111111111003', 'David Finance',  'David Finance',  'finance',      'finance.pg@papa.edu.my', '+60 14-555 6668');

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE branches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE students      ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_staff  ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS SMALLINT AS $$
  SELECT role_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_user_branch()
RETURNS UUID AS $$
  SELECT branch_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "branches_select"  ON branches;
DROP POLICY IF EXISTS "branches_insert"  ON branches;
DROP POLICY IF EXISTS "branches_update"  ON branches;
DROP POLICY IF EXISTS "branches_delete"  ON branches;
DROP POLICY IF EXISTS "students_select"  ON students;
DROP POLICY IF EXISTS "students_write"   ON students;
DROP POLICY IF EXISTS "staff_select"     ON branch_staff;
DROP POLICY IF EXISTS "staff_write"      ON branch_staff;
DROP POLICY IF EXISTS "users_select"     ON users;
DROP POLICY IF EXISTS "users_write"      ON users;
DROP POLICY IF EXISTS "login_history_select" ON login_history;

CREATE POLICY "branches_select" ON branches FOR SELECT TO authenticated
  USING (auth_user_role() = 1 OR id = auth_user_branch());

CREATE POLICY "branches_insert" ON branches FOR INSERT TO authenticated
  WITH CHECK (auth_user_role() = 1);

CREATE POLICY "branches_update" ON branches FOR UPDATE TO authenticated
  USING (auth_user_role() = 1 OR (auth_user_role() = 2 AND id = auth_user_branch()));

CREATE POLICY "branches_delete" ON branches FOR DELETE TO authenticated
  USING (auth_user_role() = 1);

CREATE POLICY "students_select" ON students FOR SELECT TO authenticated
  USING (auth_user_role() = 1 OR branch_id = auth_user_branch());

CREATE POLICY "students_write" ON students FOR ALL TO authenticated
  USING (auth_user_role() IN (1, 2) AND (auth_user_role() = 1 OR branch_id = auth_user_branch()));

CREATE POLICY "staff_select" ON branch_staff FOR SELECT TO authenticated
  USING (auth_user_role() = 1 OR branch_id = auth_user_branch());

CREATE POLICY "staff_write" ON branch_staff FOR ALL TO authenticated
  USING (auth_user_role() IN (1, 2) AND (auth_user_role() = 1 OR branch_id = auth_user_branch()));

CREATE POLICY "users_select" ON users FOR SELECT TO authenticated
  USING (
    auth_user_role() IN (1, 2)
    AND (auth_user_role() = 1 OR branch_id = auth_user_branch() OR id = auth.uid())
  );

CREATE POLICY "users_write" ON users FOR ALL TO authenticated
  USING (auth_user_role() IN (1, 2));

CREATE POLICY "login_history_select" ON login_history FOR SELECT TO authenticated
  USING (
    auth_user_role() = 1
    OR user_id = auth.uid()
    OR (
      auth_user_role() = 2
      AND user_id IN (SELECT id FROM users WHERE branch_id = auth_user_branch())
    )
  );

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_role_id   ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_students_branch ON students(branch_id);
CREATE INDEX IF NOT EXISTS idx_staff_branch    ON branch_staff(branch_id);
CREATE INDEX IF NOT EXISTS idx_login_user      ON login_history(user_id);
