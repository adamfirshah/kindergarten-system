import { useState } from 'react'

export default function EnrolStudentModal({ open, classRecord, students, enrolledCount, onClose, onEnrol }) {
  const [studentId, setStudentId] = useState('')
  if (!open || !classRecord) return null

  const candidates = students.filter(
    (student) => student.branchId === classRecord.branchId && student.className !== classRecord.name,
  )
  const full = enrolledCount >= classRecord.capacity

  function handleSubmit(event) {
    event.preventDefault()
    if (!studentId || full) return
    onEnrol(studentId, classRecord.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close modal" className="absolute inset-0 bg-[#174B2B]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-[28px] bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,0.18)]">
        <h2 className="text-xl font-extrabold text-[#174B2B]">Enrol Student</h2>
        <p className="mt-1 text-sm text-[#888]">Move a student into {classRecord.name}. Their current class placement will be updated.</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block text-xs font-semibold text-[#555]">
            <span className="mb-1.5 block">Student</span>
            <select value={studentId} onChange={(event) => setStudentId(event.target.value)} required className="w-full rounded-2xl border border-[#EBEBEB] bg-white px-4 py-3 text-sm outline-none focus:border-[#638753]">
              <option value="">Select a student</option>
              {candidates.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.className}</option>)}
            </select>
          </label>

          <div className={`rounded-2xl p-4 text-sm ${full ? 'bg-[#FFEBEE] text-[#C62828]' : 'bg-[#F2F0DF] text-[#555]'}`}>
            {full ? 'This class is already at capacity.' : `${enrolledCount} of ${classRecord.capacity} places are currently filled.`}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-full border border-[#EBEBEB] py-3 text-sm font-bold text-[#555]">Cancel</button>
            <button type="submit" disabled={full || !studentId} className="flex-1 rounded-full bg-[#174B2B] py-3 text-sm font-bold text-[#FAF4E7] disabled:cursor-not-allowed disabled:opacity-40">Confirm Enrolment</button>
          </div>
        </form>
      </div>
    </div>
  )
}
