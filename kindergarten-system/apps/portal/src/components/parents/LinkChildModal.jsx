import { useState } from 'react'

export default function LinkChildModal({ open, parent, students, linkedStudentIds, onClose, onLink }) {
  const [studentId, setStudentId] = useState('')
  const [relationship, setRelationship] = useState('Parent')
  const [isPrimary, setIsPrimary] = useState(true)
  if (!open || !parent) return null

  const candidates = students.filter((student) => student.branchId === parent.branchId && !linkedStudentIds.has(student.id))

  function handleSubmit(event) {
    event.preventDefault()
    if (!studentId) return
    onLink(parent.id, studentId, relationship, isPrimary)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close modal" className="absolute inset-0 bg-[#174B2B]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-[28px] bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,0.18)]">
        <h2 className="text-xl font-extrabold text-[#174B2B]">Link Child</h2>
        <p className="mt-1 text-sm text-[#888]">Connect a student record to {parent.name}.</p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block text-xs font-semibold text-[#555]"><span className="mb-1.5 block">Student</span><select value={studentId} onChange={(event) => setStudentId(event.target.value)} required className="w-full rounded-2xl border border-[#EBEBEB] bg-white px-4 py-3 text-sm"><option value="">Select student</option>{candidates.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.className}</option>)}</select></label>
          <label className="block text-xs font-semibold text-[#555]"><span className="mb-1.5 block">Relationship</span><select value={relationship} onChange={(event) => setRelationship(event.target.value)} className="w-full rounded-2xl border border-[#EBEBEB] bg-white px-4 py-3 text-sm"><option>Mother</option><option>Father</option><option>Guardian</option><option>Parent</option></select></label>
          <label className="flex items-center gap-3 rounded-2xl bg-[#F2F0DF] p-4 text-sm font-semibold text-[#555]"><input type="checkbox" checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} />Set as primary contact</label>
          <div className="flex gap-3"><button type="button" onClick={onClose} className="flex-1 rounded-full border border-[#EBEBEB] py-3 text-sm font-bold text-[#555]">Cancel</button><button type="submit" disabled={!studentId} className="flex-1 rounded-full bg-[#174B2B] py-3 text-sm font-bold text-[#FAF4E7] disabled:opacity-40">Link Child</button></div>
        </form>
      </div>
    </div>
  )
}
