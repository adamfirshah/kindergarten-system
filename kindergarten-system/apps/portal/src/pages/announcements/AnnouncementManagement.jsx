import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useAcademics } from '../../context/AcademicContext'
import { useAnnouncements } from '../../context/AnnouncementContextStore.js'
import { useBranches } from '../../context/BranchContext'
import { ROLES } from '../../constants/roles'
import { MOCK_BRANCH_ADMIN_BRANCH_ID } from '../../constants/scope'
import { AnnouncementDetailModal, AnnouncementFormModal } from '../../components/announcements/AnnouncementModal'

const CURRENT_USER = {
  [ROLES.superAdmin]: { id: 'u1', name: 'Super Admin' },
  [ROLES.admin]: { id: 'u2', name: 'Dr. Nor Azlina' },
  [ROLES.teacher]: { id: 'u3', name: 'Cik Farah' },
  [ROLES.parent]: { id: 'u5', name: 'Zainal Abidin' },
}
const TEACHER_CLASS_ID = 'c1'
const PARENT_CLASS_ID = 'c1'

const PRIORITY_STYLE = {
  normal: 'bg-[#F4F0E5] text-[#666]',
  high: 'bg-[#FFF3E0] text-[#E65100]',
  urgent: 'bg-[#FFEBEE] text-[#C62828]',
}

function StatCard({ title, value, note }) {
  return <article className="rounded-[22px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]"><p className="text-xs font-semibold uppercase tracking-wide text-[#888]">{title}</p><p className="mt-1 text-2xl font-extrabold text-[#174B2B]">{value}</p>{note && <p className="mt-1 text-xs text-[#AAA]">{note}</p>}</article>
}

export default function AnnouncementManagement() {
  const { userRole } = useAuth()
  const { branches } = useBranches()
  const { classes } = useAcademics()
  const { announcements, receipts, replies, addAnnouncement, updateAnnouncementStatus, markRead, acknowledge, addReply } = useAnnouncements()
  const [branchFilter, setBranchFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  const isSuperAdmin = userRole === ROLES.superAdmin
  const isBranchAdmin = userRole === ROLES.admin
  const isTeacher = userRole === ROLES.teacher
  const isParent = userRole === ROLES.parent
  const canCreate = isSuperAdmin || isBranchAdmin
  const canReply = isSuperAdmin || isBranchAdmin || isTeacher
  const currentUser = CURRENT_USER[userRole] ?? { id: 'unknown', name: 'User' }
  const branchMap = Object.fromEntries(branches.map((branch) => [branch.id, branch.name]))
  const classMap = Object.fromEntries(classes.map((item) => [item.id, item.name]))

  const scopedAnnouncements = useMemo(() => announcements.filter((item) => {
    if (isSuperAdmin) return true
    if (item.branchId && item.branchId !== MOCK_BRANCH_ADMIN_BRANCH_ID) return false
    if ((isTeacher || isParent) && item.status !== 'published') return false
    if (isTeacher && item.classId && item.classId !== TEACHER_CLASS_ID) return false
    if (isParent) {
      if (!['all', 'parents'].includes(item.audience)) return false
      if (item.classId && item.classId !== PARENT_CLASS_ID) return false
    }
    return true
  }), [announcements, isSuperAdmin, isTeacher, isParent])

  const filteredAnnouncements = scopedAnnouncements.filter((item) => {
    const matchesBranch = branchFilter === 'all'
      || (branchFilter === 'platform' ? !item.branchId : item.branchId === branchFilter)
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    const query = search.toLowerCase()
    const matchesSearch = [item.title, item.message, item.category].some((value) => value.toLowerCase().includes(query))
    return matchesBranch && matchesStatus && matchesSearch
  })

  const published = scopedAnnouncements.filter((item) => item.status === 'published').length
  const drafts = scopedAnnouncements.filter((item) => item.status === 'draft').length
  const urgent = scopedAnnouncements.filter((item) => item.status === 'published' && item.priority === 'urgent').length
  const totalRecipients = scopedAnnouncements.reduce((sum, item) => sum + item.recipientCount, 0)
  const totalReads = scopedAnnouncements.reduce((sum, item) => sum + item.readCount, 0)
  const readRate = totalRecipients ? Math.round((totalReads / totalRecipients) * 100) : 0
  const selected = announcements.find((item) => item.id === selectedId) ?? null
  const selectedReceipt = receipts.find((item) => item.announcementId === selectedId && item.userId === currentUser.id)
  const selectedReplies = replies.filter((item) => item.announcementId === selectedId)
  const formBranches = isSuperAdmin ? branches : branches.filter((branch) => branch.id === MOCK_BRANCH_ADMIN_BRANCH_ID)
  const formClasses = isSuperAdmin ? classes : classes.filter((item) => item.branchId === MOCK_BRANCH_ADMIN_BRANCH_ID)

  function canManage(item) {
    return isSuperAdmin || (isBranchAdmin && item.branchId === MOCK_BRANCH_ADMIN_BRANCH_ID)
  }

  const heading = isSuperAdmin ? 'Platform Announcements' : isBranchAdmin ? 'Branch Announcements' : isTeacher ? 'Announcements & Replies' : 'School Announcements'
  const description = isSuperAdmin ? 'Publish and monitor communications across the whole platform.' : isBranchAdmin ? 'Publish announcements for your branch, classes, staff or parents.' : isTeacher ? 'Read school announcements and reply with class information.' : 'Important updates from your child’s school and class.'

  return (
    <div className="pb-2">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-extrabold text-[#174B2B]">{heading}</h2><p className="mt-1 text-sm text-[#888]">{description}</p></div>{canCreate && <button type="button" onClick={() => setFormOpen(true)} className="rounded-full bg-[#C3D3A4] px-5 py-2.5 text-sm font-bold text-[#174B2B]">+ New Announcement</button>}</div>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4"><StatCard title="Published" value={published} /><StatCard title="Drafts" value={drafts} /><StatCard title="Urgent" value={urgent} /><StatCard title="Read Rate" value={`${readRate}%`} note={`${totalReads} of ${totalRecipients} deliveries`} /></div>
      <section className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0F0F0] pb-4"><div><h3 className="text-base font-bold text-[#174B2B]">Announcement Feed</h3><p className="mt-1 text-xs text-[#888]">Newest communication appears first.</p></div><div className="flex flex-wrap gap-2">{isSuperAdmin && <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} className="rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm"><option value="all">All Scopes</option><option value="platform">Platform-wide</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>}{canCreate && <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm"><option value="all">All Statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select>}<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search announcements..." className="rounded-full border border-[#E5E5E5] px-4 py-2 text-sm outline-none focus:border-[#638753]" /></div></div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">{filteredAnnouncements.map((item) => { const receipt = receipts.find((entry) => entry.announcementId === item.id && entry.userId === currentUser.id); const replyCount = replies.filter((entry) => entry.announcementId === item.id).length; return <article key={item.id} className={`rounded-[24px] border p-5 ${item.priority === 'urgent' ? 'border-[#FFCDD2] bg-[#FFF8F8]' : 'border-[#F0F0F0] bg-white'}`}><div className="flex items-start justify-between gap-4"><div className="flex flex-wrap gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${PRIORITY_STYLE[item.priority]}`}>{item.priority}</span><span className="rounded-full bg-[#F2F0DF] px-2.5 py-1 text-[10px] font-bold uppercase text-[#7A6500]">{item.category}</span>{item.status !== 'published' && <span className="rounded-full bg-[#ECEFF1] px-2.5 py-1 text-[10px] font-bold uppercase text-[#546E7A]">{item.status}</span>}</div>{receipt?.readAt && <span className="text-xs font-bold text-[#43A047]">Read</span>}</div><h4 className="mt-4 text-lg font-extrabold text-[#174B2B]">{item.title}</h4><p className="mt-2 line-clamp-3 text-sm leading-6 text-[#666]">{item.message}</p><div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#999]"><span>{item.branchId ? branchMap[item.branchId] : 'All branches'}</span>{item.classId && <span>{classMap[item.classId]}</span>}<span>{item.audience}</span><span>{item.publishAt}</span></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#F0F0F0] pt-4"><div className="flex gap-4 text-xs text-[#888]"><span>{item.readCount}/{item.recipientCount} read</span><span>{replyCount} replies</span></div><div className="flex gap-2"><button type="button" onClick={() => { setSelectedId(item.id); if (!receipt?.readAt) markRead(item.id, currentUser.id) }} className="rounded-full border border-[#E5E5E5] px-3 py-1.5 text-xs font-bold text-[#555]">View</button>{canManage(item) && item.status === 'draft' && <button type="button" onClick={() => updateAnnouncementStatus(item.id, 'published')} className="rounded-full bg-[#E8F5E9] px-3 py-1.5 text-xs font-bold text-[#2E7D32]">Publish</button>}{canManage(item) && item.status === 'published' && <button type="button" onClick={() => updateAnnouncementStatus(item.id, 'archived')} className="rounded-full bg-[#F4F0E5] px-3 py-1.5 text-xs font-bold text-[#666]">Archive</button>}</div></div></article> })}</div>
        {filteredAnnouncements.length === 0 && <p className="py-12 text-center text-sm text-[#888]">No announcements found.</p>}
      </section>
      <AnnouncementFormModal key={formOpen ? 'open' : 'closed'} open={formOpen} branches={formBranches} classes={formClasses} defaultBranchId={isSuperAdmin ? '' : MOCK_BRANCH_ADMIN_BRANCH_ID} createdBy={currentUser.id} onClose={() => setFormOpen(false)} onSave={addAnnouncement} />
      <AnnouncementDetailModal key={selectedId ?? 'none'} open={Boolean(selected)} announcement={selected} replies={selectedReplies} canReply={canReply} currentUser={currentUser} receipt={selectedReceipt} onRead={markRead} onAcknowledge={acknowledge} onReply={addReply} onClose={() => setSelectedId(null)} />
    </div>
  )
}
