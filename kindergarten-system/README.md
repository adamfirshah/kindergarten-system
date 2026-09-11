# Kindergarten System

Monorepo npm workspaces untuk platform pengurusan tadika PAPA.

## Struktur

- `apps/landing` — website pemasaran, pricing dan registration (`:5173`)
- `apps/portal` — portal admin cawangan, guru, ibu bapa dan akauntan (`:5174`)
- `apps/admin` — entry point platform superadmin, menggunakan modul role-aware sedia ada (`:5175`)
- `packages/ui` — komponen React yang dikongsi
- `packages/types` — jenis TypeScript yang dikongsi
- `packages/utils` — fungsi utiliti yang dikongsi
- `supabase` — migrasi dan konfigurasi backend bersama

## Pembangunan

```bash
npm install
npm run dev:landing
npm run dev:portal
npm run dev:admin
```

`npm run dev` membuka portal sebagai aplikasi utama. Jalankan `npm run build` untuk membina ketiga-tiga aplikasi.

## Academic foundation

Modul `Classes` kini menggunakan hubungan academic year, term, class dan student enrolment. Migration Supabase di `supabase/migrations/002_academic_foundation.sql` memperluas jadual `classes` dan `student_classes` yang sedia ada tanpa menggantikan primary key `int4`; jalankan selepas migration `001_branch_management.sql` apabila projek Supabase aktif.

Modul `Parents` menggunakan jadual `parents` dan `student_parents` sedia ada. Migration `supabase/migrations/003_parent_module.sql` menambah pautan akaun portal, skop cawangan, pilihan komunikasi dan RLS mengikut role.

Modul `Attendance` menggunakan jadual `attendances` sedia ada. Migration `supabase/migrations/004_attendance_module.sql` menambah masa masuk/keluar, sebab ketidakhadiran, pengesahan serta RLS mengikut role tanpa mencipta jadual attendance kedua.

Modul `Finance` menggunakan jadual `payments` dan `expenses` sedia ada. Migration `supabase/migrations/005_finance_module.sql` menambah skop cawangan, nombor invois, workflow kelulusan perbelanjaan dan RLS untuk superadmin, branch admin, accountant serta paparan bayaran anak untuk parent.

Modul `Homework` menggunakan jadual `assignments` sedia ada dan menambah `assignment_submissions` untuk penghantaran setiap pelajar. Migration `supabase/migrations/006_homework_module.sql` menambah tarikh akhir, status penerbitan, maklum balas guru dan RLS mengikut role.

Modul `Announcements` menggunakan jadual `notifications` sedia ada untuk penghantaran pengguna. Migration `supabase/migrations/007_announcement_module.sql` menambah sumber announcement, penerima, read/acknowledgement tracking, replies dan RLS mengikut role.

Modul `Reports` tidak menyimpan salinan data. Migration `supabase/migrations/008_reporting_views.sql` menyediakan security-invoker views untuk ringkasan attendance, finance dan homework sambil mengekalkan skop RLS pengguna.

Modul `AI Analytics` menyediakan isyarat risiko yang boleh diterangkan untuk superadmin dan branch admin. Migration `supabase/migrations/009_ai_analytics.sql` membina security-invoker views daripada data operasi sedia ada; ia tidak memanggil model AI luaran dan tidak menyimpan prediction pendua.

Modul `Subscription` mengurus pelan platform bagi setiap cawangan dan tidak bercampur dengan yuran murid. Migration `supabase/migrations/010_subscription_module.sql` menormalkan katalog pelan, memautkannya kepada `branches.subscription`, menambah invois platform dan menguatkuasakan RLS superadmin/branch admin.

Pengurusan harga dan entitlement pelan oleh superadmin ditambah melalui `supabase/migrations/011_subscription_plan_management.sql`. Setiap perubahan pelan direkodkan dalam audit plan; jumlah historical invoice tidak diubah apabila harga pelan berubah.

Migration `supabase/migrations/012_subscription_plan_deletion.sql` membenarkan superadmin memadam plan yang belum digunakan. Plan yang masih dipautkan kepada branch atau historical invoice mesti dinyahaktifkan dan tidak boleh dipadam.

Untuk pemasangan melalui Supabase SQL Editor, jalankan keseluruhan fail migration mengikut nombor dalam projek yang sama. Selepas migration `001`–`009` berjaya, jalankan `010_subscription_module.sql`, kemudian `011_subscription_plan_management.sql`, dan akhirnya `012_subscription_plan_deletion.sql`. Pastikan setiap fail berjaya sebelum meneruskan.

Jika migration `011` memaparkan `relation "subscription_plans" does not exist`, jadual daripada migration `010` belum tersedia. Jalankan keseluruhan migration `010` dahulu, kemudian cuba semula `011`. Jangan cipta jadual kosong secara manual kerana migration `010` turut menyediakan katalog pelan, hubungan cawangan, invois dan RLS. Elakkan menjalankan semula `010` pada pemasangan yang sudah mempunyai harga pelan tersuai kerana seed migration itu mengemas kini pelan Basic, Standard dan Premium.

## Audit Logs

`013_audit_logs.sql` (selepas `001`–`012`) menambah log database dan trigger untuk branches, users, students, staff, classes, parents, attendance, payments, expenses, homework/submissions, class enrolment, announcements dan subscription plans/invoices. Superadmin boleh membaca semua log; branch admin hanya log `branch_id` yang sepadan dengan profil `users` semasanya. Role lain tiada akses. Event tanpa cawangan dan pemindahan rekod antara cawangan hanya dipaparkan kepada superadmin.

Halaman Audit Logs membaca Supabase secara terus dengan filter, pagination dan butiran event. Rekod menyimpan actor, masa, ID rekod dan nama field yang berubah, tanpa menyalin nilai sensitif. Client tidak boleh insert/update/delete log. Sejarah bermula selepas migration; tindakan demo yang hanya mengubah React state, login, dan perubahan sebelum pemasangan tidak direkodkan. Jalankan migration pada projek Supabase untuk mengaktifkan modul ini; tiada data demo ditunjukkan jika database belum tersedia.

Ujian database terasing: `node supabase/tests/audit_logs.mjs /absolute/path/to/@electric-sql/pglite/dist/index.js`.

## System Settings

Jalankan `014_system_settings.sql` selepas `013_audit_logs.sql`. Modul ini hanya untuk superadmin: nama platform/organisasi, email dan telefon sokongan, serta notis portal. Data disimpan melalui RPC Supabase dengan validation, version check untuk mengelakkan overwrite perubahan admin lain, dan audit trigger. Role lain tidak boleh membaca jadual konfigurasi atau mengubahnya; RPC paparan hanya mendedahkan maklumat portal yang diterbitkan kepada pengguna berdaftar.

Nama platform dan kontak sokongan dipaparkan di bahagian atas portal. Notis aktif dipaparkan kepada semua role. Paparan disegarkan selepas save dalam tab yang sama, apabila portal dibuka, atau apabila window mendapat focus. Tetapan MYR dan Asia/Kuala_Lumpur ialah maklumat tetap, bukan kawalan yang boleh diedit. Migration tidak mengubah harga plan, invoice atau permission role.

Ujian terasing: `node supabase/tests/system_settings.mjs /absolute/path/to/@electric-sql/pglite/dist/index.js`.

## Parent payments / school fees

Run `015_parent_payments.sql` after `014` to enable live school fee invoices in the existing `payments` table. In Finance, a branch administrator first configures the school's collection bank account; admin/finance then creates an invoice for an actual Supabase student. Parents linked through `parents.user_id` and `student_parents` can see the invoice, make a bank transfer and upload a JPG/PNG/PDF (maximum 5 MB) into a private storage bucket. Proof stays pending until branch admin/finance checks the actual bank transaction. Rejected proof can be resubmitted; approval changes the invoice to paid and creates an immutable receipt snapshot, downloadable as text.

Notifications: linked parents receive invoice notices; branch admin/finance receive verification requests; the submitting parent receives approval or rejection; other branch finance staff receive payment confirmations. The portal bell displays the most recent 50 payment notifications. Superadmin has platform-wide invoice visibility but receives no per-payment alerts by default. No email provider or online gateway is configured, so this release delivers in-app notifications and manual bank-transfer verification only. Partial legacy invoices require finance assistance rather than charging an uncertain balance. The old React Finance workspace remains explicitly labelled as a demo; it is not the live ledger.

The migration revokes direct client mutations on payments; use its validated RPCs. Private proof files cannot be overwritten or deleted by clients. Invoice/proof/account changes are audited. Run `node supabase/tests/parent_payments.mjs /absolute/path/to/@electric-sql/pglite/dist/index.js` for isolated database checks. These fixtures verify the workflow and permissions, not your live project's legacy column constraints. Apply migrations and verify with test accounts before collecting real payments.

## Recurring Billing

Apply `016_recurring_billing.sql`, then `017_recurring_billing_cron.sql` in hosted Supabase. The latter installs a named pg_cron job at 01:00 UTC (09:00 Malaysia), independent of the browser. Check its execution history in Supabase Cron; reapplying the named schedule updates that job. Migration 016 is transactional and should be applied once.

Finance → Recurring Billing: configure each student's recurring component, amount, discount, first/last billing month and active flag. From the 25th before the billing month, the worker creates private draft batches per branch/month. It catches up missing eligible months from the rule start date. Accountant reviews and adjusts drafts with reasons; adjustments reset review. A branch administrator or superadmin approves reviewed batches. The daily job publishes approved batches from the 27th and creates real payment invoices plus parent in-app notifications in one transaction. The default deadline is the 5th of the billing month. For a late batch, staff must set a deadline that is not in the past. Administrators may publish an approved batch immediately after the release date, or return an unpublished batch to review.

Missing/inactive/moved students and missing active parent links block publication until addressed or excluded. Published batches cannot be edited. Repeated runs cannot duplicate a draft for the same rule/month, invoice or parent notification. Each fee component currently produces a separate invoice. Existing manual invoices have no recurring period identifier and must be checked by staff to avoid overlap. Rule changes/pause apply to later generation; previously created drafts must be adjusted/excluded in batch review. Unpublished batches notify finance/admin at most once per daily processing date. Email and gateway activation remain separate.

Test the database workflow with `node supabase/tests/recurring_billing.mjs /absolute/path/to/@electric-sql/pglite/dist/index.js`. This validates the worker functions in an isolated PostgreSQL runtime; hosted cron installation itself requires Supabase.

## User access hardening

Apply `supabase/migrations/018_user_access_hardening.sql` after the existing migrations. User Management now reads Supabase accounts and branches and saves through `update_managed_user`. Superadmin manages roles, branch assignments and status; branch admins can edit names/status only for teachers, parents and finance accounts assigned to their own branch. Other roles can read only their own user profile. Self-demotion, self-disabling and direct client writes to users are blocked. Existing audit triggers record updates. Disabled/missing accounts resolve to role 0 in database access helpers, and the portal rejects inactive profiles on login and refresh.

This replaces the demo actions on User Management. Account invitations, password reset delivery and historical login reporting are not implemented here; their demo buttons have been removed. Other master-data demo contexts remain a separate migration task. This change does not revoke Supabase Auth sessions; policies using the active-role helpers enforce access on database requests. Apply this migration before using the new Save changes action. Re-running earlier migrations can restore old helper definitions, so keep migration order.

Test: `node supabase/tests/user_access.mjs /absolute/path/to/@electric-sql/pglite/dist/index.js`. Tests cover branch isolation, escalation attempts, direct writes, inactive users, validation and migration reruns in isolated PostgreSQL; they do not verify additional policies/RPCs installed only in the hosted project.

## Live master data (issue 2)

Apply `supabase/migrations/019_master_data.sql` after `018`. Branches, Students/My Children, Staff, Parents and Classes now use Supabase records, including real academic years, enrolments and parent/child links. Their shared contexts no longer seed demo people, branch IDs or enrolments. The active pages support search, add/edit, loading/error feedback and saved-state refresh. Superadmin can link an existing portal account to a parent/staff record using the account selector; this does not create a Supabase Auth account.

Database policies scope admin/finance student reads to their branch, teacher reads to assigned classes (`classes.teacher_staff_id` → `branch_staff.user_id`), and parent reads to active linked parent profiles. Administrators save through allowlisted RPCs. Teacher assignment and enrolment must stay within a branch; enrolment checks capacity and preserves completed enrolments. Parent links are idempotent and audited. Parents can edit their own email, phone and contact preference. Student branch transfers and moves of enrolled classes are rejected pending a dedicated reviewed transfer workflow.

Existing teachers must be linked to their portal account and assigned to a class; existing classes need an open academic year before new enrolment. Existing rows/IDs are preserved, and no demo records are inserted. Apply in order; this replaces earlier policies on master tables. Live schema constraints inherited outside these migrations still need verification in the hosted project. A failed RPC is shown in the form and does not show success.

Operational demo workflows (attendance, homework, announcements and legacy reports/finance) are not converted by this change. The next roadmap items address those separately. Test: `node supabase/tests/master_data.mjs /absolute/path/to/@electric-sql/pglite/dist/index.js`.

## Live financial reports (issue 3)

Apply `020_live_finance_reports.sql` after `019`. Reports defaults to live financial reporting for superadmin, branch admin and finance. The report RPC restricts branch scope on the server and aggregates the actual payments/expenses tables in one snapshot. Date filters are inclusive: invoiced/outstanding use due dates and current status; collections use payment_date for paid invoices; approved expenses use expense_date (not confirmed cash settlement). Partial balances and paid invoices without dates are flagged rather than guessed. Void invoices and platform subscription billing are excluded. CSV exports match the selected branch/date report and escape spreadsheet formula prefixes. This is not historical month-end balance reporting.

Other report screens remain accessible under an explicit demo label, including their old exports. They must not be used as official accounting or student assessment reports. Isolated verification: `node supabase/tests/live_finance_reports.mjs /absolute/path/to/@electric-sql/pglite/dist/index.js`.

## One HQ bank account (issue 4)

Apply `021_hq_payment_account.sql` after `020`, then sign in as superadmin and open Finance → HQ bank account. Configure the authorised bank, account holder and number once. All parents see that account on unpaid school-fee invoices, regardless of invoice branch. No old branch account is chosen automatically. Until configured, the transfer instructions and proof-upload form remain unavailable. Bank changes use version checks and are audited; only superadmin can save. The old branch account records remain stored, but their browser read/write access is retired.

Invoice ownership, branch verification permissions, notifications and existing proofs/receipts are unchanged. Merchant checkout remains inactive pending merchant setup. Test: `node supabase/tests/hq_payment_account.mjs /absolute/path/to/@electric-sql/pglite/dist/index.js`. Hosted migration and actual bank details have not been applied by this local change.

## Finance controls (issue 5)

Apply `022_finance_controls.sql` after `021`. Finance → Outstanding & aging groups current unpaid invoices into not overdue, 1–30, 31–60, 61–90 and over 90 days using Malaysia's current date. Missing due dates and legacy partial invoices are flagged separately; uncertain partial balances are not summed. Rows are paginated, while bucket totals cover the whole accessible branch scope.

Superadmin/branch admin may void an unpaid incorrect invoice from its expanded details with a required reason. Pending/approved proofs and paid/partial invoices block cancellation. The invoice remains stored, audit triggers capture changes and linked active parent accounts get a single in-app cancellation notice. This is not a refund or payment reversal workflow. Finance staff can review aging but cannot void invoices. Migration also replaces the old branch-bank prerequisite in proof submission with the HQ account prerequisite; 021 alone did not update that backend check.

Test: `node supabase/tests/finance_controls.mjs /absolute/path/to/@electric-sql/pglite/dist/index.js`. Instalments, refunds and automated bank statement matching remain separate work; no merchant transactions or parent notifications were executed against the live project during this implementation.

## Onboarding and notification inbox (issue 6)

Apply `023_onboarding_notifications.sql` after `022`. The dashboard now checks real setup prerequisites for each role (branch/HQ/admin setup, staff/class assignment or parent/child links) and provides module shortcuts. It does not mark tasks complete merely because a user clicks them. Account provisioning and invitation email delivery are not introduced by this migration.

The bell now shows all notification categories with server-side own-user scope, total unread count, pages of 20 and mark-read RPCs. It refreshes on opening, focus, manual refresh and once per minute while the tab is visible. Clients cannot insert notifications or edit message content. New or reactivated active users get one idempotent in-app welcome message; no bulk welcome backfill is sent for existing accounts. Payment events retain their existing recipient rules. Where old notifications had no timestamp column, their added timestamp reflects migration time, not a reconstructed original event time.

Test: `node supabase/tests/onboarding_notifications.mjs /absolute/path/to/@electric-sql/pglite/dist/index.js`. Live deployment and email delivery have not been performed.

## Pilot readiness (issue 7)

See `docs/PILOT_UAT.md` for staged acceptance checks and rollout conditions. Run `supabase/tests/pilot_preflight.sql` read-only in the target project's SQL editor before role-based UAT. No new migration is required for this step. `npm run test:db -- /absolute/path/to/@electric-sql/pglite/dist/index.js` runs all ten isolated database suites. On 2026-09-10 all ten passed and the portal production build passed; hosted preflight, browser UAT and real pilot sign-off remain pending.

## Legacy parent schema repair and pagination

Apply `024_schema_repair_pagination.sql` after 023, then refresh the portal. It adds missing parent compatibility fields (including `parents.status`, referenced by `master_visible`) without removing role checks or overwriting existing statuses. It also changes aging/inbox RPC pages to ten records; deploy it with the matching UI to keep offsets aligned. Audit and invoice pages use ten records, and local tables/master record lists paginate ten visible records while retaining full-data totals and exports. Internal batched reads used by summaries/lookups are not truncated to ten.

Master-data fetches retain successful table results when a different table fails. The affected module still shows its error; related form choices may be unavailable until repaired. The regression fixture reproduces the missing `p.status` error and verifies the repair, access scope, reruns and 23-record pagination with no duplicates or omissions: `supabase/tests/schema_repair_pagination.mjs`.

## Vercel deployment

See [docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md) for the three-project setup, repository root paths, environment variables and current role-routing limitations.
