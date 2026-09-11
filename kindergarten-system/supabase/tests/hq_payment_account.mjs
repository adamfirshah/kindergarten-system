// node supabase/tests/hq_payment_account.mjs /path/to/@electric-sql/pglite/dist/index.js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { PGlite }=await import(pathToFileURL(process.argv[2]).href)
const db=new PGlite()
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql AS $$ SELECT NULL::UUID $$;
CREATE FUNCTION auth_user_role() RETURNS SMALLINT LANGUAGE sql AS $$ SELECT current_setting('test.role')::SMALLINT $$;
CREATE FUNCTION auth_user_branch() RETURNS UUID LANGUAGE sql AS $$ SELECT NULL::UUID $$;
CREATE TABLE users(id UUID,full_name TEXT,role_id SMALLINT);
CREATE TABLE branches(id UUID,name TEXT);
CREATE TABLE students(id INTEGER,branch_id UUID);
CREATE TABLE branch_payment_accounts(branch_id UUID,bank_name TEXT);
INSERT INTO branch_payment_accounts VALUES(NULL,'Legacy bank');
CREATE FUNCTION save_branch_payment_account(UUID,TEXT,TEXT,TEXT) RETURNS VOID LANGUAGE sql AS $$ SELECT $$;`)
const audit=await readFile(new URL('../migrations/013_audit_logs.sql',import.meta.url),'utf8')
await db.exec(audit.split('\nDO $$')[0]+'COMMIT;')
const migration=await readFile(new URL('../migrations/021_hq_payment_account.sql',import.meta.url),'utf8')
await db.exec(migration)
await db.exec("SET ROLE authenticated; SET test.role='1';")
async function save(version,number='123456789'){return (await db.query('SELECT * FROM save_hq_payment_account($1,$2,$3,$4)',['Test bank','HQ',number,version])).rows[0]}
assert.equal((await db.query('SELECT * FROM hq_payment_account')).rows.length,0)
assert.equal((await save(0)).version,1)
await assert.rejects(save(0),/changed/)
await assert.rejects(save(1,'-----'),/check constraint/)
assert.equal((await save(1)).version,2)
assert.equal((await db.query("SELECT * FROM audit_logs WHERE module='hq_payment_account'")).rows.length,2)
await assert.rejects(db.exec("UPDATE hq_payment_account SET account_name='Bypass'"),/permission denied/)
for(const role of [2,4,5]){await db.exec(`SET test.role='${role}';`);assert.equal((await db.query('SELECT * FROM hq_payment_account')).rows.length,1);await assert.rejects(save(2),/Only superadmin/)}
for(const role of [0,3]){await db.exec(`SET test.role='${role}';`);assert.equal((await db.query('SELECT * FROM hq_payment_account')).rows.length,0)}
await assert.rejects(db.query('SELECT * FROM branch_payment_accounts'),/permission denied/)
await assert.rejects(db.query('SELECT save_branch_payment_account(NULL,NULL,NULL,NULL)'),/permission denied/)
await db.exec('RESET ROLE;')
await db.exec(migration)
assert.equal((await db.query('SELECT version FROM hq_payment_account')).rows[0].version,2)
assert.equal((await db.query('SELECT * FROM branch_payment_accounts')).rows.length,1)
await db.exec('SET ROLE anon;')
await assert.rejects(db.query('SELECT * FROM hq_payment_account'),/permission denied/)
await db.close()
console.log('PASS: HQ singleton, role permissions, validation, stale-save protection, audit, legacy preservation and rerun.')
