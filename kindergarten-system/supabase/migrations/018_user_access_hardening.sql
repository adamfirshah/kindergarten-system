-- Apply after 017. Active roles only; no direct browser writes to user profiles.
BEGIN;
CREATE OR REPLACE FUNCTION public.auth_user_role() RETURNS SMALLINT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT COALESCE((SELECT role_id FROM public.users WHERE id=auth.uid() AND status='active'),0)::SMALLINT;
$$;
CREATE OR REPLACE FUNCTION public.auth_user_branch() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT branch_id FROM public.users WHERE id=auth.uid() AND status='active';
$$;
REVOKE ALL ON FUNCTION public.auth_user_role(),public.auth_user_branch() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_role(),public.auth_user_branch() TO anon,authenticated;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.users FROM PUBLIC,anon,authenticated;
-- Remove any pre-existing column grants as well as table-level grants.
DO $$ DECLARE c RECORD; BEGIN
 FOR c IN SELECT attname FROM pg_attribute WHERE attrelid='public.users'::REGCLASS AND attnum>0 AND NOT attisdropped LOOP
 EXECUTE format('REVOKE ALL (%I) ON public.users FROM PUBLIC,anon,authenticated',c.attname);
 END LOOP;
END $$;
GRANT SELECT ON public.users TO authenticated;
DROP POLICY IF EXISTS users_write ON public.users;
DROP POLICY IF EXISTS users_select ON public.users;
DROP POLICY IF EXISTS users_read_guard ON public.users;
CREATE POLICY users_select ON public.users FOR SELECT TO authenticated USING(
 id=auth.uid() OR public.auth_user_role()=1 OR (public.auth_user_role()=2 AND branch_id=public.auth_user_branch() AND role_id IN (2,3,4,5)));
-- Restrictive policy prevents any other permissive legacy policy widening reads.
CREATE POLICY users_read_guard ON public.users AS RESTRICTIVE FOR SELECT TO authenticated USING(
 id=auth.uid() OR public.auth_user_role()=1 OR (public.auth_user_role()=2 AND branch_id=public.auth_user_branch() AND role_id IN (2,3,4,5)));
DROP POLICY IF EXISTS users_insert_guard ON public.users;
DROP POLICY IF EXISTS users_update_guard ON public.users;
DROP POLICY IF EXISTS users_delete_guard ON public.users;
CREATE POLICY users_insert_guard ON public.users AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(false);
CREATE POLICY users_update_guard ON public.users AS RESTRICTIVE FOR UPDATE TO authenticated USING(false) WITH CHECK(false);
CREATE POLICY users_delete_guard ON public.users AS RESTRICTIVE FOR DELETE TO authenticated USING(false);

CREATE OR REPLACE FUNCTION public.update_managed_user(target UUID, display_name TEXT, new_role SMALLINT, new_branch UUID, new_status TEXT)
RETURNS public.users LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE old_user public.users; saved public.users; actor_role SMALLINT; actor_branch UUID;
BEGIN
 -- Serialize permission decisions and role/status changes through this RPC.
 PERFORM pg_advisory_xact_lock(180018);
 SELECT role_id,branch_id INTO actor_role,actor_branch FROM public.users WHERE id=auth.uid() AND status='active' FOR UPDATE;
 IF actor_role IS NULL OR actor_role NOT IN (1,2) THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
 SELECT * INTO old_user FROM public.users WHERE id=target FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'User unavailable' USING ERRCODE='42501'; END IF;
 IF actor_role=2 THEN
 IF actor_branch IS NULL OR old_user.branch_id IS DISTINCT FROM actor_branch OR old_user.role_id NOT IN (3,4,5) OR target=auth.uid()
 THEN RAISE EXCEPTION 'You can only manage teachers, parents and finance users in your own branch' USING ERRCODE='42501'; END IF;
 IF new_role IS DISTINCT FROM old_user.role_id OR new_branch IS DISTINCT FROM old_user.branch_id
 THEN RAISE EXCEPTION 'Only superadmin can change roles or branch assignments' USING ERRCODE='42501'; END IF;
 END IF;
 IF target=auth.uid() AND (new_role IS DISTINCT FROM old_user.role_id OR new_branch IS DISTINCT FROM old_user.branch_id OR new_status IS DISTINCT FROM old_user.status)
 THEN RAISE EXCEPTION 'You cannot change your own access or branch assignment' USING ERRCODE='42501'; END IF;
 IF new_role IS NULL OR new_role NOT IN (1,2,3,4,5) OR new_status IS NULL OR new_status NOT IN ('active','disabled')
 OR NULLIF(btrim(display_name),'') IS NULL OR length(display_name)>160 THEN RAISE EXCEPTION 'Invalid name, role or status'; END IF;
 IF new_role IN (2,3,5) AND new_branch IS NULL THEN RAISE EXCEPTION 'This role needs a branch'; END IF;
 IF new_role=1 AND new_branch IS NOT NULL THEN RAISE EXCEPTION 'Superadmin must not have a branch assignment'; END IF;
 IF new_branch IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.branches WHERE id=new_branch) THEN RAISE EXCEPTION 'Branch unavailable'; END IF;
 UPDATE public.users SET full_name=btrim(display_name),role_id=new_role,branch_id=new_branch,status=new_status,updated_at=now() WHERE id=target RETURNING * INTO saved;
 RETURN saved;
END $$;
REVOKE ALL ON FUNCTION public.update_managed_user(UUID,TEXT,SMALLINT,UUID,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_managed_user(UUID,TEXT,SMALLINT,UUID,TEXT) TO authenticated;
COMMIT;
