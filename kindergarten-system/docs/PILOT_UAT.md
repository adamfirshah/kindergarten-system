# Pilot UAT — PAPA

Status: local verification only. Hosted migration, browser role testing and live pilot are not yet signed off.

Use a separate Supabase staging project with synthetic student/parent data first. The pilot scope is one branch, one superadmin, one branch admin, one finance user, one teacher and two parents with different children. Add a second test branch to check access isolation. Existing accounts must be provisioned in Supabase Auth and linked to users/staff/parent records; invitation emails are not implemented.

## Before testing

- [ ] Confirm the target project is staging and record its name and test date.
- [ ] Apply outstanding migrations in order through 023. Do not rerun seed migrations against existing data as a substitute for checking migration history.
- [ ] Run `supabase/tests/pilot_preflight.sql`; all expected tables/functions should exist, listed tables should have RLS, and the legacy branch-bank save endpoint must not be callable by authenticated users.
- [ ] Verify cron installation and the named recurring-billing job in Supabase Cron. Do not enable real billing schedules for synthetic test cases.
- [ ] Link the teacher to a staff profile and class; link each parent to their own child. Configure test HQ bank instructions only in staging.

## Role and master-data checks

- [ ] Superadmin sees both test branches. Admin and finance cannot read or alter the other branch through either the UI or a direct authenticated API request.
- [ ] Teacher sees assigned-class pupils. Parent A cannot see Parent B's child, invoice, proof file or notifications, including through a copied URL/API request.
- [ ] Disabled users lose database permissions and see the disabled-account screen on refresh.
- [ ] Add/edit a student, reload and sign in again: values persist. Parent links and class enrolment persist without duplicate rows on retry.
- [ ] Enrolment into another branch or a full class fails without changing the student's existing enrolment.

## Invoice and payment checks

Use synthetic invoices: RM 100 unpaid, RM 200 awaiting proof and RM 300 to approve. No actual transfer is required for a staging test; use an obviously labelled synthetic receipt.

- [ ] Create an invoice; only linked parents receive the notice. Parents see the same HQ account for both test branches. Online checkout remains unavailable.
- [ ] Upload proof for RM 200. Invoice remains unpaid. Other-branch staff cannot open or review its private file.
- [ ] Reject proof with a reason; parent sees the reason and can submit again.
- [ ] Approve the RM 300 proof after the staging verification step: invoice becomes paid, receipt is available, and duplicate approval is rejected.
- [ ] Void the RM 100 invoice with a reason: it remains stored, becomes void, produces an audit event and one parent notice on retry.
- [ ] Paid, partial and pending-proof invoices cannot be voided.
- [ ] Reports show RM 300 recorded payment, RM 200 outstanding and exclude the void RM 100 invoice. Select dates covering these invoice due dates and the approval date. CSV agrees with screen totals.
- [ ] Test 1/30/31/60/61/90/91-day overdue boundaries. Partial invoices show an unconfirmed balance rather than an invented outstanding amount.

## Recurring billing and notifications

- [ ] Create one future recurring fee rule. Generate/review/approve a draft batch using the staging workflow. Parents cannot see drafts.
- [ ] Publish only an eligible approved batch; rerunning produces no duplicate invoice or notification. Verify actual scheduled execution separately in Cron history.
- [ ] Inbox includes system/payment notices, accurate unread counts across more than 20 messages, working pagination and own-message mark-read only.
- [ ] Dashboard setup indicators change after real account/child/class links are saved; opening a module alone does not complete a step.

## Sign-off and controlled rollout

Record tester, role, expected result, actual result and evidence for every failure. Keep payment collection closed if there is cross-branch exposure, incorrect balances, duplicate invoices or broken proof/receipt access. Fix and repeat the failed scenario before sign-off.

After staging passes, select one real branch with a small agreed parent cohort. Confirm the authorised HQ account, existing opening balances and invoice list with the finance owner before any invoice publication. Review the first billing cycle daily. Do not enable other branches until the finance owner reconciles the pilot invoices, receipts and bank transactions.

Known limits: merchant checkout, email invitations/delivery, instalments, refunds, automatic bank-statement reconciliation and historical month-end snapshots are not implemented. Operational demo reports are not official records. Do not include those features in pilot acceptance claims.

## Local regression command

`npm run test:db -- /absolute/path/to/@electric-sql/pglite/dist/index.js`

The runner executes every `supabase/tests/*.mjs` fixture and fails if any suite fails. It requires a local PGlite installation. These isolated fixtures do not prove hosted schema compatibility, actual cron execution, email delivery or browser end-to-end behaviour. Run `npm run build:portal` as the frontend build check.
