-- Apply after 022. In-app onboarding and notifications; no email delivery.
BEGIN;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_event ON notifications(user_id,event_key) WHERE event_key IS NOT NULL;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON notifications FROM PUBLIC,anon,authenticated;
GRANT SELECT ON notifications TO authenticated;
DO $$ DECLARE p RECORD; BEGIN
 FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='notifications' LOOP
 EXECUTE format('DROP POLICY %I ON public.notifications',p.policyname); END LOOP;
END $$;
CREATE POLICY notifications_own ON notifications FOR SELECT TO authenticated USING(user_id=auth.uid() AND public.auth_user_role() IN(1,2,3,4,5));
CREATE POLICY notifications_guard ON notifications AS RESTRICTIVE FOR SELECT TO authenticated USING(user_id=auth.uid() AND public.auth_user_role() IN(1,2,3,4,5));
CREATE POLICY notifications_no_insert ON notifications AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(false);
CREATE POLICY notifications_no_update ON notifications AS RESTRICTIVE FOR UPDATE TO authenticated USING(false) WITH CHECK(false);
CREATE POLICY notifications_no_delete ON notifications AS RESTRICTIVE FOR DELETE TO authenticated USING(false);
CREATE OR REPLACE FUNCTION public.read_notification(target TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF COALESCE(auth_user_role(),0) NOT IN(1,2,3,4,5) THEN RAISE EXCEPTION 'Active account required'; END IF;
 UPDATE notifications SET is_read=true WHERE id::TEXT=target AND user_id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Notification unavailable'; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.notification_inbox(page_number INTEGER DEFAULT 0) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result JSONB;
BEGIN
 IF COALESCE(auth_user_role(),0) NOT IN(1,2,3,4,5) THEN RAISE EXCEPTION 'Active account required'; END IF;
 IF page_number IS NULL OR page_number<0 OR page_number>100000 THEN RAISE EXCEPTION 'Invalid page'; END IF;
 SELECT jsonb_build_object('total',(SELECT count(*) FROM notifications WHERE user_id=auth.uid()),
 'unread',(SELECT count(*) FROM notifications WHERE user_id=auth.uid() AND NOT COALESCE(is_read,false)),
 'rows',COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT id,title,message,is_read,notification_type,created_at FROM notifications WHERE user_id=auth.uid() ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET page_number*20)t),'[]'::JSONB)) INTO result;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.onboarding_status() RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r SMALLINT:=auth_user_role(); b UUID:=auth_user_branch(); steps JSONB:='[]'::JSONB;
BEGIN
 IF COALESCE(r,0) NOT IN(1,2,3,4,5) THEN RAISE EXCEPTION 'Active account required'; END IF;
 IF r=1 THEN
 steps:=jsonb_build_array(
 jsonb_build_object('label','Create an active branch','complete',EXISTS(SELECT 1 FROM branches WHERE status='active'),'module','branches'),
 jsonb_build_object('label','Configure the HQ collection account','complete',EXISTS(SELECT 1 FROM hq_payment_account),'module','finance'),
 jsonb_build_object('label','Assign an active branch administrator','complete',EXISTS(SELECT 1 FROM users WHERE role_id=2 AND status='active' AND branch_id IS NOT NULL),'module','users'));
 ELSIF r IN(2,5) THEN
 steps:=jsonb_build_array(jsonb_build_object('label','Branch assignment','complete',b IS NOT NULL,'help','Contact superadmin if your branch is missing.'),
 jsonb_build_object('label','Active students in your branch','complete',EXISTS(SELECT 1 FROM students WHERE branch_id=b AND status='active'),'module','students'),
 jsonb_build_object('label','HQ bank details available','complete',EXISTS(SELECT 1 FROM hq_payment_account),'help','Superadmin configures the HQ bank account.'));
 ELSIF r=3 THEN
 steps:=jsonb_build_array(jsonb_build_object('label','Staff profile linked to your login','complete',EXISTS(SELECT 1 FROM branch_staff WHERE user_id=auth.uid() AND branch_id=b AND status='active'),'help','Ask superadmin to link your staff record.'),
 jsonb_build_object('label','Teaching class assigned','complete',EXISTS(SELECT 1 FROM classes c JOIN branch_staff s ON s.id=c.teacher_staff_id WHERE s.user_id=auth.uid() AND s.branch_id=b AND c.branch_id=b AND c.status='active' AND s.status='active'),'module','classes','help','Ask your branch administrator to assign your class.'));
 ELSE
 steps:=jsonb_build_array(jsonb_build_object('label','Parent profile linked to your login','complete',EXISTS(SELECT 1 FROM parents WHERE user_id=auth.uid() AND status='active'),'module','parents','help','Ask superadmin to link your parent profile.'),
 jsonb_build_object('label','Your child linked to your profile','complete',EXISTS(SELECT 1 FROM parents p JOIN student_parents l ON l.parent_id=p.id JOIN students s ON s.id=l.student_id WHERE p.user_id=auth.uid() AND p.status='active' AND s.status='active'),'module','children','help','Ask your branch administrator to link your child.'));
 END IF;
 RETURN steps;
END $$;
CREATE OR REPLACE FUNCTION public.welcome_portal_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.status='active' AND NEW.role_id IN(1,2,3,4,5) THEN
 INSERT INTO notifications(user_id,title,message,is_read,notification_type,event_key)
 VALUES(NEW.id,'Welcome to PAPA','Open your dashboard to review your account setup and next steps.',false,'system','portal_welcome')
 ON CONFLICT(user_id,event_key) WHERE event_key IS NOT NULL DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS welcome_portal_user ON users;
CREATE TRIGGER welcome_portal_user AFTER INSERT OR UPDATE OF status ON users FOR EACH ROW EXECUTE FUNCTION public.welcome_portal_user();
REVOKE ALL ON FUNCTION public.welcome_portal_user() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.read_notification(TEXT),public.notification_inbox(INTEGER),public.onboarding_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_notification(TEXT),public.notification_inbox(INTEGER),public.onboarding_status() TO authenticated;
COMMIT;
