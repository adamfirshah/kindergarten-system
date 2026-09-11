export const INITIAL_PAYMENTS = [
  { id: 'pay-1', studentId: 's1', branchId: '1', invoiceNo: 'INV-2026-0901', paymentType: 'Monthly Fee', amount: 480, dueDate: '2026-09-05', paymentDate: '2026-09-01', status: 'paid', method: 'Online Banking', referenceNo: 'FPX-810293', notes: '' },
  { id: 'pay-2', studentId: 's2', branchId: '1', invoiceNo: 'INV-2026-0902', paymentType: 'Monthly Fee', amount: 480, dueDate: '2026-09-05', paymentDate: '', status: 'pending', method: '', referenceNo: '', notes: '' },
  { id: 'pay-3', studentId: 's3', branchId: '1', invoiceNo: 'INV-2026-0903', paymentType: 'Monthly Fee', amount: 520, dueDate: '2026-09-05', paymentDate: '2026-09-02', status: 'paid', method: 'Card', referenceNo: 'CARD-55211', notes: '' },
  { id: 'pay-4', studentId: 's4', branchId: '1', invoiceNo: 'INV-2026-0904', paymentType: 'Transport', amount: 180, dueDate: '2026-08-28', paymentDate: '', status: 'overdue', method: '', referenceNo: '', notes: 'Reminder sent' },
  { id: 'pay-5', studentId: 's5', branchId: '1', invoiceNo: 'INV-2026-0905', paymentType: 'Meal Plan', amount: 150, dueDate: '2026-09-05', paymentDate: '2026-09-01', status: 'paid', method: 'Cash', referenceNo: 'RCP-1098', notes: '' },
  { id: 'pay-6', studentId: 's6', branchId: '1', invoiceNo: 'INV-2026-0906', paymentType: 'Monthly Fee', amount: 480, dueDate: '2026-09-05', paymentDate: '', status: 'partial', method: 'Online Banking', referenceNo: 'FPX-44102', notes: 'RM200 received' },
  { id: 'pay-7', studentId: 's7', branchId: '2', invoiceNo: 'INV-2026-0907', paymentType: 'Monthly Fee', amount: 500, dueDate: '2026-09-05', paymentDate: '2026-09-01', status: 'paid', method: 'Online Banking', referenceNo: 'FPX-11720', notes: '' },
  { id: 'pay-8', studentId: 's8', branchId: '2', invoiceNo: 'INV-2026-0908', paymentType: 'Monthly Fee', amount: 500, dueDate: '2026-09-05', paymentDate: '', status: 'pending', method: '', referenceNo: '', notes: '' },
  { id: 'pay-9', studentId: 's9', branchId: '2', invoiceNo: 'INV-2026-0909', paymentType: 'Registration', amount: 250, dueDate: '2026-08-30', paymentDate: '', status: 'overdue', method: '', referenceNo: '', notes: '' },
  { id: 'pay-10', studentId: 's10', branchId: '2', invoiceNo: 'INV-2026-0910', paymentType: 'Monthly Fee', amount: 500, dueDate: '2026-09-05', paymentDate: '2026-09-02', status: 'paid', method: 'Card', referenceNo: 'CARD-88491', notes: '' },
  { id: 'pay-11', studentId: 's11', branchId: '3', invoiceNo: 'INV-2026-0911', paymentType: 'Monthly Fee', amount: 450, dueDate: '2026-09-05', paymentDate: '2026-09-01', status: 'paid', method: 'Online Banking', referenceNo: 'FPX-00871', notes: '' },
  { id: 'pay-12', studentId: 's13', branchId: '3', invoiceNo: 'INV-2026-0912', paymentType: 'Monthly Fee', amount: 450, dueDate: '2026-09-05', paymentDate: '', status: 'pending', method: '', referenceNo: '', notes: '' },
]

export const INITIAL_EXPENSES = [
  { id: 'exp-1', branchId: '1', expenseType: 'Teaching Materials', description: 'Art and craft supplies', amount: 620, expenseDate: '2026-09-01', paidTo: 'Ceria Stationery', status: 'approved', notes: '' },
  { id: 'exp-2', branchId: '1', expenseType: 'Utilities', description: 'Electricity and water', amount: 890, expenseDate: '2026-08-30', paidTo: 'Utility Provider', status: 'approved', notes: '' },
  { id: 'exp-3', branchId: '1', expenseType: 'Maintenance', description: 'Air-conditioner servicing', amount: 450, expenseDate: '2026-09-02', paidTo: 'Cool Air Services', status: 'pending', notes: 'Quarterly service' },
  { id: 'exp-4', branchId: '2', expenseType: 'Teaching Materials', description: 'Reading books', amount: 780, expenseDate: '2026-09-01', paidTo: 'Ilmu Books', status: 'approved', notes: '' },
  { id: 'exp-5', branchId: '2', expenseType: 'Events', description: 'Sports day deposit', amount: 1200, expenseDate: '2026-09-02', paidTo: 'Arena Sports', status: 'pending', notes: '' },
  { id: 'exp-6', branchId: '3', expenseType: 'Maintenance', description: 'Playground safety repair', amount: 950, expenseDate: '2026-08-29', paidTo: 'SafePlay Enterprise', status: 'approved', notes: '' },
]

export const PAYMENT_STATUSES = ['paid', 'pending', 'partial', 'overdue', 'void']
export const PAYMENT_TYPES = ['Monthly Fee', 'Registration', 'Transport', 'Meal Plan', 'Activity Fee', 'Other']
export const PAYMENT_METHODS = ['Online Banking', 'Card', 'Cash', 'Cheque', 'Other']
export const EXPENSE_TYPES = ['Teaching Materials', 'Utilities', 'Maintenance', 'Events', 'Salary', 'Rent', 'Other']
