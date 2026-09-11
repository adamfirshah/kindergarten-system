-- School fee reports, independent of demo React finance data.
BEGIN;
CREATE OR REPLACE FUNCTION public.get_live_finance_report(date_from DATE,date_to DATE,branch_filter UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r SMALLINT:=public.auth_user_role(); b UUID:=public.auth_user_branch(); result JSONB;
BEGIN
 IF r NOT IN(1,2,5) THEN RAISE EXCEPTION 'Finance report access required' USING ERRCODE='42501'; END IF;
 IF date_from IS NULL OR date_to IS NULL OR date_to<date_from OR date_to-date_from>366 THEN RAISE EXCEPTION 'Choose a date range of at most 367 days'; END IF;
 IF r<>1 AND (b IS NULL OR (branch_filter IS NOT NULL AND branch_filter<>b)) THEN RAISE EXCEPTION 'Branch access denied' USING ERRCODE='42501'; END IF;
 IF branch_filter IS NOT NULL AND NOT EXISTS(SELECT 1 FROM branches WHERE id=branch_filter) THEN RAISE EXCEPTION 'Branch unavailable'; END IF;
 SELECT jsonb_build_object('generated_at',now(),'rows',COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.branch_name),'[]'::JSONB)) INTO result
 FROM (
 SELECT br.id AS branch_id,br.name AS branch_name,
 COALESCE(p.invoiced,0) AS invoiced,COALESCE(p.collected,0) AS collected,
 COALESCE(p.outstanding,0) AS outstanding,COALESCE(p.overdue,0) AS overdue,
 COALESCE(p.partial_count,0) AS partial_count,COALESCE(p.missing_date_count,0) AS missing_date_count,
 COALESCE(e.approved_expenses,0) AS approved_expenses
 FROM branches br
 LEFT JOIN LATERAL (
 SELECT
 sum(amount) FILTER(WHERE due_date BETWEEN date_from AND date_to AND lower(status) IN('pending','overdue','paid','partial')) AS invoiced,
 sum(amount) FILTER(WHERE payment_date BETWEEN date_from AND date_to AND lower(status)='paid') AS collected,
 sum(amount) FILTER(WHERE due_date BETWEEN date_from AND date_to AND lower(status) IN('pending','overdue')) AS outstanding,
 sum(amount) FILTER(WHERE due_date BETWEEN date_from AND date_to AND due_date<(now() AT TIME ZONE 'Asia/Kuala_Lumpur')::DATE AND lower(status) IN('pending','overdue')) AS overdue,
 count(*) FILTER(WHERE due_date BETWEEN date_from AND date_to AND lower(status)='partial') AS partial_count,
 count(*) FILTER(WHERE lower(status)='paid' AND payment_date IS NULL) AS missing_date_count
 FROM payments WHERE branch_id=br.id
 ) p ON true
 LEFT JOIN LATERAL (
 SELECT sum(amount) AS approved_expenses FROM expenses WHERE branch_id=br.id AND lower(status)='approved' AND expense_date BETWEEN date_from AND date_to
 ) e ON true
 WHERE (r=1 OR br.id=b) AND (branch_filter IS NULL OR br.id=branch_filter)
 ) t;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_live_finance_report(DATE,DATE,UUID) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_live_finance_report(DATE,DATE,UUID) TO authenticated;
COMMIT;
