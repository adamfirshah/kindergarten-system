import { useState } from 'react'

export default function TransferBranchModal({ open, student, branches, currentBranchName, onClose, onTransfer }) {
  const [branchId, setBranchId] = useState('')

  if (!open || !student) return null

  const availableBranches = branches.filter((b) => b.id !== student.branchId)

  function handleSubmit(e) {
    e.preventDefault()
    if (!branchId) return
    onTransfer(student.id, branchId)
    setBranchId('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-[#174B2B]/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,0.18)]">
        <h2 className="text-xl font-extrabold text-[#174B2B]">Transfer Branch</h2>
        <p className="mt-1 text-sm text-[#888]">
          Move <span className="font-bold text-[#174B2B]">{student.name}</span> from{' '}
          <span className="font-bold">{currentBranchName}</span> to another branch.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#555]">New Branch</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              required
              className="w-full rounded-2xl border border-[#EBEBEB] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#638753] focus:shadow-[0_0_0_3px_rgba(23,75,43,0.25)]"
            >
              <option value="">Select branch...</option>
              {availableBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-[#EBEBEB] py-3 text-sm font-bold text-[#555] transition hover:bg-[#FAF4E7]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-full bg-[#174B2B] py-3 text-sm font-bold text-[#FAF4E7] transition hover:bg-[#2a2a2a]"
            >
              Transfer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
