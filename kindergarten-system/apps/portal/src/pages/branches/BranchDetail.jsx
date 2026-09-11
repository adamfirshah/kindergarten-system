import PaginatedBody from '../../components/ui/PaginatedBody'
import { useState } from 'react'
import { useBranches } from '../../context/BranchContext'
import { STAFF_ROLE_LABELS } from '../../data/branchDetails'

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

function RoleBadge({ role }) {
  const styles = {
    branch_admin: 'bg-[#174B2B] text-[#FAF4E7]',
    teacher: 'bg-[#F2F0DF] text-[#174B2B]',
    finance: 'bg-[#E3F2FD] text-[#1565C0]',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${styles[role] ?? 'bg-[#F0F0F0] text-[#666]'}`}>
      {STAFF_ROLE_LABELS[role] ?? role}
    </span>
  )
}

const STAFF_TABS = [
  { id: 'all', label: 'All Staff' },
  { id: 'branch_admin', label: 'Branch Admin' },
  { id: 'teacher', label: 'Teachers' },
  { id: 'finance', label: 'Finance' },
]

export default function BranchDetail({ branchId, onBack }) {
  const { getBranch, getBranchStudents, getBranchStaff, getSubscriptionPlan } = useBranches()
  const [studentSearch, setStudentSearch] = useState('')
  const [staffTab, setStaffTab] = useState('all')

  const branch = getBranch(branchId)
  const students = getBranchStudents(branchId)
  const staff = getBranchStaff(branchId)

  if (!branch) {
    return (
      <div className="pb-2">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 text-sm font-semibold text-[#888] hover:text-[#174B2B]"
        >
          ← Back to branches
        </button>
        <p className="text-sm text-[#888]">Branch not found.</p>
      </div>
    )
  }

  const plan = getSubscriptionPlan(branch.subscription)
  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()),
  )
  const filteredStaff = staffTab === 'all'
    ? staff
    : staff.filter((s) => s.role === staffTab)

  const staffByRole = {
    branch_admin: staff.filter((s) => s.role === 'branch_admin').length,
    teacher: staff.filter((s) => s.role === 'teacher').length,
    finance: staff.filter((s) => s.role === 'finance').length,
  }

  return (
    <div className="pb-2">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-[#888] transition hover:text-[#174B2B]"
      >
        ← Back to branches
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-extrabold text-[#174B2B]">{branch.name}</h2>
            <StatusBadge status={branch.status} />
            <SubscriptionBadge plan={branch.subscription} />
          </div>
          <p className="mt-1 text-sm text-[#888]">{branch.address}</p>
          <p className="mt-0.5 text-sm text-[#AAA]">{branch.phone}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Students" value={branch.students} sub={`${students.length} listed`} />
        <StatCard label="Staff" value={branch.staff} sub={`${staff.length} listed`} />
        <StatCard
          label="Capacity"
          value={`${branch.students} / ${branch.capacity}`}
          sub={`${Math.round((branch.students / branch.capacity) * 100)}% filled`}
        />
        <StatCard label="Subscription" value={plan.label} sub={plan.price} />
      </div>

      <section className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
        <h3 className="text-base font-bold text-[#174B2B]">Subscription Plan</h3>
        <p className="mt-1 text-sm text-[#888]">{plan.price}</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {plan.features.map((feature) => (
            <li
              key={feature}
              className="rounded-full bg-[#F2F0DF] px-3 py-1.5 text-xs font-semibold text-[#174B2B]"
            >
              {feature}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#174B2B]">Students</h3>
            <p className="mt-0.5 text-xs text-[#888]">{filteredStudents.length} student(s)</p>
          </div>
          <input
            type="search"
            placeholder="Search student..."
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            className="rounded-full border border-[#EBEBEB] px-4 py-2 text-sm outline-none focus:border-[#638753] focus:shadow-[0_0_0_3px_rgba(23,75,43,0.25)]"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#F0F0F0] text-xs font-bold uppercase tracking-wide text-[#888]">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Class</th>
                <th className="pb-3 pr-4">Age</th>
                <th className="pb-3">Parent / Guardian</th>
              </tr>
            </thead>
            <PaginatedBody>
              {filteredStudents.map((student) => (
                <tr key={student.id} className="border-b border-[#FAF4E7] last:border-0">
                  <td className="py-3.5 pr-4 font-bold text-[#174B2B]">{student.name}</td>
                  <td className="py-3.5 pr-4 text-[#555]">{student.class}</td>
                  <td className="py-3.5 pr-4 text-[#555]">{student.age}</td>
                  <td className="py-3.5 text-[#555]">{student.parent}</td>
                </tr>
              ))}
            </PaginatedBody>
          </table>

          {filteredStudents.length === 0 && (
            <p className="py-8 text-center text-sm text-[#888]">No students found.</p>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#174B2B]">Staff</h3>
            <p className="mt-0.5 text-xs text-[#888]">
              {staffByRole.branch_admin} admin · {staffByRole.teacher} teachers · {staffByRole.finance} finance
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {STAFF_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStaffTab(tab.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  staffTab === tab.id
                    ? 'bg-[#174B2B] text-[#FAF4E7]'
                    : 'border border-[#EBEBEB] text-[#555] hover:bg-[#F2F0DF]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#F0F0F0] text-xs font-bold uppercase tracking-wide text-[#888]">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3">Phone</th>
              </tr>
            </thead>
            <PaginatedBody>
              {filteredStaff.map((member) => (
                <tr key={member.id} className="border-b border-[#FAF4E7] last:border-0">
                  <td className="py-3.5 pr-4 font-bold text-[#174B2B]">{member.name}</td>
                  <td className="py-3.5 pr-4">
                    <RoleBadge role={member.role} />
                  </td>
                  <td className="py-3.5 pr-4 text-[#555]">{member.email}</td>
                  <td className="py-3.5 text-[#555]">{member.phone}</td>
                </tr>
              ))}
            </PaginatedBody>
          </table>

          {filteredStaff.length === 0 && (
            <p className="py-8 text-center text-sm text-[#888]">No staff found.</p>
          )}
        </div>
      </section>
    </div>
  )
}
