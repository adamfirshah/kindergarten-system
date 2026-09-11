// Isolated PostgreSQL test: node supabase/tests/system_settings.mjs /path/to/@electric-sql/pglite/dist/index.js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
const superId = '10000000-0000-0000-0000-000000000001'
const adminId = '10000000-0000-0000-0000-000000000002'
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.user_id', true), '')::UUID $$;
CREATE TABLE public.branches(id UUID PRIMARY KEY, name TEXT);
CREATE TABLE public.users(id UUID PRIMARY KEY, full_name TEXT, role_id SMALLINT, branch_id UUID);
CREATE FUNCTION public.auth_user_role() RETURNS SMALLINT LANGUAGE sql SECURITY DEFINER STABLE AS $$ SELECT role_id FROM public.users WHERE id = auth.uid() $$;
CREATE FUNCTION public.auth_user_branch() RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$ SELECT branch_id FROM public.users WHERE id = auth.uid() $$;
INSERT INTO users VALUES ('${superId}', 'Superadmin', 1, NULL), ('${adminId}', 'Admin', 2, NULL);
`)
for (const name of ['students', 'branch_staff', 'classes', 'parents', 'attendances', 'payments', 'expenses', 'assignments', 'assignment_submissions', 'student_classes', 'announcements', 'subscription_plans', 'subscription_invoices']) {
  await db.exec(`CREATE TABLE public.${name}(id INTEGER PRIMARY KEY, branch_id UUID);`)
}
await db.exec(await readFile(new URL('../migrations/013_audit_logs.sql', import.meta.url), 'utf8'))
const migration = await readFile(new URL('../migrations/014_system_settings.sql', import.meta.url), 'utf8')
await db.exec(migration)
await db.exec(`SET ROLE authenticated; SET test.user_id = '${superId}';`)
assert.equal((await db.query('SELECT * FROM system_settings')).rows.length, 1)
const payload = { platform_name: 'New Platform', organisation_name: 'School Group', support_email: 'support@example.com', support_phone: '+60 1234', notice_enabled: true, notice_message: 'Scheduled maintenance tonight' }
async function save(data, version) { return db.query('SELECT * FROM save_system_settings($1::JSONB, $2)', [JSON.stringify(data), version]) }
let saved = (await save(payload, 1)).rows[0]
assert.equal(saved.version, 2)
assert.equal(saved.updated_by, superId)
assert.equal((await db.query("SELECT * FROM audit_logs WHERE module = 'system_settings'")).rows.length, 1)
await assert.rejects(save(payload, 1), /Settings changed/)
await assert.rejects(save({ ...payload, platform_name: '   ' }, 2), /check constraint/)
await assert.rejects(save({ ...payload, notice_message: '' }, 2), /check constraint/)
await assert.rejects(save({ ...payload, support_email: 'bad' }, 2), /check constraint/)
await assert.rejects(save({ ...payload, version: 900 }, 2), /Invalid settings/)
await assert.rejects(save({ ...payload, notice_enabled: 'true' }, 2), /Invalid settings/)
await assert.rejects(save({ ...payload, platform_name: null }, 2), /Invalid settings/)
await assert.rejects(db.exec("UPDATE system_settings SET platform_name = 'Bypass'"), /permission denied/)
await db.exec(`SET test.user_id = '${adminId}';`)
assert.equal((await db.query('SELECT * FROM system_settings')).rows.length, 0)
await assert.rejects(save(payload, 2), /Only a superadmin/)
assert.equal((await db.query('SELECT * FROM audit_logs')).rows.length, 0)
const display = (await db.query('SELECT * FROM get_platform_display_settings()')).rows[0]
assert.equal(display.platform_name, payload.platform_name)
assert.equal(display.notice_message, payload.notice_message)
assert.equal(display.updated_by, undefined)
await db.exec(`SET test.user_id = '${superId}';`)
saved = (await save({ ...payload, notice_enabled: false }, 2)).rows[0]
assert.equal(saved.version, 3)
assert.equal((await db.query('SELECT * FROM get_platform_display_settings()')).rows[0].notice_message, '')
await db.exec("SET test.user_id = '';")
await assert.rejects(save(payload, 3), /Only a superadmin/)
assert.equal((await db.query('SELECT * FROM get_platform_display_settings()')).rows.length, 0)
await db.exec('SET ROLE anon;')
await assert.rejects(db.query('SELECT * FROM system_settings'), /permission denied/)
await assert.rejects(db.query('SELECT * FROM get_platform_display_settings()'), /permission denied/)
await db.exec('RESET ROLE;')
await db.exec(migration)
assert.equal((await db.query('SELECT platform_name FROM system_settings')).rows[0].platform_name, payload.platform_name)
await db.close()
console.log('PASS: superadmin-only settings, safe display projection, audit capture, optimistic locking, validation and non-destructive rerun.')
