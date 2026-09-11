import PaginatedBody from '../../components/ui/PaginatedBody'
import { useState, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useBranches } from '../../context/BranchContext'
import { useStudents, useStudentAccess } from '../../context/StudentContext'
import { usePermissions } from '../../hooks/usePermissions'
import { ACCESS } from '../../config/permissions'
import { ROLES } from '../../constants/roles'
import TransferBranchModal from '../../components/students/TransferBranchModal'

function StatCard({ label, value, sub }) {
  return (
    <article className="rounded-[22px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#888]">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-[#174B2B]">{value}</p>
      {sub && <p className="mt-1 text-xs text-[#AAA]">{sub}</p>}
    </article>
  )
}

function StatusBadge({ status }) {
  const active = status === 'active'
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
        active ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#F4F0E5] text-[#888]'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

export default function StudentManagement({ moduleId = 'students', onViewStudent }) {
  const { userRole } = useAuth()
  const { getAccess } = usePermissions()
  const { branches } = useBranches()
  const { transferBranch } = useStudents()

  const accessLevel = getAccess(moduleId)
  const visibleStudents = useStudentAccess(userRole, accessLevel)

  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [transferStudent, setTransferStudent] = useState(null)

  const branchMap = Object.fromEntries(branches.map((b) => [b.id, b.name]))
  const canTransfer = userRole === ROLES.superAdmin
  const isViewOnly = accessLevel === ACCESS.VIEW
  const showBranchFilter = userRole === ROLES.superAdmin

  const stats = useMemo(() => ({
    total: visibleStudents.length,
    active: visibleStudents.filter((s) => s.status === 'active').length,
    branches: new Set(visibleStudents.map((s) => s.branchId)).size,
  }), [visibleStudents])

  const filtered = visibleStudents.filter((student) => {
    const q = search.toLowerCase()
    const matchesSearch =
      student.name.toLowerCase().includes(q) ||
      student.parentName.toLowerCase().includes(q) ||
      student.className.toLowerCase().includes(q) ||
      (branchMap[student.branchId] ?? '').toLowerCase().includes(q)
    const matchesBranch = branchFilter === 'all' || student.branchId === branchFilter
    return matchesSearch && matchesBranch
  })

  const pageTitle = moduleId === 'children' ? 'My Children' : 'Student Management'
  const pageDesc = moduleId === 'children'
    ? 'View your children\'s profiles, attendance, and school details.'
    : userRole === ROLES.superAdmin
      ? 'Search and manage all students across every branch.'
      : 'Search and manage students in your scope.'

  return (
    <div className="pb-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#174B2B]">{pageTitle}</h2>
          <p className="mt-1 text-sm text-[#888]">{pageDesc}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total Students" value={stats.total} sub={`${stats.active} active`} />
        <StatCard label="Branches" value={stats.branches} sub="With enrolled students" />
        <StatCard label="Access" value={isViewOnly ? 'View Only' : 'Full'} sub="Your permission level" />
      </div>

      <section className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold text-[#174B2B]">All Students</h3>
          <div className="flex flex-wrap gap-2">
            {showBranchFilter && (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="rounded-full border border-[#EBEBEB] bg-white px-4 py-2 text-sm outline-none focus:border-[#638753]"
              >
                <option value="all">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            )}
            <input
              type="search"
              placeholder="Search student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-full border border-[#EBEBEB] px-4 py-2 text-sm outline-none focus:border-[#638753] focus:shadow-[0_0_0_3px_rgba(23,75,43,0.25)]"
            />
          </div>
        </div>

        {search && filtered.length > 0 && (
          <div className="mb-4 rounded-2xl border border-[#F2F0DF] bg-[#FFFDF5] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[#888]">Search result preview</p>
            {filtered.slice(0, 1).map((s) => (
              <div key={s.id} className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div><span className="text-[#888]">Name:</span> <span className="font-bold">{s.name}</span></div>
                <div><span className="text-[#888]">Branch:</span> <span className="font-bold">{branchMap[s.branchId]}</span></div>
                <div><span className="text-[#888]">Class:</span> <span className="font-bold">{s.className}</span></div>
                <div><span className="text-[#888]">Parent:</span> <span className="font-bold">{s.parentName}</span></div>
              </div>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#F0F0F0] text-xs font-bold uppercase tracking-wide text-[#888]">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Branch</th>
                <th className="pb-3 pr-4">Class</th>
                <th className="pb-3 pr-4">Parent</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <PaginatedBody>
              {filtered.map((student) => (
                <tr key={student.id} className="border-b border-[#FAF4E7] last:border-0">
                  <td className="py-4 pr-4">
                    <p className="font-bold text-[#174B2B]">{student.name}</p>
                    <p className="mt-0.5 text-xs text-[#AAA]">Age {student.age}</p>
                  </td>
                  <td className="py-4 pr-4 font-semibold text-[#555]">{branchMap[student.branchId] ?? '—'}</td>
                  <td className="py-4 pr-4 text-[#555]">{student.className}</td>
                  <td className="py-4 pr-4 text-[#555]">{student.parentName}</td>
                  <td className="py-4 pr-4"><StatusBadge status={student.status} /></td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onViewStudent?.(student.id)}
                        className="rounded-full bg-[#C3D3A4] px-3 py-1.5 text-xs font-bold text-[#174B2B] transition hover:bg-[#AFC58D]"
                      >
                        View Profile
                      </button>
                      {canTransfer && (
                        <button
                          type="button"
                          onClick={() => setTransferStudent(student)}
                          className="rounded-full border border-[#EBEBEB] px-3 py-1.5 text-xs font-bold text-[#555] transition hover:bg-[#F2F0DF]"
                        >
                          Transfer Branch
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </PaginatedBody>
          </table>

          {filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-[#888]">No students found.</p>
          )}
        </div>
      </section>

      <TransferBranchModal
        open={Boolean(transferStudent)}
        student={transferStudent}
        branches={branches}
        currentBranchName={transferStudent ? branchMap[transferStudent.branchId] : ''}
        onClose={() => setTransferStudent(null)}
        onTransfer={transferBranch}
      />
    </div>
  )
}
