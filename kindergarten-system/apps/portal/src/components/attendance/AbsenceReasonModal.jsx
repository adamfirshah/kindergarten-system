import { useState } from 'react'

export default function AbsenceReasonModal({ open, record, student, onClose, onSubmit }) {
  const [reason, setReason] = useState(record?.absenceReason ?? '')

  if (!open || !record) return null

  function handleSubmit(event) {
    event.preventDefault()
    const value = reason.trim()
    if (!value) return
    onSubmit(record.id, value)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="absence-reason-title">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="absence-reason-title" className="text-xl font-extrabold text-[#174B2B]">Absence Reason</h3>
            <p className="mt-1 text-sm text-[#888]">{student?.name ?? 'Child'} · {record.date}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F0E5] text-lg text-[#666]" aria-label="Close">×</button>
        </div>

        <label className="mt-6 block text-sm font-bold text-[#333]" htmlFor="absence-reason">Reason or supporting note</label>
        <textarea
          id="absence-reason"
          rows={5}
          maxLength={500}
          required
          autoFocus
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Example: Medical appointment. A medical certificate will be provided."
          className="mt-2 w-full resize-none rounded-2xl border border-[#E5E5E5] px-4 py-3 text-sm outline-none focus:border-[#638753] focus:ring-4 focus:ring-[#638753]/15"
        />
        <p className="mt-2 text-xs text-[#999]">The school can review this note. It does not automatically change the attendance status.</p>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-[#E5E5E5] px-5 py-2.5 text-sm font-bold text-[#555]">Cancel</button>
          <button type="submit" className="rounded-full bg-[#C3D3A4] px-5 py-2.5 text-sm font-bold text-[#174B2B]">Submit Reason</button>
        </div>
      </form>
    </div>
  )
}
