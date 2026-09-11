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
await db.exec(`CREATE TABLE notifications(id SERIAL PRIMARY KEY,user_id UUID,title TEXT,message TEXT,is_read BOOLEAN DEFAULT false,notification_type TEXT);
CREATE TABLE hq_payment_account(id BOOLEAN PRIMARY KEY);
GRANT ALL ON notifications TO authenticated;`)
const onboarding=await readFile(new URL('../migrations/023_onboarding_notifications.sql',import.meta.url),'utf8')
await db.exec(onboarding);await db.exec(onboarding)
async function actor(n){await db.exec(`SET ROLE authenticated; SET test.user_id='${id(n)}';`)}
await actor(1)
let steps=(await db.query('SELECT onboarding_status() AS steps')).rows[0].steps
assert.equal(steps.length,3)
assert.equal(steps[0].complete,true)
assert.equal(steps[1].complete,false)
await actor(4)
steps=(await db.query('SELECT onboarding_status() AS steps')).rows[0].steps
assert.equal(steps.every(s=>!s.complete),true)
await db.exec('RESET ROLE;')
await db.exec(`UPDATE users SET status='active' WHERE id='${id(4)}'; UPDATE users SET status='active' WHERE id='${id(4)}';`)
assert.equal((await db.query("SELECT * FROM notifications WHERE event_key='portal_welcome'")).rows.length,1)
await db.exec(`INSERT INTO notifications(user_id,title,message,is_read,notification_type) SELECT '${id(4)}','Invoice','Message',false,'payment' FROM generate_series(1,25);
INSERT INTO notifications(user_id,title,message,is_read,notification_type) VALUES('${id(3)}','Private','Other user',false,'system');`)
const otherNotice=(await db.query("SELECT id FROM notifications WHERE title='Private'")).rows[0].id
await actor(4)
let inbox=(await db.query('SELECT notification_inbox(0) AS data')).rows[0].data
assert.equal(inbox.total,26);assert.equal(inbox.unread,26);assert.equal(inbox.rows.length,20)
assert.equal((await db.query('SELECT notification_inbox(1) AS data')).rows[0].data.rows.length,6)
await db.query('SELECT read_notification($1)',[String(inbox.rows[0].id)])
await db.query('SELECT read_notification($1)',[String(inbox.rows[0].id)])
assert.equal((await db.query('SELECT notification_inbox() AS data')).rows[0].data.unread,25)
await assert.rejects(db.query('SELECT read_notification($1)',[String(otherNotice)]),/unavailable/)
await assert.rejects(db.exec("UPDATE notifications SET message='Forged'"),/permission denied/)
await assert.rejects(db.exec("INSERT INTO notifications(title) VALUES('Forged')"),/permission denied/)
await db.exec('RESET ROLE;')
await db.exec(`UPDATE users SET status='disabled' WHERE id='${id(4)}';`)
await actor(4)
await assert.rejects(db.query('SELECT notification_inbox()'),/Active account/)
await assert.rejects(db.query('SELECT onboarding_status()'),/Active account/)
await db.close()
console.log('PASS: onboarding readiness, private inbox, full unread counts, pagination, idempotent welcome/read, anti-forgery and inactive-account denial.')
