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
async function actor(n) { await db.exec(`SET ROLE authenticated; SET test.user_id='${id(n)}';`) }
async function save(entity, key, payload) { return (await db.query('SELECT save_master_record($1,$2,$3::JSONB) AS row',[entity,key === null ? null : String(key),JSON.stringify(payload)])).rows[0].row }
await actor(1)
const a = await save('students',null,{name:'Child A',full_name:'Child A',branch_id:id(100),age:5,status:'active'})
const b = await save('students',null,{name:'Child B',full_name:'Child B',branch_id:id(200),age:5,status:'active'})
const staff = await save('branch_staff',null,{name:'Teacher',branch_id:id(100),staff_role:'teacher',status:'active',user_id:id(3)})
const parent = await save('parents',null,{name:'Parent',primary_branch_id:id(100),status:'active',user_id:id(4)})
const c = await save('classes',null,{name:'Class A',branch_id:id(100),capacity:1,status:'active',academic_year_id:id(300),teacher_staff_id:staff.id})
await actor(2)
assert.equal((await db.query('SELECT * FROM students')).rows.length,1)
await save('students',a.id,{name:'Renamed',full_name:'Renamed'})
await assert.rejects(save('students',b.id,{name:'Bypass'}),/Branch access denied/)
await assert.rejects(save('students',a.id,{branch_id:id(200)}),/Branch access denied/)
await assert.rejects(save('parents',parent.id,{user_id:id(2)}),/Only superadmin/)
await assert.rejects(save('students',a.id,{id:99}),/Field cannot/)
await assert.rejects(db.exec("UPDATE students SET name='Bypass'"),/permission denied/)
await db.query('SELECT enrol_master_student($1,$2)',[String(a.id),String(c.id)])
await db.query('SELECT enrol_master_student($1,$2)',[String(a.id),String(c.id)])
assert.equal((await db.query('SELECT * FROM student_classes')).rows.length,1)
await assert.rejects(db.query('SELECT enrol_master_student($1,$2)',[String(b.id),String(c.id)]),/access denied/)
const a2 = await save('students',null,{name:'Other child',branch_id:id(100),age:4,status:'active'})
await assert.rejects(db.query('SELECT enrol_master_student($1,$2)',[String(a2.id),String(c.id)]),/Class is full/)
await db.query('SELECT link_master_child($1,$2,$3,$4)',[String(parent.id),String(a.id),'Mother',true])
await db.query('SELECT link_master_child($1,$2,$3,$4)',[String(parent.id),String(a.id),'Mother',true])
assert.equal((await db.query('SELECT * FROM student_parents')).rows.length,1)
await actor(3)
assert.deepEqual((await db.query('SELECT id FROM students')).rows.map((s)=>s.id),[a.id])
assert.equal((await db.query('SELECT * FROM parents')).rows.length,1)
assert.equal((await db.query('SELECT * FROM classes')).rows.length,1)
await assert.rejects(save('students',a.id,{name:'No'}),/Administrator/)
assert.ok((await db.query("SELECT * FROM audit_logs WHERE module='students'")).rows.length === 0)
await actor(4)
await db.query('SELECT save_master_parent_contact($1,$2,$3,$4)',[String(parent.id),'parent@example.com','123','Email'])
await assert.rejects(db.query('SELECT save_master_parent_contact($1,$2,$3,$4)',['999','x','123','Email']),/unavailable/)
assert.deepEqual((await db.query('SELECT id FROM students')).rows.map((s)=>s.id),[a.id])
assert.equal((await db.query('SELECT * FROM branches')).rows.length,1)
assert.equal((await db.query('SELECT * FROM branch_staff')).rows.length,0)
await assert.rejects(db.query('SELECT link_master_child($1,$2,$3,$4)',[String(parent.id),String(b.id),'Mother',true]),/Administrator/)
await actor(5)
assert.equal((await db.query('SELECT * FROM students')).rows.length,2)
await actor(1)
assert.ok((await db.query("SELECT * FROM audit_logs WHERE module='student_parents'")).rows.length > 0)
await assert.rejects(save('students',a.id,{branch_id:id(200)}),/transfers require/)
await assert.rejects(save('classes',c.id,{branch_id:id(200)}),/Enrolled classes/)
await assert.rejects(save('parents',parent.id,{user_id:id(1)}),/appropriate active/)
await db.exec('RESET ROLE;')
await db.exec(`UPDATE users SET status='disabled' WHERE id='${id(4)}';`)
await actor(4)
assert.equal((await db.query('SELECT * FROM students')).rows.length,0)
assert.equal((await db.query('SELECT * FROM parents')).rows.length,0)
await assert.rejects(db.query('SELECT save_master_parent_contact($1,$2,$3,$4)',[String(parent.id),'x','123','Email']),/Parent access required/)
await db.close()
console.log('PASS: live master CRUD, branch isolation, role-scoped reads, parent links, teacher roster, capacity, idempotent enrolments, disabled users and rerun.')
