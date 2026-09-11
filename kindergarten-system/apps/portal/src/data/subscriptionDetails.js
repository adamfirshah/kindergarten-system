export const INITIAL_SUBSCRIPTION_INVOICES = [
  { id: 'sub-inv-1', branchId: '1', invoiceNo: 'SUB-2026-0901', plan: 'Premium', billingPeriod: 'Sep 2026', amount: 1200, dueDate: '2026-09-07', status: 'paid', paidAt: '2026-09-01' },
  { id: 'sub-inv-2', branchId: '2', invoiceNo: 'SUB-2026-0902', plan: 'Standard', billingPeriod: 'Sep 2026', amount: 800, dueDate: '2026-09-07', status: 'pending', paidAt: '' },
  { id: 'sub-inv-3', branchId: '3', invoiceNo: 'SUB-2026-0903', plan: 'Basic', billingPeriod: 'Sep 2026', amount: 400, dueDate: '2026-09-01', status: 'overdue', paidAt: '' },
  { id: 'sub-inv-4', branchId: '1', invoiceNo: 'SUB-2026-0801', plan: 'Premium', billingPeriod: 'Aug 2026', amount: 1200, dueDate: '2026-08-07', status: 'paid', paidAt: '2026-08-02' },
  { id: 'sub-inv-5', branchId: '2', invoiceNo: 'SUB-2026-0802', plan: 'Standard', billingPeriod: 'Aug 2026', amount: 800, dueDate: '2026-08-07', status: 'paid', paidAt: '2026-08-05' },
]

export const SUBSCRIPTION_STATUSES = ['active', 'past_due', 'cancelled']
