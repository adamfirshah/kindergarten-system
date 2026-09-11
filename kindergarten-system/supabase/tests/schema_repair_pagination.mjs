// node supabase/tests/master_data.mjs /path/to/@electric-sql/pglite/dist/index.js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
const id = (n) => `10000000-0000-0000-0000-${String(n).padStart(12,'0')}`
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.user_id',true),'')::UUID $$;
CREATE TABLE branches(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name TEXT,address TEXT,phone TEXT,capacity INTEGER,status TEXT);
CREATE TABLE users(id UUID PRIMARY KEY,role_id SMALLINT,branch_id UUID,status TEXT,full_name TEXT,email TEXT,updated_at TIMESTAMPTZ);
CREATE TABLE students(id SERIAL PRIMARY KEY,name TEXT,full_name TEXT,branch_id UUID,age INTEGER,status TEXT,class_name TEXT,parent_name TEXT);
CREATE TABLE branch_staff(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name TEXT,full_name TEXT,branch_id UUID,staff_role TEXT,email TEXT,phone TEXT,user_id UUID);
CREATE TABLE parents(id SERIAL PRIMARY KEY,name TEXT,primary_branch_id UUID,user_id UUID,email TEXT,phone TEXT,status TEXT,communication_preference TEXT);
CREATE TABLE academic_years(id UUID PRIMARY KEY,year SMALLINT,name TEXT,status TEXT);
CREATE TABLE academic_terms(id UUID PRIMARY KEY,academic_year_id UUID,name TEXT);
CREATE TABLE classes(id SERIAL PRIMARY KEY,name TEXT,branch_id UUID,room TEXT,capacity INTEGER,schedule TEXT,status TEXT);
CREATE TABLE student_classes(id SERIAL PRIMARY KEY,student_id INTEGER REFERENCES students,class_id INTEGER REFERENCES classes,academic_year_id UUID,year SMALLINT,status TEXT,start_date DATE,end_date DATE);
CREATE TABLE student_parents(id SERIAL PRIMARY KEY,student_id INTEGER REFERENCES students,parent_id INTEGER REFERENCES parents,relationship TEXT,is_primary_contact BOOLEAN);
INSERT INTO branches VALUES('${id(100)}','A','','',30,'active'),('${id(200)}','B','','',30,'active');
INSERT INTO users VALUES('${id(1)}',1,NULL,'active','Super','',now()),('${id(2)}',2,'${id(100)}','active','Admin','',now()),('${id(3)}',3,'${id(100)}','active','Teacher','',now()),('${id(4)}',4,NULL,'active','Parent','',now()),('${id(5)}',5,'${id(100)}','active','Finance','',now());
INSERT INTO academic_years VALUES('${id(300)}',2026,'2026','active');
`)
await db.exec(await readFile(new URL('../migrations/018_user_access_hardening.sql',import.meta.url),'utf8'))
for (const table of ['attendances','payments','expenses','assignments','assignment_submissions','announcements','subscription_plans','subscription_invoices']) {
  await db.exec(`CREATE TABLE ${table}(id INTEGER PRIMARY KEY,branch_id UUID);`)
}
await db.exec(await readFile(new URL('../migrations/013_audit_logs.sql',import.meta.url),'utf8'))
const migration = await readFile(new URL('../migrations/019_master_data.sql',import.meta.url),'utf8')
await db.exec(migration)
await db.exec(migration)
await db.exec(`ALTER TABLE parents DROP COLUMN status;
ALTER TABLE parents DROP COLUMN communication_preference;
ALTER TABLE payments ADD amount NUMERIC,ADD status TEXT,ADD due_date DATE,ADD invoice_no TEXT,ADD fee_student_name TEXT,ADD fee_branch_name TEXT;
CREATE TABLE payment_proofs(payment_id INTEGER,status TEXT);
CREATE TABLE notifications(id SERIAL PRIMARY KEY,user_id UUID,title TEXT,message TEXT,is_read BOOLEAN,notification_type TEXT,created_at TIMESTAMPTZ DEFAULT now());
CREATE FUNCTION can_manage_fee_branch(target UUID) RETURNS BOOLEAN LANGUAGE sql AS $$ SELECT auth_user_role()=1 OR(auth_user_role() IN(2,5) AND target=auth_user_branch()) $$;
INSERT INTO students(name,branch_id,status) VALUES('Child','${id(100)}','active');
`)
await db.exec(`SET ROLE authenticated; SET test.user_id='${id(2)}';`)
await assert.rejects(db.query('SELECT * FROM students'),/p.status/)
await db.exec('RESET ROLE;')
const repair=await readFile(new URL('../migrations/024_schema_repair_pagination.sql',import.meta.url),'utf8')
await db.exec(repair);await db.exec(repair)
await db.exec(`SET ROLE authenticated; SET test.user_id='${id(2)}';`)
assert.equal((await db.query('SELECT * FROM students')).rows.length,1)
await db.exec('RESET ROLE;')
await db.exec(`INSERT INTO payments(id,branch_id,amount,status,due_date) SELECT n,'${id(100)}',10,'pending',CURRENT_DATE-1 FROM generate_series(1,23)n;
INSERT INTO notifications(user_id,title,is_read) SELECT '${id(2)}','Test',false FROM generate_series(1,23);`)
await db.exec(`SET ROLE authenticated; SET test.user_id='${id(2)}';`)
const seen=[]
for(let page=0;page<3;page++){
 const aging=(await db.query('SELECT fee_aging_report($1) AS data',[page])).rows[0].data
 assert.equal(aging.rows.length,page===2?3:10);assert.equal(aging.total,23)
 seen.push(...aging.rows.map(r=>r.id))
 const inbox=(await db.query('SELECT notification_inbox($1) AS data',[page])).rows[0].data
 assert.equal(inbox.rows.length,page===2?3:10);assert.equal(inbox.unread,23)
}
assert.equal(new Set(seen).size,23)
await db.close()
console.log('PASS: reproduced missing p.status, repaired legacy schema, preserved access, rerun and ten-row server pagination without missing records.')
