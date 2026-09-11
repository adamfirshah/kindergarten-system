// node supabase/tests/live_finance_reports.mjs /path/to/@electric-sql/pglite/dist/index.js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { PGlite }=await import(pathToFileURL(process.argv[2]).href)
const db=new PGlite()
const a='10000000-0000-0000-0000-000000000001',b='10000000-0000-0000-0000-000000000002'
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
CREATE FUNCTION auth_user_role() RETURNS SMALLINT LANGUAGE sql AS $$ SELECT current_setting('test.role')::SMALLINT $$;
CREATE FUNCTION auth_user_branch() RETURNS UUID LANGUAGE sql AS $$ SELECT '${a}'::UUID $$;
CREATE TABLE branches(id UUID,name TEXT); INSERT INTO branches VALUES('${a}','A'),('${b}','B');
CREATE TABLE payments(branch_id UUID,amount NUMERIC,status TEXT,due_date DATE,payment_date DATE);
CREATE TABLE expenses(branch_id UUID,amount NUMERIC,status TEXT,expense_date DATE);
INSERT INTO payments VALUES
('${a}',100.25,'paid','2025-12-15','2026-01-03'),
('${a}',200,'pending','2026-01-15',NULL),
('${a}',80,'partial','2026-01-16',NULL),
('${a}',60,'void','2026-01-17',NULL),
('${a}',50,'paid','2026-01-18',NULL),
('${a}',90,'paid','2026-01-19','2026-02-01'),
('${b}',900,'paid','2026-01-01','2026-01-03');
INSERT INTO expenses VALUES('${a}',30,'approved','2026-01-10'),('${a}',90,'pending','2026-01-10');`)
const migration=await readFile(new URL('../migrations/020_live_finance_reports.sql',import.meta.url),'utf8')
await db.exec(migration);await db.exec(migration)
await db.exec("SET ROLE authenticated; SET test.role='2';")
async function report(branch=null,from='2026-01-01',to='2026-01-31'){return (await db.query('SELECT get_live_finance_report($1,$2,$3) AS result',[from,to,branch])).rows[0].result}
let rows=(await report()).rows
assert.equal(rows.length,1)
assert.equal(rows[0].invoiced,420)
assert.equal(rows[0].collected,100.25)
assert.equal(rows[0].outstanding,200)
assert.equal(rows[0].partial_count,1)
assert.equal(rows[0].missing_date_count,1)
assert.equal(rows[0].approved_expenses,30)
await assert.rejects(report(b),/Branch access denied/)
await assert.rejects(report(null,'2026-02-01','2026-01-01'),/date range/)
for(const role of [0,3,4]){await db.exec(`SET test.role='${role}';`);await assert.rejects(report(),/access required/)}
await db.exec("SET test.role='5';")
assert.equal((await report()).rows.length,1)
await db.exec("SET test.role='1';")
assert.equal((await report()).rows.length,2)
assert.equal((await report(b)).rows[0].collected,900)
await db.exec('SET ROLE anon;')
await assert.rejects(report(),/permission denied/)
await db.close()
console.log('PASS: report roles, branch isolation, date boundaries, cross-month payments, partial exclusions, approved expenses, decimals and migration rerun.')
