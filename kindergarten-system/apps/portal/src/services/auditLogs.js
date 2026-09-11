export const AUDIT_MODULES = {
  recurring_fees: 'Recurring fees', billing_batches: 'Billing batches', billing_drafts: 'Billing drafts',
  payment_proofs: 'Payment verification', branch_payment_accounts: 'Branch bank accounts',
  system_settings: 'System Settings',
  branches: 'Branches', users: 'Users', students: 'Students', branch_staff: 'Staff',
  classes: 'Classes', parents: 'Parents', attendances: 'Attendance', payments: 'Payments',
  expenses: 'Expenses', assignments: 'Homework', assignment_submissions: 'Submissions',
  student_classes: 'Class enrolment', announcements: 'Announcements',
  subscription_plans: 'Subscription plans', subscription_invoices: 'Subscription invoices',
}
export const AUDIT_ACTIONS = { INSERT: 'Created', UPDATE: 'Updated', DELETE: 'Deleted' }
export const PAGE_SIZE = 10

export async function fetchAuditLogs(client, filters, page) {
  let query = client.from('audit_logs').select('*', { count: 'exact' })
    .order('occurred_at', { ascending: false }).order('id', { ascending: false })
  if (filters.module) query = query.eq('module', filters.module)
  if (filters.action) query = query.eq('action', filters.action)
  if (filters.branch) query = query.eq('branch_id', filters.branch)
  if (filters.from) query = query.gte('occurred_at', new Date(`${filters.from}T00:00:00+08:00`).toISOString())
  if (filters.to) {
    const end = new Date(`${filters.to}T00:00:00+08:00`)
    end.setUTCDate(end.getUTCDate() + 1)
    query = query.lt('occurred_at', end.toISOString())
  }
  // RLS is the authority for branch scope. Never use demo branch IDs here.
  const { data, count, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
  if (error) throw error
  return { rows: data ?? [], total: count ?? 0 }
}
