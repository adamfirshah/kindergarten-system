-- Live master data. Apply after 018; existing identities and records are preserved.
BEGIN;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS teacher_staff_id UUID REFERENCES branch_staff(id);
ALTER TABLE branch_staff ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_classes_teacher_staff ON classes(teacher_staff_id);
DO $$ BEGIN
 IF to_regclass('public.branch_stats') IS NOT NULL THEN
  ALTER VIEW public.branch_stats SET (security_invoker=true);
 END IF;
 -- Replaced by the active-account checked contact RPC below.
 IF to_regprocedure('public.update_own_parent_profile(text,text,text,text,text)') IS NOT NULL THEN
  REVOKE ALL ON FUNCTION public.update_own_parent_profile(TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
 END IF;
END $$;

-- Definer helper reads relationships without recursive RLS. No caller-supplied user ID.
CREATE OR REPLACE FUNCTION public.master_visible(kind TEXT, key TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r SMALLINT:=public.auth_user_role(); b UUID:=public.auth_user_branch();
BEGIN
 IF r=0 THEN RETURN false; END IF;
 IF r=1 THEN RETURN true; END IF;
 IF kind='students' THEN RETURN EXISTS(SELECT 1 FROM students s WHERE s.id::TEXT=key AND (
  (r IN(2,5) AND s.branch_id=b)
  OR (r=3 AND EXISTS(SELECT 1 FROM student_classes e JOIN classes c ON c.id=e.class_id JOIN branch_staff t ON t.id=c.teacher_staff_id WHERE e.student_id=s.id AND e.status='active' AND t.user_id=auth.uid() AND c.branch_id=b))
  OR (r=4 AND EXISTS(SELECT 1 FROM student_parents l JOIN parents p ON p.id=l.parent_id WHERE l.student_id=s.id AND p.user_id=auth.uid() AND p.status='active')))); END IF;
 IF kind='classes' THEN RETURN EXISTS(SELECT 1 FROM classes c WHERE c.id::TEXT=key AND (
  (r IN(2,5) AND c.branch_id=b) OR (r=3 AND c.branch_id=b AND EXISTS(SELECT 1 FROM branch_staff t WHERE t.id=c.teacher_staff_id AND t.user_id=auth.uid()))
  OR (r=4 AND EXISTS(SELECT 1 FROM student_classes e WHERE e.class_id=c.id AND e.status='active' AND public.master_visible('students',e.student_id::TEXT))))); END IF;
 IF kind='parents' THEN RETURN EXISTS(SELECT 1 FROM parents p WHERE p.id::TEXT=key AND (
  (r=2 AND p.primary_branch_id=b) OR(r=4 AND p.user_id=auth.uid() AND p.status='active')
  OR(r=3 AND EXISTS(SELECT 1 FROM student_parents l WHERE l.parent_id=p.id AND public.master_visible('students',l.student_id::TEXT))))); END IF;
 IF kind='branch_staff' THEN RETURN EXISTS(SELECT 1 FROM branch_staff s WHERE s.id::TEXT=key AND ((r=2 AND s.branch_id=b) OR(r=3 AND s.user_id=auth.uid()))); END IF;
 IF kind='branches' THEN RETURN key=b::TEXT OR (r=4 AND EXISTS(SELECT 1 FROM students s WHERE s.branch_id::TEXT=key AND public.master_visible('students',s.id::TEXT))); END IF;
 RETURN false;
END $$;
REVOKE ALL ON FUNCTION public.master_visible(TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.master_visible(TEXT,TEXT) TO authenticated;

DO $$ DECLARE t TEXT; pol RECORD; predicate TEXT; BEGIN
 FOREACH t IN ARRAY ARRAY['branches','students','branch_staff','parents','classes','student_parents','student_classes','academic_years','academic_terms'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
   EXECUTE format('DROP POLICY %I ON public.%I',pol.policyname,t);
  END LOOP;
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
  predicate:=CASE
   WHEN t='student_parents' THEN 'public.master_visible(''students'',student_id::TEXT) AND public.master_visible(''parents'',parent_id::TEXT)'
   WHEN t='student_classes' THEN 'public.master_visible(''students'',student_id::TEXT)'
   WHEN t IN('academic_years','academic_terms') THEN 'public.auth_user_role() IN(1,2,3,4,5)'
   ELSE format('public.master_visible(%L,id::TEXT)',t) END;
  EXECUTE format('CREATE POLICY master_read ON public.%I FOR SELECT TO authenticated USING(%s)',t,predicate);
  EXECUTE format('CREATE POLICY master_read_guard ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING(%s)',t,predicate);
  EXECUTE format('CREATE POLICY master_insert_guard ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(false)',t);
  EXECUTE format('CREATE POLICY master_update_guard ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING(false) WITH CHECK(false)',t);
  EXECUTE format('CREATE POLICY master_delete_guard ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING(false)',t);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.save_master_record(entity TEXT, record_key TEXT, payload JSONB) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r SMALLINT; b UUID; allowed TEXT[]; old JSONB; saved JSONB; branch UUID; cols TEXT; vals TEXT; assignments TEXT; k TEXT;
BEGIN
 PERFORM pg_advisory_xact_lock(190019);
 r:=public.auth_user_role(); b:=public.auth_user_branch();
 IF r NOT IN(1,2) THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
 allowed:=CASE entity
 WHEN 'branches' THEN ARRAY['name','address','phone','capacity','status']
 WHEN 'students' THEN ARRAY['name','full_name','branch_id','age','status']
 WHEN 'branch_staff' THEN ARRAY['name','full_name','branch_id','staff_role','email','phone','status','user_id']
 WHEN 'parents' THEN ARRAY['name','primary_branch_id','email','phone','status','communication_preference','user_id']
 WHEN 'classes' THEN ARRAY['name','branch_id','room','capacity','schedule','status','academic_year_id','teacher_staff_id']
 ELSE NULL END;
 IF allowed IS NULL OR jsonb_typeof(payload) IS DISTINCT FROM 'object' OR payload='{}'::JSONB THEN RAISE EXCEPTION 'Invalid master data'; END IF;
 FOR k IN SELECT jsonb_object_keys(payload) LOOP IF NOT k=ANY(allowed) THEN RAISE EXCEPTION 'Field cannot be changed: %',k; END IF; END LOOP;
 IF record_key IS NOT NULL THEN
  EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id::TEXT=$1 FOR UPDATE',entity) INTO old USING record_key;
  IF old IS NULL THEN RAISE EXCEPTION 'Record unavailable'; END IF;
 END IF;
 IF r=2 THEN
  IF b IS NULL OR (entity='branches' AND (record_key IS NULL OR record_key<>b::TEXT)) THEN RAISE EXCEPTION 'Branch access denied' USING ERRCODE='42501'; END IF;
  IF old IS NOT NULL AND entity<>'branches' AND COALESCE(old->>'branch_id',old->>'primary_branch_id') IS DISTINCT FROM b::TEXT THEN RAISE EXCEPTION 'Branch access denied' USING ERRCODE='42501'; END IF;
 END IF;
 saved:=COALESCE(old,'{}'::JSONB)||payload;
 IF NULLIF(btrim(saved->>'name'),'') IS NULL THEN RAISE EXCEPTION 'Name is required'; END IF;
 IF saved->>'status' IS NULL OR saved->>'status' NOT IN('active','inactive') THEN RAISE EXCEPTION 'Invalid status'; END IF;
 IF entity<>'branches' THEN
  branch:=COALESCE(saved->>'branch_id',saved->>'primary_branch_id')::UUID;
  IF branch IS NULL OR NOT EXISTS(SELECT 1 FROM branches WHERE id=branch) OR (r=2 AND branch<>b) THEN RAISE EXCEPTION 'Branch access denied' USING ERRCODE='42501'; END IF;
 END IF;
 IF entity IN('branches','classes') AND (COALESCE((saved->>'capacity')::INTEGER,-1)<0) THEN RAISE EXCEPTION 'Capacity must be zero or greater'; END IF;
 IF entity='students' THEN
  IF (saved->>'age')::INTEGER NOT BETWEEN 0 AND 25 THEN RAISE EXCEPTION 'Invalid age'; END IF;
  IF old IS NOT NULL AND old->>'branch_id' IS DISTINCT FROM saved->>'branch_id' THEN RAISE EXCEPTION 'Student transfers require a reviewed enrolment transfer'; END IF;
 END IF;
 IF payload ? 'user_id' AND (old->>'user_id' IS DISTINCT FROM payload->>'user_id') THEN
  IF r<>1 THEN RAISE EXCEPTION 'Only superadmin can link portal accounts'; END IF;
  IF payload->>'user_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM users WHERE id::TEXT=payload->>'user_id' AND status='active' AND ((entity='parents' AND role_id=4) OR(entity='branch_staff' AND role_id IN(2,3,5) AND branch_id=branch))) THEN RAISE EXCEPTION 'Choose an appropriate active portal account'; END IF;
 END IF;
 IF entity='parents' AND old IS NOT NULL AND old->>'primary_branch_id' IS DISTINCT FROM saved->>'primary_branch_id' THEN RAISE EXCEPTION 'Parent branch reassignment requires relationship review'; END IF;
 IF entity='classes' THEN
  IF old IS NOT NULL AND (old->>'branch_id' IS DISTINCT FROM saved->>'branch_id' OR old->>'academic_year_id' IS DISTINCT FROM saved->>'academic_year_id') AND EXISTS(SELECT 1 FROM student_classes WHERE class_id::TEXT=record_key) THEN RAISE EXCEPTION 'Enrolled classes cannot change branch or academic year'; END IF;
  IF NOT EXISTS(SELECT 1 FROM academic_years WHERE id::TEXT=saved->>'academic_year_id' AND status<>'closed') THEN RAISE EXCEPTION 'Choose an open academic year'; END IF;
  IF saved->>'teacher_staff_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM branch_staff WHERE id::TEXT=saved->>'teacher_staff_id' AND branch_id=branch AND staff_role='teacher' AND status='active') THEN RAISE EXCEPTION 'Choose an active teacher in this branch'; END IF;
 END IF;
 IF entity='branch_staff' AND old IS NOT NULL AND old->>'branch_id' IS DISTINCT FROM saved->>'branch_id' AND EXISTS(SELECT 1 FROM classes WHERE teacher_staff_id::TEXT=record_key) THEN RAISE EXCEPTION 'Reassign teaching classes before moving this staff member'; END IF;
 -- Populate the existing table type: preserves integer/UUID IDs and defaults.
 SELECT string_agg(format('%I',key),','),string_agg(format('v.%I',key),','),string_agg(format('%I=v.%I',key,key),',') INTO cols,vals,assignments FROM jsonb_object_keys(payload) key;
 IF record_key IS NULL THEN
  EXECUTE format('WITH v AS (SELECT * FROM jsonb_populate_record(NULL::public.%I,$1)), s AS (INSERT INTO public.%I(%s) SELECT %s FROM v RETURNING *) SELECT to_jsonb(s) FROM s',entity,entity,cols,vals) INTO saved USING payload;
 ELSE
  EXECUTE format('WITH v AS (SELECT * FROM jsonb_populate_record(NULL::public.%I,$1)), s AS (UPDATE public.%I t SET %s FROM v WHERE t.id::TEXT=$2 RETURNING t.*) SELECT to_jsonb(s) FROM s',entity,entity,assignments) INTO saved USING payload,record_key;
 END IF;
 IF entity='classes' THEN
 UPDATE students s SET class_name=saved->>'name' WHERE EXISTS(SELECT 1 FROM student_classes e WHERE e.student_id=s.id AND e.class_id::TEXT=saved->>'id' AND e.status='active');
 END IF;
 IF entity='parents' THEN
 UPDATE students s SET parent_name=saved->>'name' WHERE EXISTS(SELECT 1 FROM student_parents l WHERE l.student_id=s.id AND l.parent_id::TEXT=saved->>'id' AND l.is_primary_contact);
 END IF;
 RETURN saved;
END $$;
REVOKE ALL ON FUNCTION public.save_master_record(TEXT,TEXT,JSONB) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_master_record(TEXT,TEXT,JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.link_master_child(parent_key TEXT, student_key TEXT, relation TEXT, primary_contact BOOLEAN) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE p parents; s students; r SMALLINT; b UUID;
BEGIN
 PERFORM pg_advisory_xact_lock(190019);
 r:=auth_user_role(); b:=auth_user_branch();
 IF r NOT IN(1,2) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 SELECT * INTO p FROM parents WHERE id::TEXT=parent_key FOR UPDATE;
 SELECT * INTO s FROM students WHERE id::TEXT=student_key FOR UPDATE;
 IF p.id IS NULL OR s.id IS NULL OR p.status<>'active' OR s.status<>'active' OR (r=2 AND (b IS NULL OR p.primary_branch_id IS DISTINCT FROM b OR s.branch_id IS DISTINCT FROM b)) THEN RAISE EXCEPTION 'Relationship access denied'; END IF;
 IF NULLIF(btrim(relation),'') IS NULL OR primary_contact IS NULL THEN RAISE EXCEPTION 'Relationship required'; END IF;
 IF primary_contact THEN UPDATE student_parents SET is_primary_contact=false WHERE student_id=s.id; END IF;
 IF EXISTS(SELECT 1 FROM student_parents WHERE student_id=s.id AND parent_id=p.id) THEN
 UPDATE student_parents SET relationship=relation,is_primary_contact=primary_contact WHERE student_id=s.id AND parent_id=p.id;
 ELSE INSERT INTO student_parents(student_id,parent_id,relationship,is_primary_contact) VALUES(s.id,p.id,relation,primary_contact); END IF;
 IF primary_contact THEN UPDATE students SET parent_name=p.name WHERE id=s.id;
 ELSE UPDATE students SET parent_name=(SELECT p2.name FROM student_parents l JOIN parents p2 ON p2.id=l.parent_id WHERE l.student_id=s.id AND l.is_primary_contact LIMIT 1) WHERE id=s.id; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.enrol_master_student(student_key TEXT, class_key TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s students; c classes; y academic_years; r SMALLINT; b UUID;
BEGIN
 PERFORM pg_advisory_xact_lock(190019);
 r:=auth_user_role(); b:=auth_user_branch();
 IF r NOT IN(1,2) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 SELECT * INTO s FROM students WHERE id::TEXT=student_key FOR UPDATE;
 SELECT * INTO c FROM classes WHERE id::TEXT=class_key FOR UPDATE;
 IF s.id IS NULL OR c.id IS NULL OR s.branch_id IS DISTINCT FROM c.branch_id OR s.status<>'active' OR c.status<>'active' OR(r=2 AND (b IS NULL OR s.branch_id IS DISTINCT FROM b)) THEN RAISE EXCEPTION 'Enrolment access denied'; END IF;
 SELECT * INTO y FROM academic_years WHERE id=c.academic_year_id AND status<>'closed';
 IF y.id IS NULL THEN RAISE EXCEPTION 'Class needs an open academic year'; END IF;
 IF EXISTS(SELECT 1 FROM student_classes WHERE student_id=s.id AND class_id=c.id AND academic_year_id=y.id AND status='active') THEN RETURN; END IF;
 IF (SELECT count(*) FROM student_classes WHERE class_id=c.id AND academic_year_id=y.id AND status='active')>=c.capacity THEN RAISE EXCEPTION 'Class is full'; END IF;
 UPDATE student_classes SET status='completed',end_date=CURRENT_DATE WHERE student_id=s.id AND academic_year_id=y.id AND status='active';
 INSERT INTO student_classes(student_id,class_id,academic_year_id,year,status,start_date) VALUES(s.id,c.id,y.id,y.year,'active',CURRENT_DATE);
 UPDATE students SET class_name=c.name WHERE id=s.id;
END $$;
REVOKE ALL ON FUNCTION public.link_master_child(TEXT,TEXT,TEXT,BOOLEAN),public.enrol_master_student(TEXT,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.link_master_child(TEXT,TEXT,TEXT,BOOLEAN),public.enrol_master_student(TEXT,TEXT) TO authenticated;


CREATE OR REPLACE FUNCTION public.save_master_parent_contact(parent_key TEXT,contact_email TEXT,contact_phone TEXT,preference TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF public.auth_user_role()<>4 THEN RAISE EXCEPTION 'Parent access required'; END IF;
 IF preference IS NULL OR preference NOT IN('WhatsApp','Email','SMS') THEN RAISE EXCEPTION 'Invalid contact preference'; END IF;
 UPDATE parents SET email=contact_email,phone=contact_phone,communication_preference=preference WHERE id::TEXT=parent_key AND user_id=auth.uid() AND status='active';
 IF NOT FOUND THEN RAISE EXCEPTION 'Parent profile unavailable'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.save_master_parent_contact(TEXT,TEXT,TEXT,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_master_parent_contact(TEXT,TEXT,TEXT,TEXT) TO authenticated;


-- Link changes are also auditable; only metadata is retained.
CREATE OR REPLACE FUNCTION public.capture_master_link_audit() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE branch UUID;
BEGIN
 SELECT s.branch_id INTO branch FROM students s JOIN parents p ON p.id=NEW.parent_id
 WHERE s.id=NEW.student_id AND s.branch_id=p.primary_branch_id;
 INSERT INTO audit_logs(actor_id,actor_name,actor_role,branch_id,branch_name,module,action,record_id,changed_fields)
 SELECT auth.uid(),COALESCE(u.full_name,'User'),public.auth_user_role(),branch,b.name,'student_parents',TG_OP,NEW.id::TEXT,ARRAY['relationship','is_primary_contact']
 FROM (SELECT 1) anchor LEFT JOIN users u ON u.id=auth.uid() LEFT JOIN branches b ON b.id=branch;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.capture_master_link_audit() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS capture_master_link_audit ON student_parents;
CREATE TRIGGER capture_master_link_audit AFTER INSERT OR UPDATE ON student_parents FOR EACH ROW EXECUTE FUNCTION public.capture_master_link_audit();
COMMIT;
