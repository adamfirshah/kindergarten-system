// Run with: node supabase/tests/audit_logs.mjs /absolute/path/to/@electric-sql/pglite/dist/index.js
// Isolated PostgreSQL fixture; never connects to a live Supabase database.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
const branchA = '00000000-0000-0000-0000-000000000001'
const branchB = '00000000-0000-0000-0000-000000000002'
const superId = '10000000-0000-0000-0000-000000000001'
const adminId = '10000000-0000-0000-0000-000000000002'
const teacherId = '10000000-0000-0000-0000-000000000003'
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.user_id', true), '')::UUID $$;
CREATE TABLE public.branches(id UUID PRIMARY KEY, name TEXT);
CREATE TABLE public.users(id UUID PRIMARY KEY, full_name TEXT, role_id SMALLINT, branch_id UUID);
CREATE TABLE public.students(id INTEGER PRIMARY KEY, branch_id UUID, name TEXT, updated_at TIMESTAMPTZ);
CREATE FUNCTION public.auth_user_role() RETURNS SMALLINT LANGUAGE sql SECURITY DEFINER STABLE AS $$ SELECT role_id FROM public.users WHERE id = auth.uid() $$;
CREATE FUNCTION public.auth_user_branch() RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$ SELECT branch_id FROM public.users WHERE id = auth.uid() $$;
INSERT INTO branches VALUES ('${branchA}', 'A'), ('${branchB}', 'B');
INSERT INTO users VALUES ('${superId}', 'Superadmin', 1, NULL), ('${adminId}', 'Admin A', 2, '${branchA}'), ('${teacherId}', 'Teacher A', 3, '${branchA}');
`)
for (const name of ['branch_staff', 'classes', 'parents', 'attendances', 'payments', 'expenses', 'assignments', 'assignment_submissions', 'student_classes', 'announcements', 'subscription_plans', 'subscription_invoices']) {
  await db.exec(`CREATE TABLE public.${name}(id INTEGER PRIMARY KEY, branch_id UUID, primary_branch_id UUID, student_id INTEGER, code TEXT);`)
}
const migration = await readFile(new URL('../migrations/013_audit_logs.sql', import.meta.url), 'utf8')
await db.exec(migration)
await db.exec(migration) // Repeat installation must not duplicate triggers/events.
await db.exec(`SET test.user_id = '${superId}';
INSERT INTO students VALUES (1, '${branchA}', 'Student A', now()), (2, '${branchB}', 'Student B', now());
INSERT INTO subscription_plans(id,code) VALUES (1, 'premium');
UPDATE students SET name = 'Changed' WHERE id = 1;
UPDATE students SET updated_at = now() WHERE id = 1;
INSERT INTO attendances(id,student_id) VALUES (1, 1);
UPDATE students SET branch_id = '${branchB}' WHERE id = 1;
DELETE FROM students WHERE id = 2;`)
const events = (await db.query('SELECT * FROM audit_logs')).rows
assert.equal(events.length, 7)
assert.deepEqual(events.find((event) => event.action === 'UPDATE' && event.branch_id === branchA).changed_fields, ['name'])
assert.equal(events.find((event) => event.module === 'attendances').branch_id, branchA)
assert.equal(events.find((event) => event.changed_fields.includes('branch_id') && event.action === 'UPDATE').branch_id, null)
assert.ok(events.every((event) => event.actor_id === superId))
assert.ok(!JSON.stringify(events).includes('Student A'))
async function visibleAs(id) {
  await db.exec(`SET ROLE authenticated; SET test.user_id = '${id}';`)
  return (await db.query('SELECT * FROM public.audit_logs')).rows
}
assert.equal((await visibleAs(superId)).length, 7)
const adminEvents = await visibleAs(adminId)
assert.equal(adminEvents.length, 3)
assert.ok(adminEvents.every((event) => event.branch_id === branchA))
assert.equal((await db.query(`SELECT * FROM audit_logs WHERE branch_id = '${branchB}'`)).rows.length, 0)
for (const sql of ["INSERT INTO audit_logs(actor_name,module,action) VALUES ('Forged','users','DELETE')", 'UPDATE audit_logs SET actor_name = \'Forged\'', 'DELETE FROM audit_logs', 'TRUNCATE audit_logs']) {
  await assert.rejects(db.exec(sql), /permission denied/)
}
assert.equal((await visibleAs(teacherId)).length, 0)
assert.equal((await visibleAs('')).length, 0)
await db.exec('SET ROLE anon')
await assert.rejects(db.query('SELECT * FROM audit_logs'), /permission denied/)
await db.exec('RESET ROLE; DELETE FROM branches;')
assert.ok((await db.query('SELECT count(*)::INTEGER AS total FROM audit_logs')).rows[0].total >= 7)
await db.close()
console.log('PASS: trigger capture, rerun, no-op updates, transfer scope, RLS isolation, write protection and history retention.')
