import { useState } from 'react'
import { EXPENSE_TYPES, PAYMENT_METHODS, PAYMENT_STATUSES, PAYMENT_TYPES } from '../../data/financeDetails'

const TODAY = '2026-09-02'

export default function FinanceEntryModal({ type, open, students, branches, defaultBranchId, onClose, onSave }) {
  const isPayment = type === 'payment'
  const [form, setForm] = useState(isPayment
    ? { studentId: students[0]?.id ?? '', invoiceNo: '', paymentType: 'Monthly Fee', amount: '', dueDate: TODAY, paymentDate: TODAY, status: 'paid', method: 'Online Banking', referenceNo: '', notes: '' }
    : { branchId: defaultBranchId || branches[0]?.id || '', expenseType: 'Teaching Materials', description: '', amount: '', expenseDate: TODAY, paidTo: '', notes: '' })

  if (!open) return null

  function setField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (isPayment) {
      const student = students.find((item) => item.id === form.studentId)
      onSave({ ...form, amount: Number(form.amount), branchId: student?.branchId })
    } else {
      onSave({ ...form, amount: Number(form.amount) })
    }
    onClose()
  }

  const fieldClass = 'mt-1.5 w-full rounded-2xl border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#638753]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/45 p-4" role="dialog" aria-modal="true">
      <form onSubmit={handleSubmit} className="my-auto w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-extrabold text-[#174B2B]">{isPayment ? 'Record Payment' : 'Add Expense'}</h3><p className="mt-1 text-sm text-[#888]">{isPayment ? 'Record a received or outstanding student fee.' : 'Expense will be submitted as pending approval.'}</p></div><button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F0E5] text-lg text-[#666]">×</button></div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {isPayment ? <>
            <label className="text-sm font-bold text-[#444]">Student<select required value={form.studentId} onChange={(event) => setField('studentId', event.target.value)} className={fieldClass}><option value="">Select student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.className}</option>)}</select></label>
            <label className="text-sm font-bold text-[#444]">Invoice No.<input value={form.invoiceNo} onChange={(event) => setField('invoiceNo', event.target.value)} placeholder="Auto-generated if blank" className={fieldClass} /></label>
            <label className="text-sm font-bold text-[#444]">Payment Type<select value={form.paymentType} onChange={(event) => setField('paymentType', event.target.value)} className={fieldClass}>{PAYMENT_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-sm font-bold text-[#444]">Amount (RM)<input required min="0.01" step="0.01" type="number" value={form.amount} onChange={(event) => setField('amount', event.target.value)} className={fieldClass} /></label>
            <label className="text-sm font-bold text-[#444]">Due Date<input required type="date" value={form.dueDate} onChange={(event) => setField('dueDate', event.target.value)} className={fieldClass} /></label>
            <label className="text-sm font-bold text-[#444]">Status<select value={form.status} onChange={(event) => setField('status', event.target.value)} className={fieldClass}>{PAYMENT_STATUSES.filter((item) => item !== 'void').map((item) => <option key={item} value={item}>{item.charAt(0).toUpperCase() + item.slice(1)}</option>)}</select></label>
            <label className="text-sm font-bold text-[#444]">Payment Method<select value={form.method} onChange={(event) => setField('method', event.target.value)} className={fieldClass}>{PAYMENT_METHODS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-sm font-bold text-[#444]">Reference No.<input value={form.referenceNo} onChange={(event) => setField('referenceNo', event.target.value)} className={fieldClass} /></label>
          </> : <>
            {branches.length > 1 && <label className="text-sm font-bold text-[#444]">Branch<select required value={form.branchId} onChange={(event) => setField('branchId', event.target.value)} className={fieldClass}>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>}
            <label className="text-sm font-bold text-[#444]">Expense Type<select value={form.expenseType} onChange={(event) => setField('expenseType', event.target.value)} className={fieldClass}>{EXPENSE_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-sm font-bold text-[#444] sm:col-span-2">Description<input required value={form.description} onChange={(event) => setField('description', event.target.value)} className={fieldClass} /></label>
            <label className="text-sm font-bold text-[#444]">Amount (RM)<input required min="0.01" step="0.01" type="number" value={form.amount} onChange={(event) => setField('amount', event.target.value)} className={fieldClass} /></label>
            <label className="text-sm font-bold text-[#444]">Expense Date<input required type="date" value={form.expenseDate} onChange={(event) => setField('expenseDate', event.target.value)} className={fieldClass} /></label>
            <label className="text-sm font-bold text-[#444] sm:col-span-2">Paid To<input required value={form.paidTo} onChange={(event) => setField('paidTo', event.target.value)} className={fieldClass} /></label>
          </>}
          <label className="text-sm font-bold text-[#444] sm:col-span-2">Notes<textarea rows={3} value={form.notes} onChange={(event) => setField('notes', event.target.value)} className={fieldClass} /></label>
        </div>

        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-full border border-[#E5E5E5] px-5 py-2.5 text-sm font-bold text-[#555]">Cancel</button><button type="submit" className="rounded-full bg-[#C3D3A4] px-5 py-2.5 text-sm font-bold text-[#174B2B]">{isPayment ? 'Save Payment' : 'Submit Expense'}</button></div>
      </form>
    </div>
  )
}
