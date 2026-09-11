-- PAPA Kindergarten System — Explainable analytics foundation
-- These security-invoker views derive signals from operational data. They do
-- not call an external AI model and do not store predictions or duplicate data.
-- Run after 008_reporting_views.sql.

CREATE OR REPLACE VIEW analytics_branch_health
WITH (security_invoker = true)
AS
WITH student_totals AS (
  SELECT
    branch_id,
    COUNT(*) FILTER (WHERE LOWER(status) = 'active') AS active_students
  FROM students
  GROUP BY branch_id
),
attendance_totals AS (
  SELECT
    student.branch_id,
    COUNT(attendance_record.id) AS attendance_records,
    ROUND(
      100.0 * COUNT(attendance_record.id) FILTER (
        WHERE LOWER(attendance_record.status) IN ('present', 'late')
      ) / NULLIF(COUNT(attendance_record.id), 0),
      2
    ) AS attendance_rate
  FROM students student
  LEFT JOIN attendances attendance_record ON attendance_record.student_id = student.id
  GROUP BY student.branch_id
),
payment_totals AS (
  SELECT
    branch_id,
    COALESCE(SUM(amount) FILTER (WHERE LOWER(status) = 'paid'), 0) AS collected,
    COALESCE(SUM(amount) FILTER (
      WHERE LOWER(status) IN ('pending', 'partial', 'overdue')
    ), 0) AS outstanding,
    COUNT(*) FILTER (WHERE LOWER(status) = 'overdue') AS overdue_count
  FROM payments
  GROUP BY branch_id
),
expense_totals AS (
  SELECT
    branch_id,
    COALESCE(SUM(amount) FILTER (WHERE LOWER(status) = 'approved'), 0) AS approved_expenses
  FROM expenses
  GROUP BY branch_id
),
homework_totals AS (
  SELECT
    assignment_record.branch_id,
    COUNT(submission.id) AS homework_records,
    ROUND(
      100.0 * COUNT(submission.id) FILTER (
        WHERE submission.status IN ('submitted', 'reviewed')
      ) / NULLIF(COUNT(submission.id), 0),
      2
    ) AS homework_completion_rate
  FROM assignments assignment_record
  LEFT JOIN assignment_submissions submission
    ON submission.assignment_id = assignment_record.id
  GROUP BY assignment_record.branch_id
),
raw_metrics AS (
  SELECT
    branch.id AS branch_id,
    branch.name AS branch_name,
    branch.status AS branch_status,
    branch.capacity,
    COALESCE(student_total.active_students, 0) AS active_students,
    COALESCE(attendance_total.attendance_records, 0) AS attendance_records,
    COALESCE(attendance_total.attendance_rate, 0) AS attendance_rate,
    COALESCE(homework_total.homework_records, 0) AS homework_records,
    COALESCE(homework_total.homework_completion_rate, 0) AS homework_completion_rate,
    COALESCE(payment_total.collected, 0) AS collected,
    COALESCE(payment_total.outstanding, 0) AS outstanding,
    COALESCE(payment_total.overdue_count, 0) AS overdue_count,
    COALESCE(expense_total.approved_expenses, 0) AS approved_expenses,
    COALESCE(
      ROUND(100.0 * student_total.active_students / NULLIF(branch.capacity, 0), 2),
      0
    ) AS occupancy_rate
  FROM branches branch
  LEFT JOIN student_totals student_total ON student_total.branch_id = branch.id
  LEFT JOIN attendance_totals attendance_total ON attendance_total.branch_id = branch.id
  LEFT JOIN payment_totals payment_total ON payment_total.branch_id = branch.id
  LEFT JOIN expense_totals expense_total ON expense_total.branch_id = branch.id
  LEFT JOIN homework_totals homework_total ON homework_total.branch_id = branch.id
),
scored_metrics AS (
  SELECT
    raw_metrics.*,
    (
      CASE
        WHEN attendance_records = 0 THEN 0
        WHEN attendance_rate < 80 THEN 35
        WHEN attendance_rate < 90 THEN 15
        ELSE 0
      END
      + CASE
          WHEN homework_records = 0 THEN 0
          WHEN homework_completion_rate < 60 THEN 30
          WHEN homework_completion_rate < 80 THEN 15
          ELSE 0
        END
      + CASE
          WHEN overdue_count > 0 THEN 20
          WHEN outstanding > 0 THEN 10
          ELSE 0
        END
      + CASE WHEN occupancy_rate >= 95 THEN 10 ELSE 0 END
      + CASE WHEN LOWER(branch_status) <> 'active' THEN 20 ELSE 0 END
    )::INTEGER AS risk_score
  FROM raw_metrics
)
SELECT
  scored_metrics.*,
  GREATEST(0, 100 - risk_score) AS health_score,
  CASE
    WHEN risk_score >= 50 THEN 'attention'
    WHEN risk_score >= 25 THEN 'monitor'
    ELSE 'stable'
  END AS attention_level,
  ROUND(collected + (outstanding * 0.65), 2) AS estimated_collection
FROM scored_metrics
WHERE auth_user_role() IN (1, 2);

CREATE OR REPLACE VIEW analytics_student_risk
WITH (security_invoker = true)
AS
WITH attendance_totals AS (
  SELECT
    student.id AS student_id,
    COUNT(attendance_record.id) AS attendance_records,
    ROUND(
      100.0 * COUNT(attendance_record.id) FILTER (
        WHERE LOWER(attendance_record.status) IN ('present', 'late')
      ) / NULLIF(COUNT(attendance_record.id), 0),
      2
    ) AS attendance_rate
  FROM students student
  LEFT JOIN attendances attendance_record ON attendance_record.student_id = student.id
  GROUP BY student.id
),
homework_totals AS (
  SELECT
    student.id AS student_id,
    COUNT(submission.id) AS homework_records,
    ROUND(
      100.0 * COUNT(submission.id) FILTER (
        WHERE submission.status IN ('submitted', 'reviewed')
      ) / NULLIF(COUNT(submission.id), 0),
      2
    ) AS homework_completion_rate
  FROM students student
  LEFT JOIN assignment_submissions submission ON submission.student_id = student.id
  GROUP BY student.id
),
payment_totals AS (
  SELECT
    student_id,
    COALESCE(SUM(amount) FILTER (
      WHERE LOWER(status) IN ('pending', 'partial', 'overdue')
    ), 0) AS outstanding,
    COUNT(*) FILTER (WHERE LOWER(status) = 'overdue') AS overdue_count
  FROM payments
  GROUP BY student_id
),
raw_signals AS (
  SELECT
    student.id AS student_id,
    student.branch_id,
    student.full_name,
    COALESCE(attendance_total.attendance_records, 0) AS attendance_records,
    COALESCE(attendance_total.attendance_rate, 0) AS attendance_rate,
    COALESCE(homework_total.homework_records, 0) AS homework_records,
    COALESCE(homework_total.homework_completion_rate, 0) AS homework_completion_rate,
    COALESCE(payment_total.outstanding, 0) AS outstanding,
    COALESCE(payment_total.overdue_count, 0) AS overdue_count
  FROM students student
  LEFT JOIN attendance_totals attendance_total ON attendance_total.student_id = student.id
  LEFT JOIN homework_totals homework_total ON homework_total.student_id = student.id
  LEFT JOIN payment_totals payment_total ON payment_total.student_id = student.id
),
scored_signals AS (
  SELECT
    raw_signals.*,
    (
      CASE
        WHEN attendance_records = 0 THEN 0
        WHEN attendance_rate < 80 THEN 45
        WHEN attendance_rate < 90 THEN 25
        ELSE 0
      END
      + CASE
          WHEN homework_records = 0 THEN 0
          WHEN homework_completion_rate < 50 THEN 35
          WHEN homework_completion_rate < 80 THEN 15
          ELSE 0
        END
      + CASE
          WHEN overdue_count > 0 THEN 20
          WHEN outstanding > 0 THEN 10
          ELSE 0
        END
    )::INTEGER AS risk_score
  FROM raw_signals
)
SELECT
  scored_signals.*,
  CASE
    WHEN risk_score >= 50 THEN 'attention'
    WHEN risk_score >= 25 THEN 'monitor'
    ELSE 'stable'
  END AS risk_level
FROM scored_signals
WHERE auth_user_role() IN (1, 2);

REVOKE ALL ON analytics_branch_health FROM PUBLIC;
REVOKE ALL ON analytics_student_risk FROM PUBLIC;

GRANT SELECT ON analytics_branch_health TO authenticated;
GRANT SELECT ON analytics_student_risk TO authenticated;
