import PaginatedBody from '../../components/ui/PaginatedBody'
import SchoolPayments from '../payments/SchoolPayments'
import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useBranches } from '../../context/BranchContext'
import { useFinance } from '../../context/FinanceContextStore.js'
import { useStudents } from '../../context/StudentContext'
import { ROLES } from '../../constants/roles'
import { MOCK_BRANCH_ADMIN_BRANCH_ID } from '../../constants/scope'
import { PAYMENT_STATUSES } from '../../data/financeDetails'
import FinanceEntryModal from '../../components/finance/FinanceEntryModal'

const MOCK_ACCOUNTANT_BRANCH_ID = '1'

const STATUS_STYLE = {
  paid: 'bg-[#E8F5E9] text-[#2E7D32]',
  approved: 'bg-[#E8F5E9] text-[#2E7D32]',
  pending: 'bg-[#FFF8E1] text-[#9A6700]',
  partial: 'bg-[#E3F2FD] text-[#1565C0]',
  overdue: 'bg-[#FFEBEE] text-[#C62828]',
  rejected: 'bg-[#FFEBEE] text-[#C62828]',
  void: 'bg-[#F4F0E5] text-[#777]',
}

function money(value) {
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(value)
}

function label(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function StatusBadge({ status }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[status] ?? STATUS_STYLE.void}`}>{label(status)}</span>
}

function StatCard({ title, value, note, tone = 'dark' }) {
  return (
    <article className={`rounded-[22px] p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)] ${tone === 'yellow' ? 'bg-[#C3D3A4]' : 'bg-white'}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${tone === 'yellow' ? 'text-[#174B2B]/60' : 'text-[#888]'}`}>{title}</p>
      <p className="mt-1 text-2xl font-extrabold text-[#174B2B]">{value}</p>
      {note && <p className={`mt-1 text-xs ${tone === 'yellow' ? 'text-[#174B2B]/55' : 'text-[#AAA]'}`}>{note}</p>}
    </article>
  )
}

function downloadCsv(headers, rows, filename) {
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function FinanceManagement() {
  const [workspace, setWorkspace] = useState('live')
  return <div><div className="mb-5 flex flex-wrap gap-2"><button type="button" onClick={() => setWorkspace('live')} className="rounded-full border bg-white px-4 py-2 text-sm font-bold">School fees · live database</button><button type="button" onClick={() => setWorkspace('demo')} className="rounded-full border bg-white px-4 py-2 text-sm font-bold">Legacy finance demo</button></div>{workspace === 'live' ? <SchoolPayments /> : <><p className="mb-4 rounded-2xl bg-[#F2F0DF] p-4 text-sm">Demo workspace only. These payments and expenses are not connected to bank-transfer verification or the live database.</p><LegacyFinanceManagement /></>}</div>
}

function LegacyFinanceManagement() {
  const { userRole } = useAuth()
  const { branches } = useBranches()
  const { students } = useStudents()
  const { payments, expenses, addPayment, updatePaymentStatus, addExpense, reviewExpense } = useFinance()
  const [activeTab, setActiveTab] = useState('payments')
  const [branchFilter, setBranchFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [entryType, setEntryType] = useState(null)

  const isSuperAdmin = userRole === ROLES.superAdmin
  const isBranchAdmin = userRole === ROLES.admin
  const isAccountant = userRole === ROLES.accountant
  const scopeBranchId = isSuperAdmin ? null : isBranchAdmin ? MOCK_BRANCH_ADMIN_BRANCH_ID : MOCK_ACCOUNTANT_BRANCH_ID
  const canReviewExpenses = isSuperAdmin || isBranchAdmin
  const branchMap = Object.fromEntries(branches.map((branch) => [branch.id, branch.name]))
  const studentMap = Object.fromEntries(students.map((student) => [student.id, student]))

  const scopedPayments = useMemo(() => payments.filter((payment) => {
    if (scopeBranchId && payment.branchId !== scopeBranchId) return false
    if (isSuperAdmin && branchFilter !== 'all' && payment.branchId !== branchFilter) return false
    return true
  }), [payments, scopeBranchId, isSuperAdmin, branchFilter])

  const scopedExpenses = useMemo(() => expenses.filter((expense) => {
    if (scopeBranchId && expense.branchId !== scopeBranchId) return false
    if (isSuperAdmin && branchFilter !== 'all' && expense.branchId !== branchFilter) return false
    return true
  }), [expenses, scopeBranchId, isSuperAdmin, branchFilter])

  const filteredPayments = scopedPayments.filter((payment) => {
    const student = studentMap[payment.studentId]
    const matchesSearch = [student?.name, payment.invoiceNo, payment.paymentType, payment.referenceNo].some((value) => String(value ?? '').toLowerCase().includes(search.toLowerCase()))
    return matchesSearch && (statusFilter === 'all' || payment.status === statusFilter)
  })

  const filteredExpenses = scopedExpenses.filter((expense) => {
    const matchesSearch = [expense.description, expense.expenseType, expense.paidTo].some((value) => String(value ?? '').toLowerCase().includes(search.toLowerCase()))
    return matchesSearch && (statusFilter === 'all' || expense.status === statusFilter)
  })

  const collected = scopedPayments.filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + payment.amount, 0)
  const outstanding = scopedPayments.filter((payment) => ['pending', 'partial', 'overdue'].includes(payment.status)).reduce((sum, payment) => sum + payment.amount, 0)
  const approvedExpenses = scopedExpenses.filter((expense) => expense.status === 'approved').reduce((sum, expense) => sum + expense.amount, 0)
  const pendingExpenses = scopedExpenses.filter((expense) => expense.status === 'pending').length
  const availableBranches = isSuperAdmin ? branches : branches.filter((branch) => branch.id === scopeBranchId)
  const availableStudents = students.filter((student) => !scopeBranchId || student.branchId === scopeBranchId).filter((student) => isSuperAdmin && branchFilter !== 'all' ? student.branchId === branchFilter : true)

  function exportCurrentView() {
    if (activeTab === 'payments') {
      downloadCsv(
        ['Invoice', 'Student', 'Branch', 'Type', 'Amount', 'Due Date', 'Payment Date', 'Status', 'Method', 'Reference'],
        filteredPayments.map((payment) => [payment.invoiceNo, studentMap[payment.studentId]?.name, branchMap[payment.branchId], payment.paymentType, payment.amount, payment.dueDate, payment.paymentDate, payment.status, payment.method, payment.referenceNo]),
        'finance-payments.csv',
      )
      return
    }
    downloadCsv(
      ['Date', 'Branch', 'Type', 'Description', 'Paid To', 'Amount', 'Status', 'Notes'],
      filteredExpenses.map((expense) => [expense.expenseDate, branchMap[expense.branchId], expense.expenseType, expense.description, expense.paidTo, expense.amount, expense.status, expense.notes]),
      'finance-expenses.csv',
    )
  }

  const heading = isSuperAdmin ? 'Platform Finance' : isAccountant ? 'Finance Operations' : 'Branch Finance'
  const description = isSuperAdmin
    ? 'Monitor collections, outstanding fees and expenses across all branches.'
    : isAccountant
      ? 'Record branch payments and submit expenses for administrator approval.'
      : 'Monitor branch finances, record payments and review submitted expenses.'

  return (
    <div className="pb-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-2xl font-extrabold text-[#174B2B]">{heading}</h2><p className="mt-1 text-sm text-[#888]">{description}</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={exportCurrentView} className="rounded-full border border-[#E5E5E5] bg-white px-5 py-2.5 text-sm font-bold text-[#555]">Export CSV</button><button type="button" onClick={() => setEntryType('expense')} className="rounded-full border border-[#E5E5E5] bg-white px-5 py-2.5 text-sm font-bold text-[#555]">+ Expense</button><button type="button" onClick={() => setEntryType('payment')} className="rounded-full bg-[#C3D3A4] px-5 py-2.5 text-sm font-bold text-[#174B2B]">+ Record Payment</button></div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Collected" value={money(collected)} note={`${scopedPayments.filter((payment) => payment.status === 'paid').length} completed payments`} tone="yellow" />
        <StatCard title="Outstanding" value={money(outstanding)} note={`${scopedPayments.filter((payment) => ['pending', 'partial', 'overdue'].includes(payment.status)).length} open items`} />
        <StatCard title="Approved Expenses" value={money(approvedExpenses)} note={`${pendingExpenses} waiting approval`} />
        <StatCard title="Net Cash Position" value={money(collected - approvedExpenses)} note="Collected minus approved expenses" />
      </div>

      <section className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F0F0F0] pb-4">
          <div className="flex rounded-full bg-[#F4F0E5] p-1"><button type="button" onClick={() => { setActiveTab('payments'); setStatusFilter('all') }} className={`rounded-full px-4 py-2 text-sm font-bold ${activeTab === 'payments' ? 'bg-[#174B2B] text-[#FAF4E7]' : 'text-[#777]'}`}>Payments ({scopedPayments.length})</button><button type="button" onClick={() => { setActiveTab('expenses'); setStatusFilter('all') }} className={`rounded-full px-4 py-2 text-sm font-bold ${activeTab === 'expenses' ? 'bg-[#174B2B] text-[#FAF4E7]' : 'text-[#777]'}`}>Expenses ({scopedExpenses.length})</button></div>
          <div className="flex flex-wrap gap-2">{isSuperAdmin && <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} className="rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm"><option value="all">All Branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>}<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm"><option value="all">All Statuses</option>{(activeTab === 'payments' ? PAYMENT_STATUSES : ['approved', 'pending', 'rejected']).map((status) => <option key={status} value={status}>{label(status)}</option>)}</select><input type="search" placeholder={`Search ${activeTab}...`} value={search} onChange={(event) => setSearch(event.target.value)} className="rounded-full border border-[#E5E5E5] px-4 py-2 text-sm outline-none focus:border-[#638753]" /></div>
        </div>

        {activeTab === 'payments' ? <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead><tr className="border-b border-[#F0F0F0] text-xs font-bold uppercase tracking-wide text-[#888]"><th className="py-4 pr-4">Invoice / Student</th>{isSuperAdmin && <th className="py-4 pr-4">Branch</th>}<th className="py-4 pr-4">Type</th><th className="py-4 pr-4">Due</th><th className="py-4 pr-4">Amount</th><th className="py-4 pr-4">Method / Reference</th><th className="py-4">Status</th></tr></thead><PaginatedBody>{filteredPayments.map((payment) => <tr key={payment.id} className="border-b border-[#FAF4E7] last:border-0"><td className="py-4 pr-4"><p className="font-bold text-[#174B2B]">{payment.invoiceNo}</p><p className="mt-0.5 text-xs text-[#888]">{studentMap[payment.studentId]?.name ?? 'Unknown student'}</p></td>{isSuperAdmin && <td className="py-4 pr-4 text-[#555]">{branchMap[payment.branchId]}</td>}<td className="py-4 pr-4 text-[#555]">{payment.paymentType}</td><td className="py-4 pr-4"><p className="text-[#555]">{payment.dueDate}</p>{payment.paymentDate && <p className="text-xs text-[#AAA]">Paid {payment.paymentDate}</p>}</td><td className="py-4 pr-4 font-bold text-[#174B2B]">{money(payment.amount)}</td><td className="py-4 pr-4"><p className="text-[#555]">{payment.method || '—'}</p><p className="text-xs text-[#AAA]">{payment.referenceNo || payment.notes || ''}</p></td><td className="py-4"><select aria-label={`Payment status for ${payment.invoiceNo}`} value={payment.status} onChange={(event) => updatePaymentStatus(payment.id, event.target.value)} className={`rounded-full border-0 px-3 py-1.5 text-xs font-bold outline-none ${STATUS_STYLE[payment.status]}`}>{PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></td></tr>)}</PaginatedBody></table>{filteredPayments.length === 0 && <p className="py-10 text-center text-sm text-[#888]">No payments found.</p>}</div>
          : <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm"><thead><tr className="border-b border-[#F0F0F0] text-xs font-bold uppercase tracking-wide text-[#888]"><th className="py-4 pr-4">Date / Type</th>{isSuperAdmin && <th className="py-4 pr-4">Branch</th>}<th className="py-4 pr-4">Description</th><th className="py-4 pr-4">Paid To</th><th className="py-4 pr-4">Amount</th><th className="py-4 pr-4">Status</th><th className="py-4">Review</th></tr></thead><PaginatedBody>{filteredExpenses.map((expense) => <tr key={expense.id} className="border-b border-[#FAF4E7] last:border-0"><td className="py-4 pr-4"><p className="font-bold text-[#174B2B]">{expense.expenseDate}</p><p className="mt-0.5 text-xs text-[#888]">{expense.expenseType}</p></td>{isSuperAdmin && <td className="py-4 pr-4 text-[#555]">{branchMap[expense.branchId]}</td>}<td className="py-4 pr-4"><p className="font-semibold text-[#333]">{expense.description}</p><p className="text-xs text-[#AAA]">{expense.notes}</p></td><td className="py-4 pr-4 text-[#555]">{expense.paidTo}</td><td className="py-4 pr-4 font-bold text-[#174B2B]">{money(expense.amount)}</td><td className="py-4 pr-4"><StatusBadge status={expense.status} /></td><td className="py-4">{canReviewExpenses && expense.status === 'pending' ? <div className="flex gap-2"><button type="button" onClick={() => reviewExpense(expense.id, 'approved')} className="rounded-full bg-[#E8F5E9] px-3 py-1.5 text-xs font-bold text-[#2E7D32]">Approve</button><button type="button" onClick={() => reviewExpense(expense.id, 'rejected')} className="rounded-full bg-[#FFEBEE] px-3 py-1.5 text-xs font-bold text-[#C62828]">Reject</button></div> : <span className="text-xs text-[#AAA]">{isAccountant && expense.status === 'pending' ? 'Awaiting admin' : '—'}</span>}</td></tr>)}</PaginatedBody></table>{filteredExpenses.length === 0 && <p className="py-10 text-center text-sm text-[#888]">No expenses found.</p>}</div>}
      </section>

      <FinanceEntryModal key={`${entryType ?? 'none'}-${branchFilter}`} type={entryType} open={Boolean(entryType)} students={availableStudents} branches={availableBranches} defaultBranchId={scopeBranchId || (branchFilter !== 'all' ? branchFilter : '')} onClose={() => setEntryType(null)} onSave={entryType === 'payment' ? addPayment : addExpense} />
    </div>
  )
}
