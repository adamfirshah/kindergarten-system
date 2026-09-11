import PaginatedBody from '../../components/ui/PaginatedBody'
import { useState, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useBranches } from '../../context/BranchContext'
import { useStaffAccess } from '../../context/StaffContext'
import { usePermissions } from '../../hooks/usePermissions'
import { ROLES } from '../../constants/roles'
import { STAFF_ROLE_LABELS } from '../../data/staffDetails'

function StatCard({ label, value, sub }) {
  return (
    <article className="rounded-[22px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#888]">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-[#174B2B]">{value}</p>
      {sub && <p className="mt-1 text-xs text-[#AAA]">{sub}</p>}
    </article>
  )
}

function PositionBadge({ position }) {
  const styles = {
    branch_admin: 'bg-[#174B2B] text-[#FAF4E7]',
    teacher: 'bg-[#F2F0DF] text-[#174B2B]',
    finance: 'bg-[#E3F2FD] text-[#1565C0]',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${styles[position] ?? 'bg-[#F0F0F0] text-[#666]'}`}>
      {STAFF_ROLE_LABELS[position] ?? position}
    </span>
  )
}

export default function StaffManagement() {
  const { userRole } = useAuth()
  const { getAccess } = usePermissions()
  const { branches } = useBranches()
  const accessLevel = getAccess('staff')
  const visibleStaff = useStaffAccess(userRole, accessLevel)

  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [positionFilter, setPositionFilter] = useState('all')

  const isSuperAdmin = userRole === ROLES.superAdmin
  const isBranchAdmin = userRole === ROLES.admin
  const branchMap = Object.fromEntries(branches.map((b) => [b.id, b.name]))

  const pageTitle = isBranchAdmin ? 'Teacher Management' : 'Staff Management'
  const pageDesc = isSuperAdmin
    ? 'Manage all staff — teachers, branch admins, and finance — across every branch.'
    : isBranchAdmin
      ? 'Manage teachers in your branch.'
      : 'View staff in your scope.'

  const stats = useMemo(() => ({
    total: visibleStaff.length,
    teachers: visibleStaff.filter((s) => s.position === 'teacher').length,
    others: visibleStaff.filter((s) => s.position !== 'teacher').length,
  }), [visibleStaff])

  const filtered = visibleStaff.filter((member) => {
    const q = search.toLowerCase()
    const matchesSearch =
      member.name.toLowerCase().includes(q) ||
      member.email.toLowerCase().includes(q) ||
      (branchMap[member.branchId] ?? '').toLowerCase().includes(q)
    const matchesBranch = branchFilter === 'all' || member.branchId === branchFilter
    const matchesPosition = positionFilter === 'all' || member.position === positionFilter
    return matchesSearch && matchesBranch && matchesPosition
  })

  return (
    <div className="pb-2">
      <div>
        <h2 className="text-2xl font-extrabold text-[#174B2B]">{pageTitle}</h2>
        <p className="mt-1 text-sm text-[#888]">{pageDesc}</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label={isBranchAdmin ? 'Teachers' : 'Total Staff'} value={stats.total} />
        {isSuperAdmin && (
          <>
            <StatCard label="Teachers" value={stats.teachers} />
            <StatCard label="Admin & Finance" value={stats.others} sub="Branch admins + finance" />
          </>
        )}
        {isBranchAdmin && (
          <StatCard label="Access" value="Teachers Only" sub="Your branch scope" />
        )}
      </div>

      <section className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold text-[#174B2B]">
            {isBranchAdmin ? 'Teachers' : 'All Staff'}
          </h3>
          <div className="flex flex-wrap gap-2">
            {isSuperAdmin && (
              <>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="rounded-full border border-[#EBEBEB] bg-white px-4 py-2 text-sm outline-none focus:border-[#638753]"
                >
                  <option value="all">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <select
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  className="rounded-full border border-[#EBEBEB] bg-white px-4 py-2 text-sm outline-none focus:border-[#638753]"
                >
                  <option value="all">All Positions</option>
                  <option value="branch_admin">Branch Admin</option>
                  <option value="teacher">Teacher</option>
                  <option value="finance">Finance</option>
                </select>
              </>
            )}
            <input
              type="search"
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-full border border-[#EBEBEB] px-4 py-2 text-sm outline-none focus:border-[#638753] focus:shadow-[0_0_0_3px_rgba(23,75,43,0.25)]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#F0F0F0] text-xs font-bold uppercase tracking-wide text-[#888]">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Branch</th>
                {isSuperAdmin && <th className="pb-3 pr-4">Position</th>}
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3">Phone</th>
              </tr>
            </thead>
            <PaginatedBody>
              {filtered.map((member) => (
                <tr key={member.id} className="border-b border-[#FAF4E7] last:border-0">
                  <td className="py-4 pr-4 font-bold text-[#174B2B]">{member.name}</td>
                  <td className="py-4 pr-4 text-[#555]">{branchMap[member.branchId] ?? '—'}</td>
                  {isSuperAdmin && (
                    <td className="py-4 pr-4">
                      <PositionBadge position={member.position} />
                    </td>
                  )}
                  <td className="py-4 pr-4 text-[#555]">{member.email}</td>
                  <td className="py-4 text-[#555]">{member.phone}</td>
                </tr>
              ))}
            </PaginatedBody>
          </table>

          {filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-[#888]">No staff found.</p>
          )}
        </div>
      </section>
    </div>
  )
}
