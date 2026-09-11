-- PAPA Kindergarten System — Reporting views
-- Reports are derived from operational tables; no duplicated report data is
-- stored. Security-invoker views retain the caller's underlying RLS scope.
-- Run after 007_announcement_module.sql.

CREATE OR REPLACE VIEW report_attendance_daily
WITH (security_invoker = true)
AS
SELECT
  student.branch_id,
  attendance_record.class_id,
  attendance_record.attendance_date,
  COUNT(*) AS total_records,
  COUNT(*) FILTER (WHERE LOWER(attendance_record.status) = 'present') AS present_count,
  COUNT(*) FILTER (WHERE LOWER(attendance_record.status) = 'late') AS late_count,
  COUNT(*) FILTER (WHERE LOWER(attendance_record.status) IN ('absent', 'excused')) AS absent_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE LOWER(attendance_record.status) IN ('present', 'late'))
    / NULLIF(COUNT(*), 0),
    2
  ) AS attendance_rate
FROM attendances attendance_record
JOIN students student ON student.id = attendance_record.student_id
GROUP BY student.branch_id, attendance_record.class_id, attendance_record.attendance_date;

CREATE OR REPLACE VIEW report_student_attendance
WITH (security_invoker = true)
AS
SELECT
  student.id AS student_id,
  student.branch_id,
  student.full_name,
  COUNT(attendance_record.id) AS total_records,
  COUNT(attendance_record.id) FILTER (
    WHERE LOWER(attendance_record.status) IN ('present', 'late')
  ) AS attended_count,
  COUNT(attendance_record.id) FILTER (
    WHERE LOWER(attendance_record.status) IN ('absent', 'excused')
  ) AS absent_count,
  ROUND(
    100.0 * COUNT(attendance_record.id) FILTER (
      WHERE LOWER(attendance_record.status) IN ('present', 'late')
    ) / NULLIF(COUNT(attendance_record.id), 0),
    2
  ) AS attendance_rate
FROM students student
LEFT JOIN attendances attendance_record ON attendance_record.student_id = student.id
GROUP BY student.id, student.branch_id, student.full_name;

CREATE OR REPLACE VIEW report_finance_monthly
WITH (security_invoker = true)
AS
WITH payment_totals AS (
  SELECT
    branch_id,
    DATE_TRUNC('month', COALESCE(payment_date, due_date))::DATE AS report_month,
    SUM(amount) FILTER (WHERE LOWER(status) = 'paid') AS collected,
    SUM(amount) FILTER (WHERE LOWER(status) IN ('pending', 'partial', 'overdue')) AS outstanding,
    COUNT(*) FILTER (WHERE LOWER(status) = 'overdue') AS overdue_count
  FROM payments
  GROUP BY branch_id, DATE_TRUNC('month', COALESCE(payment_date, due_date))::DATE
),
expense_totals AS (
  SELECT
    branch_id,
    DATE_TRUNC('month', expense_date)::DATE AS report_month,
    SUM(amount) FILTER (WHERE LOWER(status) = 'approved') AS approved_expenses,
    COUNT(*) FILTER (WHERE LOWER(status) = 'pending') AS pending_expense_count
  FROM expenses
  GROUP BY branch_id, DATE_TRUNC('month', expense_date)::DATE
)
SELECT
  COALESCE(payment.branch_id, expense.branch_id) AS branch_id,
  COALESCE(payment.report_month, expense.report_month) AS report_month,
  COALESCE(payment.collected, 0) AS collected,
  COALESCE(payment.outstanding, 0) AS outstanding,
  COALESCE(payment.overdue_count, 0) AS overdue_count,
  COALESCE(expense.approved_expenses, 0) AS approved_expenses,
  COALESCE(expense.pending_expense_count, 0) AS pending_expense_count,
  COALESCE(payment.collected, 0) - COALESCE(expense.approved_expenses, 0) AS net_cash_position
FROM payment_totals payment
FULL OUTER JOIN expense_totals expense
  ON expense.branch_id = payment.branch_id
  AND expense.report_month = payment.report_month;

CREATE OR REPLACE VIEW report_homework_completion
WITH (security_invoker = true)
AS
SELECT
  assignment_record.id AS assignment_id,
  assignment_record.branch_id,
  assignment_record.class_id,
  assignment_record.title,
  assignment_record.subject,
  assignment_record.due_date,
  assignment_record.status,
  COUNT(submission.id) AS assigned_count,
  COUNT(submission.id) FILTER (
    WHERE submission.status IN ('submitted', 'reviewed')
  ) AS completed_count,
  COUNT(submission.id) FILTER (WHERE submission.status = 'reviewed') AS reviewed_count,
  ROUND(
    100.0 * COUNT(submission.id) FILTER (
      WHERE submission.status IN ('submitted', 'reviewed')
    ) / NULLIF(COUNT(submission.id), 0),
    2
  ) AS completion_rate
FROM assignments assignment_record
LEFT JOIN assignment_submissions submission
  ON submission.assignment_id = assignment_record.id
GROUP BY
  assignment_record.id,
  assignment_record.branch_id,
  assignment_record.class_id,
  assignment_record.title,
  assignment_record.subject,
  assignment_record.due_date,
  assignment_record.status;

REVOKE ALL ON report_attendance_daily FROM PUBLIC;
REVOKE ALL ON report_student_attendance FROM PUBLIC;
REVOKE ALL ON report_finance_monthly FROM PUBLIC;
REVOKE ALL ON report_homework_completion FROM PUBLIC;

GRANT SELECT ON report_attendance_daily TO authenticated;
GRANT SELECT ON report_student_attendance TO authenticated;
GRANT SELECT ON report_finance_monthly TO authenticated;
GRANT SELECT ON report_homework_completion TO authenticated;
