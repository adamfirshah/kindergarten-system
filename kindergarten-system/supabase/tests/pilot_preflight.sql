-- Read-only checks for an administrator in the target Supabase SQL editor.
-- This does NOT apply migrations, create users, issue invoices or send notices.
BEGIN TRANSACTION READ ONLY;
SELECT name, to_regclass('public.'||name) IS NOT NULL AS table_present
FROM unnest(ARRAY['users','branches','students','parents','student_parents','classes','student_classes','payments','payment_proofs','hq_payment_account','audit_logs','notifications']) AS name;
SELECT name,to_regprocedure('public.'||name) IS NOT NULL AS function_present
FROM unnest(ARRAY[
'update_managed_user(uuid,text,smallint,uuid,text)',
'save_master_record(text,text,jsonb)',
'get_live_finance_report(date,date,uuid)',
'save_hq_payment_account(text,text,text,integer)',
'void_fee_invoice(integer,text)',
'fee_aging_report(integer)',
'notification_inbox(integer)',
'onboarding_status()'
]) AS name;
SELECT c.relname AS table_name,c.relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN('users','students','parents','payments','payment_proofs','hq_payment_account','notifications');
SELECT p.proname,has_function_privilege('authenticated',p.oid,'EXECUTE') AS old_endpoint_still_callable
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='save_branch_payment_account';
SELECT extname,extversion FROM pg_extension WHERE extname='pg_cron';
-- Function/table presence alone does not prove the correct migration definition.
-- Confirm installed migration versions and execute role-based UAT separately.
COMMIT;
