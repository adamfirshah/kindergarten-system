import PaginatedBody from '../../components/ui/PaginatedBody'
import { useState, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useBranches } from '../../context/BranchContext'
import BranchFormModal from '../../components/branches/BranchFormModal'
import { usePermissions } from '../../hooks/usePermissions'
import { ROLES } from '../../constants/roles'
import { ACCESS } from '../../config/permissions'
import { MOCK_BRANCH_ADMIN_BRANCH_ID } from '../../constants/scope'

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

function SubscriptionBadge({ plan }) {
  const styles = {
    Premium: 'bg-[#174B2B] text-[#FAF4E7]',
    Standard: 'bg-[#F2F0DF] text-[#174B2B]',
    Basic: 'bg-[#F0F0F0] text-[#666]',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${styles[plan] ?? styles.Basic}`}>
      {plan}
    </span>
  )
}

export default function BranchManagement({ onViewBranch }) {
  const { userRole } = useAuth()
  const { getAccess, hasFullAccess } = usePermissions()
  const { branches, addBranch, updateBranch, toggleBranchStatus, updateSubscription } = useBranches()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState(null)
  const [search, setSearch] = useState('')

  const isSuperAdmin = userRole === ROLES.superAdmin
  const isBranchAdmin = userRole === ROLES.admin
  const branchAccess = getAccess('branches')

  const scopedBranches = useMemo(() => {
    if (isSuperAdmin) return branches
    if (branchAccess === ACCESS.OWN) {
      return branches.filter((b) => b.id === MOCK_BRANCH_ADMIN_BRANCH_ID)
    }
    return branches
  }, [branches, isSuperAdmin, branchAccess])

  const scopedStats = useMemo(() => ({
    total: scopedBranches.length,
    active: scopedBranches.filter((b) => b.status === 'active').length,
    students: scopedBranches.reduce((sum, b) => sum + b.students, 0),
    staff: scopedBranches.reduce((sum, b) => sum + b.staff, 0),
    capacity: scopedBranches.reduce((sum, b) => sum + b.capacity, 0),
  }), [scopedBranches])

  const filtered = scopedBranches.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()),
  )

  function openAdd() {
    setEditingBranch(null)
    setModalOpen(true)
  }

  function openEdit(branch) {
    setEditingBranch(branch)
    setModalOpen(true)
  }

  function handleSave(data) {
    if (editingBranch) {
      updateBranch(editingBranch.id, data)
    } else {
      addBranch(data)
    }
  }

  return (
    <div className="pb-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#174B2B]">
            {isBranchAdmin ? 'My Branch' : 'Branch Management'}
          </h2>
          <p className="mt-1 text-sm text-[#888]">
            {isBranchAdmin
              ? 'View your branch details, subscription, and capacity.'
              : 'View and manage all kindergarten branches, subscriptions, and capacity.'}
          </p>
        </div>
        {hasFullAccess('branches') && (
          <button
            type="button"
            onClick={openAdd}
            className="rounded-full bg-[#C3D3A4] px-5 py-2.5 text-sm font-bold text-[#174B2B] transition hover:bg-[#AFC58D] hover:shadow-md"
          >
            + Add New Kindergarten
          </button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Branches" value={scopedStats.total} sub={`${scopedStats.active} active`} />
        <StatCard label="Total Students" value={scopedStats.students.toLocaleString()} />
        <StatCard label="Total Staff" value={scopedStats.staff.toLocaleString()} />
        <StatCard label="Total Capacity" value={scopedStats.capacity.toLocaleString()} sub={isBranchAdmin ? 'Your branch' : 'Across all branches'} />
      </div>

      <section className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold text-[#174B2B]">All Branches</h3>
          <input
            type="search"
            placeholder="Search branch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-full border border-[#EBEBEB] px-4 py-2 text-sm outline-none focus:border-[#638753] focus:shadow-[0_0_0_3px_rgba(23,75,43,0.25)]"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#F0F0F0] text-xs font-bold uppercase tracking-wide text-[#888]">
                <th className="pb-3 pr-4">Branch</th>
                <th className="pb-3 pr-4">Students</th>
                <th className="pb-3 pr-4">Staff</th>
                <th className="pb-3 pr-4">Capacity</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Subscription</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <PaginatedBody>
              {filtered.map((branch) => (
                <tr key={branch.id} className="border-b border-[#FAF4E7] last:border-0">
                  <td className="py-4 pr-4">
                    <p className="font-bold text-[#174B2B]">{branch.name}</p>
                    <p className="mt-0.5 text-xs text-[#AAA]">{branch.address}</p>
                  </td>
                  <td className="py-4 pr-4 font-semibold text-[#174B2B]">{branch.students}</td>
                  <td className="py-4 pr-4 font-semibold text-[#174B2B]">{branch.staff}</td>
                  <td className="py-4 pr-4">
                    <span className="font-semibold text-[#174B2B]">{branch.students}</span>
                    <span className="text-[#AAA]"> / {branch.capacity}</span>
                  </td>
                  <td className="py-4 pr-4">
                    <StatusBadge status={branch.status} />
                  </td>
                  <td className="py-4 pr-4">
                    {isBranchAdmin ? (
                      <SubscriptionBadge plan={branch.subscription} />
                    ) : (
                      <select
                        value={branch.subscription}
                        onChange={(e) => updateSubscription(branch.id, e.target.value)}
                        className="rounded-full border border-[#EBEBEB] bg-white px-3 py-1.5 text-xs font-bold outline-none focus:border-[#638753]"
                      >
                        <option value="Premium">Premium</option>
                        <option value="Standard">Standard</option>
                        <option value="Basic">Basic</option>
                      </select>
                    )}
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onViewBranch?.(branch.id)}
                        className="rounded-full bg-[#C3D3A4] px-3 py-1.5 text-xs font-bold text-[#174B2B] transition hover:bg-[#AFC58D]"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(branch)}
                        className="rounded-full border border-[#EBEBEB] px-3 py-1.5 text-xs font-bold text-[#555] transition hover:bg-[#F2F0DF]"
                      >
                        Edit
                      </button>
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => toggleBranchStatus(branch.id)}
                          className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                            branch.status === 'active'
                              ? 'border border-[#FFCDD2] text-[#C62828] hover:bg-[#FFEBEE]'
                              : 'border border-[#C8E6C9] text-[#2E7D32] hover:bg-[#E8F5E9]'
                          }`}
                        >
                          {branch.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </PaginatedBody>
          </table>

          {filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-[#888]">No branches found.</p>
          )}
        </div>
      </section>

      <BranchFormModal
        open={modalOpen}
        branch={editingBranch}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
