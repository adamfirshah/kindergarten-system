// node supabase/tests/user_access.mjs /path/to/@electric-sql/pglite/dist/index.js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
const id = (n) => `10000000-0000-0000-0000-${String(n).padStart(12, '0')}`
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated;
CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.user_id',true),'')::UUID $$;
CREATE TABLE branches(id UUID PRIMARY KEY,name TEXT);
CREATE TABLE users(id UUID PRIMARY KEY, full_name TEXT, email TEXT, role_id SMALLINT, branch_id UUID, status TEXT, updated_at TIMESTAMPTZ);
INSERT INTO branches VALUES ('${id(100)}','A'),('${id(200)}','B');
INSERT INTO users VALUES
('${id(1)}','Super','super@example.com',1,NULL,'active',now()),
('${id(2)}','Admin A','a@example.com',2,'${id(100)}','active',now()),
('${id(3)}','Teacher A','t@example.com',3,'${id(100)}','active',now()),
('${id(4)}','Parent A','p@example.com',4,'${id(100)}','active',now()),
('${id(5)}','Finance A','f@example.com',5,'${id(100)}','active',now()),
('${id(6)}','Admin B','b@example.com',2,'${id(200)}','active',now()),
('${id(7)}','Teacher B','tb@example.com',3,'${id(200)}','active',now()),
('${id(8)}','Disabled admin','d@example.com',2,'${id(100)}','disabled',now());
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_write ON users FOR ALL TO authenticated USING(true) WITH CHECK(true);
CREATE POLICY legacy_read ON users FOR SELECT TO authenticated USING(true);
GRANT ALL ON users TO authenticated;
GRANT UPDATE(role_id) ON users TO authenticated;
`)
const migration = await readFile(new URL('../migrations/018_user_access_hardening.sql', import.meta.url), 'utf8')
await db.exec(migration)
await db.exec(migration)
async function actor(n) { await db.exec(`SET ROLE authenticated; SET test.user_id='${id(n)}';`) }
async function save(target, role, branch, status = 'active') {
  return db.query('SELECT * FROM update_managed_user($1::UUID,$2::TEXT,$3::SMALLINT,$4::UUID,$5::TEXT)', [id(target), 'Updated', role, branch ? id(branch) : null, status])
}
await actor(2)
assert.deepEqual((await db.query('SELECT id FROM users ORDER BY id')).rows.map((r) => r.id), [2,3,4,5,8].map(id))
await assert.rejects(db.exec('UPDATE users SET role_id=1'), /permission denied/)
await assert.rejects(db.exec('DELETE FROM users'), /permission denied/)
await assert.rejects(db.exec(`INSERT INTO users(id) VALUES('${id(99)}')`), /permission denied/)
assert.equal((await save(3,3,100,'disabled')).rows[0].status, 'disabled')
await save(3,3,100)
for (const args of [[3,1,null],[3,3,200],[7,3,200],[1,1,null],[2,2,100],[8,2,100]]) {
  await assert.rejects(save(...args), /only manage|Only superadmin/)
}
for (const n of [3,4,5,8,99]) {
  await actor(n)
  assert.equal((await db.query('SELECT * FROM users')).rows.length, n === 99 ? 0 : 1)
  await assert.rejects(save(3,3,100), /Administrator access required/)
}
await actor(8)
assert.equal((await db.query('SELECT auth_user_role() AS role,auth_user_branch() AS branch')).rows[0].role, 0)
assert.equal((await db.query('SELECT auth_user_branch() AS branch')).rows[0].branch, null)
await actor(1)
assert.equal((await db.query('SELECT * FROM users')).rows.length, 8)
assert.equal((await save(3,5,200)).rows[0].branch_id,id(200))
await assert.rejects(save(1,2,100), /own access/)
await assert.rejects(save(1,1,null,'disabled'), /own access/)
await assert.rejects(save(3,5,null), /needs a branch/)
await assert.rejects(save(3,1,100), /must not have a branch/)
await assert.rejects(save(3,5,999), /Branch unavailable/)
await actor(2)
assert.equal((await db.query(`SELECT * FROM users WHERE id='${id(3)}'`)).rows.length,0)
// Even an accidental broad grant/policy cannot bypass the restrictive guards.
await db.exec('RESET ROLE; GRANT ALL ON users TO authenticated; CREATE POLICY accidental_write ON users FOR ALL TO authenticated USING(true) WITH CHECK(true);')
await actor(2)
assert.equal((await db.query('UPDATE users SET role_id=1 RETURNING id')).rows.length,0)
assert.equal((await db.query('DELETE FROM users RETURNING id')).rows.length,0)
await assert.rejects(db.exec(`INSERT INTO users(id) VALUES('${id(99)}')`), /row-level security/)
assert.equal((await db.query(`SELECT * FROM users WHERE id='${id(7)}'`)).rows.length,0)
await db.exec('RESET ROLE;')
await db.exec(migration)
await db.exec('SET ROLE anon;')
await assert.rejects(db.query('SELECT * FROM users'), /permission denied/)
await assert.rejects(save(3,3,100), /permission denied/)
await db.close()
console.log('PASS: scoped reads, direct-write prevention, role escalation, branch reassignment, inactive accounts, self-lockout protection, validation and migration rerun.')
