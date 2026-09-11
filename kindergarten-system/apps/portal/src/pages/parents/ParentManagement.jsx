import PaginatedBody from '../../components/ui/PaginatedBody'
import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useBranches } from '../../context/BranchContext'
import { useParents } from '../../context/ParentContext'
import { useStudents } from '../../context/StudentContext'
import { ROLES } from '../../constants/roles'
import { MOCK_BRANCH_ADMIN_BRANCH_ID } from '../../constants/scope'
import { MOCK_CURRENT_PARENT_ID } from '../../data/parentDetails'
import { TEACHER_BRANCH_ID, TEACHER_CLASSES } from '../../data/studentDetails'
import ParentFormModal from '../../components/parents/ParentFormModal'
import LinkChildModal from '../../components/parents/LinkChildModal'

function StatCard({ label, value, sub }) {
  return <article className="rounded-[22px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]"><p className="text-xs font-semibold uppercase tracking-wide text-[#888]">{label}</p><p className="mt-1 text-2xl font-extrabold text-[#174B2B]">{value}</p>{sub && <p className="mt-1 text-xs text-[#AAA]">{sub}</p>}</article>
}

function StatusBadge({ status }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${status === 'active' ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#F4F0E5] text-[#888]'}`}>{status === 'active' ? 'Active' : 'Inactive'}</span>
}

function maskIdentity(value) {
  if (!value) return '—'
  return `${value.slice(0, 4)}••••••${value.slice(-2)}`
}

export default function ParentManagement() {
  const { userRole } = useAuth()
  const { branches } = useBranches()
  const { students } = useStudents()
  const { parents, links, addParent, updateParent, toggleParentStatus, getChildren, linkChild } = useParents()
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingParent, setEditingParent] = useState(null)
  const [selectedParentId, setSelectedParentId] = useState(null)
  const [linkingParent, setLinkingParent] = useState(null)

  const isSuperAdmin = userRole === ROLES.superAdmin
  const isBranchAdmin = userRole === ROLES.admin
  const isTeacher = userRole === ROLES.teacher
  const isParent = userRole === ROLES.parent
  const canManage = isSuperAdmin || isBranchAdmin
  const branchMap = Object.fromEntries(branches.map((branch) => [branch.id, branch.name]))

  const scopedParents = useMemo(() => {
    if (isSuperAdmin) return parents
    if (isBranchAdmin) return parents.filter((parent) => parent.branchId === MOCK_BRANCH_ADMIN_BRANCH_ID)
    if (isTeacher) {
      const teacherStudentIds = new Set(students.filter((student) => student.branchId === TEACHER_BRANCH_ID && TEACHER_CLASSES.includes(student.className)).map((student) => student.id))
      const parentIds = new Set(links.filter((link) => teacherStudentIds.has(link.studentId)).map((link) => link.parentId))
      return parents.filter((parent) => parentIds.has(parent.id))
    }
    if (isParent) return parents.filter((parent) => parent.id === MOCK_CURRENT_PARENT_ID)
    return []
  }, [parents, links, students, isSuperAdmin, isBranchAdmin, isTeacher, isParent])

  const filteredParents = scopedParents.filter((parent) => {
    const query = search.toLowerCase()
    const matchesSearch = [parent.name, parent.email, parent.phone, branchMap[parent.branchId] ?? ''].some((value) => value.toLowerCase().includes(query))
    return matchesSearch && (branchFilter === 'all' || parent.branchId === branchFilter)
  })

  const selectedParent = parents.find((parent) => parent.id === selectedParentId) ?? null
  const childrenFor = (parentId) => {
    const ids = getChildren(parentId)
    return students.filter((student) => ids.has(student.id))
  }

  function openAdd() {
    setEditingParent(null)
    setFormOpen(true)
  }

  function openEdit(parent) {
    setEditingParent(parent)
    setFormOpen(true)
  }

  function saveParent(data) {
    if (editingParent) updateParent(editingParent.id, data)
    else addParent(data)
  }

  if (isParent) {
    const profile = scopedParents[0]
    const children = profile ? childrenFor(profile.id) : []
    return (
      <div className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-extrabold text-[#174B2B]">My Parent Profile</h2><p className="mt-1 text-sm text-[#888]">Manage your contact preferences and view children linked to your account.</p></div>{profile && <button type="button" onClick={() => openEdit(profile)} className="rounded-full bg-[#C3D3A4] px-5 py-2.5 text-sm font-bold text-[#174B2B]">Edit Contact Details</button>}</div>
        {profile ? <>
          <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_1.9fr]">
            <section className="rounded-[28px] bg-[#174B2B] p-6 text-white"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#C3D3A4] text-xl font-extrabold text-[#174B2B]">{profile.name.charAt(0)}</div><h3 className="mt-4 text-xl font-extrabold !text-white">{profile.name}</h3><p className="mt-1 text-sm text-white/60">{profile.email}</p><div className="mt-5 space-y-3 border-t border-white/10 pt-5 text-sm"><p><span className="text-white/50">Phone</span><br />{profile.phone}</p><p><span className="text-white/50">Preferred contact</span><br />{profile.communication}</p><p><span className="text-white/50">Account</span><br />Linked and active</p></div></section>
            <section className="rounded-[28px] bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.05)]"><h3 className="text-base font-bold text-[#174B2B]">Profile Information</h3><div className="mt-5 grid gap-5 sm:grid-cols-2"><Info label="IC / Passport" value={maskIdentity(profile.icNo)} /><Info label="Occupation" value={profile.occupation} /><Info label="Address" value={profile.address} /><Info label="Primary Branch" value={branchMap[profile.branchId]} /></div><p className="mt-5 rounded-2xl bg-[#F2F0DF] p-4 text-xs leading-relaxed text-[#666]">For identity, child relationship or account-status changes, contact your branch administrator.</p></section>
          </div>
          <section className="mt-6 rounded-[28px] bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.05)]"><h3 className="text-base font-bold text-[#174B2B]">My Children</h3><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children.map((child) => <article key={child.id} className="rounded-2xl border border-[#F0F0F0] bg-[#FFFDF5] p-4"><p className="font-bold text-[#174B2B]">{child.name}</p><p className="mt-1 text-xs text-[#888]">{child.className} · Age {child.age}</p><p className="mt-3 text-xs font-semibold text-[#555]">{branchMap[child.branchId]}</p></article>)}</div></section>
        </> : <p className="mt-6 rounded-[28px] bg-white p-10 text-center text-sm text-[#888]">No parent profile is linked to this account.</p>}
        <ParentFormModal open={formOpen} parent={editingParent} branches={branches} selfService onClose={() => setFormOpen(false)} onSave={saveParent} />
      </div>
    )
  }

  const active = scopedParents.filter((parent) => parent.status === 'active').length
  const linkedAccounts = scopedParents.filter((parent) => parent.userId).length
  const linkedChildren = new Set(links.filter((link) => scopedParents.some((parent) => parent.id === link.parentId)).map((link) => link.studentId)).size

  return (
    <div className="pb-2">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-extrabold text-[#174B2B]">{isTeacher ? 'Parent Contacts' : 'Parent Management'}</h2><p className="mt-1 text-sm text-[#888]">{isTeacher ? 'Contact details for parents of students in your assigned classes.' : isSuperAdmin ? 'Manage parent records, child relationships and account access across all branches.' : 'Manage parent records and child relationships for your branch.'}</p></div>{canManage && <button type="button" onClick={openAdd} className="rounded-full bg-[#C3D3A4] px-5 py-2.5 text-sm font-bold text-[#174B2B]">+ Add Parent</button>}</div>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4"><StatCard label="Parents" value={scopedParents.length} /><StatCard label="Active" value={active} /><StatCard label="Linked Children" value={linkedChildren} /><StatCard label="Portal Accounts" value={linkedAccounts} sub={`${scopedParents.length - linkedAccounts} not linked`} /></div>
      <section className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-base font-bold text-[#174B2B]">{isTeacher ? 'Contact Directory' : 'Parent Records'}</h3><div className="flex flex-wrap gap-2">{isSuperAdmin && <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} className="rounded-full border border-[#EBEBEB] bg-white px-4 py-2 text-sm"><option value="all">All Branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>}<input type="search" placeholder="Search parent..." value={search} onChange={(event) => setSearch(event.target.value)} className="rounded-full border border-[#EBEBEB] px-4 py-2 text-sm outline-none focus:border-[#638753]" /></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b border-[#F0F0F0] text-xs font-bold uppercase tracking-wide text-[#888]"><th className="pb-3 pr-4">Parent</th><th className="pb-3 pr-4">Branch</th><th className="pb-3 pr-4">Children</th><th className="pb-3 pr-4">Contact</th>{!isTeacher && <><th className="pb-3 pr-4">Portal</th><th className="pb-3 pr-4">Status</th></>}<th className="pb-3">Actions</th></tr></thead><PaginatedBody>{filteredParents.map((parent) => { const children = childrenFor(parent.id); return <tr key={parent.id} className="border-b border-[#FAF4E7] last:border-0"><td className="py-4 pr-4"><p className="font-bold text-[#174B2B]">{parent.name}</p>{!isTeacher && <p className="mt-0.5 text-xs text-[#AAA]">{isSuperAdmin ? parent.icNo : maskIdentity(parent.icNo)}</p>}</td><td className="py-4 pr-4 text-[#555]">{branchMap[parent.branchId]}</td><td className="py-4 pr-4"><span className="font-bold text-[#174B2B]">{children.length}</span><span className="text-[#888]"> linked</span></td><td className="py-4 pr-4"><p className="text-[#555]">{parent.phone}</p><p className="text-xs text-[#AAA]">{parent.email}</p></td>{!isTeacher && <><td className="py-4 pr-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${parent.userId ? 'bg-[#E3F2FD] text-[#1565C0]' : 'bg-[#F4F0E5] text-[#888]'}`}>{parent.userId ? 'Linked' : 'Not linked'}</span></td><td className="py-4 pr-4"><StatusBadge status={parent.status} /></td></>}<td className="py-4"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setSelectedParentId(parent.id)} className="rounded-full bg-[#C3D3A4] px-3 py-1.5 text-xs font-bold text-[#174B2B]">View Children</button>{canManage && <button type="button" onClick={() => openEdit(parent)} className="rounded-full border border-[#EBEBEB] px-3 py-1.5 text-xs font-bold text-[#555]">Edit</button>}{canManage && <button type="button" onClick={() => setLinkingParent(parent)} className="rounded-full border border-[#EBEBEB] px-3 py-1.5 text-xs font-bold text-[#555]">Link Child</button>}{isSuperAdmin && <button type="button" onClick={() => toggleParentStatus(parent.id)} className="rounded-full border border-[#EBEBEB] px-3 py-1.5 text-xs font-bold text-[#555]">{parent.status === 'active' ? 'Deactivate' : 'Activate'}</button>}</div></td></tr>})}</PaginatedBody></table>{filteredParents.length === 0 && <p className="py-10 text-center text-sm text-[#888]">No parents found.</p>}</div>
      </section>
      {selectedParent && <section className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]"><div className="flex justify-between"><div><h3 className="font-bold text-[#174B2B]">Children linked to {selectedParent.name}</h3><p className="mt-1 text-xs text-[#888]">Relationship and primary-contact records</p></div><button type="button" onClick={() => setSelectedParentId(null)} className="rounded-full border border-[#EBEBEB] px-3 text-xs font-bold">Close</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{childrenFor(selectedParent.id).map((child) => { const link = links.find((item) => item.parentId === selectedParent.id && item.studentId === child.id); return <article key={child.id} className="rounded-2xl bg-[#FFFDF5] p-4"><p className="font-bold text-[#174B2B]">{child.name}</p><p className="mt-1 text-xs text-[#888]">{child.className} · {link?.relationship}</p>{link?.isPrimary && <span className="mt-3 inline-flex rounded-full bg-[#C3D3A4] px-2.5 py-1 text-[10px] font-bold">Primary contact</span>}</article> })}</div></section>}
      <ParentFormModal open={formOpen} parent={editingParent} branches={isBranchAdmin ? branches.filter((branch) => branch.id === MOCK_BRANCH_ADMIN_BRANCH_ID) : branches} onClose={() => setFormOpen(false)} onSave={saveParent} />
      <LinkChildModal key={linkingParent?.id ?? 'no-parent'} open={Boolean(linkingParent)} parent={linkingParent} students={students} linkedStudentIds={new Set(links.filter((item) => item.parentId === linkingParent?.id).map((item) => item.studentId))} onClose={() => setLinkingParent(null)} onLink={linkChild} />
    </div>
  )
}

function Info({ label, value }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-[#AAA]">{label}</p><p className="mt-1 text-sm font-bold text-[#174B2B]">{value || '—'}</p></div>
}
