import PaginatedBody from '../../components/ui/PaginatedBody'
import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useAcademics } from '../../context/AcademicContext'
import { useBranches } from '../../context/BranchContext'
import { useHomework } from '../../context/HomeworkContextStore.js'
import { useStudents } from '../../context/StudentContext'
import { ROLES } from '../../constants/roles'
import { MOCK_BRANCH_ADMIN_BRANCH_ID } from '../../constants/scope'
import { PARENT_STUDENT_IDS, TEACHER_BRANCH_ID } from '../../data/studentDetails'
import { AssignmentModal, ReviewModal, SubmissionModal } from '../../components/homework/HomeworkModal'

const MOCK_CURRENT_TEACHER_ID = 'st3'

const STATUS_STYLE = {
  draft: 'bg-[#F4F0E5] text-[#777]',
  published: 'bg-[#E8F5E9] text-[#2E7D32]',
  archived: 'bg-[#ECEFF1] text-[#546E7A]',
  assigned: 'bg-[#FFF8E1] text-[#9A6700]',
  submitted: 'bg-[#E3F2FD] text-[#1565C0]',
  reviewed: 'bg-[#E8F5E9] text-[#2E7D32]',
  late: 'bg-[#FFEBEE] text-[#C62828]',
}

function label(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function StatusBadge({ status }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[status] ?? STATUS_STYLE.draft}`}>{label(status)}</span>
}

function StatCard({ title, value, note }) {
  return <article className="rounded-[22px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]"><p className="text-xs font-semibold uppercase tracking-wide text-[#888]">{title}</p><p className="mt-1 text-2xl font-extrabold text-[#174B2B]">{value}</p>{note && <p className="mt-1 text-xs text-[#AAA]">{note}</p>}</article>
}

export default function HomeworkManagement() {
  const { userRole } = useAuth()
  const { classes, getClassRoster } = useAcademics()
  const { branches } = useBranches()
  const { students } = useStudents()
  const { assignments, submissions, addAssignment, updateAssignmentStatus, submitHomework, reviewSubmission } = useHomework()
  const [activeTab, setActiveTab] = useState('assignments')
  const [branchFilter, setBranchFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false)
  const [submitAssignment, setSubmitAssignment] = useState(null)
  const [reviewTarget, setReviewTarget] = useState(null)

  const isSuperAdmin = userRole === ROLES.superAdmin
  const isBranchAdmin = userRole === ROLES.admin
  const isTeacher = userRole === ROLES.teacher
  const isParent = userRole === ROLES.parent
  const branchMap = Object.fromEntries(branches.map((branch) => [branch.id, branch.name]))
  const classMap = Object.fromEntries(classes.map((item) => [item.id, item]))
  const studentMap = Object.fromEntries(students.map((student) => [student.id, student]))

  const scopedClasses = useMemo(() => {
    if (isSuperAdmin) return classes
    if (isBranchAdmin) return classes.filter((item) => item.branchId === MOCK_BRANCH_ADMIN_BRANCH_ID)
    if (isTeacher) return classes.filter((item) => item.branchId === TEACHER_BRANCH_ID && item.teacherId === MOCK_CURRENT_TEACHER_ID)
    return classes.filter((item) => PARENT_STUDENT_IDS.some((studentId) => {
      const student = students.find((entry) => entry.id === studentId)
      return student?.branchId === item.branchId && student?.className === item.name
    }))
  }, [classes, students, isSuperAdmin, isBranchAdmin, isTeacher])

  const scopedClassIds = new Set(scopedClasses.map((item) => item.id))
  const scopedAssignments = assignments.filter((assignment) => {
    if (!scopedClassIds.has(assignment.classId)) return false
    if (isParent && assignment.status !== 'published') return false
    if (isSuperAdmin && branchFilter !== 'all' && assignment.branchId !== branchFilter) return false
    if (classFilter !== 'all' && assignment.classId !== classFilter) return false
    return [assignment.title, assignment.subject, assignment.instructions].some((value) => value.toLowerCase().includes(search.toLowerCase()))
  })
  const scopedAssignmentIds = new Set(scopedAssignments.map((item) => item.id))
  const scopedSubmissions = submissions.filter((submission) =>
    scopedAssignmentIds.has(submission.assignmentId)
    && (!isParent || PARENT_STUDENT_IDS.includes(submission.studentId)),
  )
  const published = scopedAssignments.filter((assignment) => assignment.status === 'published').length
  const dueSoon = scopedAssignments.filter((assignment) => assignment.status === 'published' && assignment.dueDate <= '2026-09-07').length
  const submitted = scopedSubmissions.filter((submission) => ['submitted', 'reviewed'].includes(submission.status)).length
  const completion = scopedSubmissions.length ? Math.round((submitted / scopedSubmissions.length) * 100) : 0
  const pendingReview = scopedSubmissions.filter((submission) => submission.status === 'submitted').length
  const visibleClasses = scopedClasses.filter((item) => branchFilter === 'all' || item.branchId === branchFilter)
  const creationClasses = visibleClasses.map((item) => ({
    ...item,
    displayName: isSuperAdmin && branchFilter === 'all' ? `${branchMap[item.branchId]} · ${item.name}` : item.name,
  }))

  if (isParent) {
    const child = students.find((student) => PARENT_STUDENT_IDS.includes(student.id))
    return (
      <div className="pb-2">
        <div><h2 className="text-2xl font-extrabold text-[#174B2B]">My Child&apos;s Homework</h2><p className="mt-1 text-sm text-[#888]">View instructions, submit completed work and read teacher feedback.</p></div>
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4"><StatCard title="Published" value={published} /><StatCard title="Due Soon" value={dueSoon} /><StatCard title="Submitted" value={submitted} /><StatCard title="Completion" value={`${completion}%`} /></div>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">{scopedAssignments.map((assignment) => { const submission = submissions.find((item) => item.assignmentId === assignment.id && item.studentId === child?.id); return <article key={assignment.id} className="rounded-[26px] bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.05)]"><div className="flex items-start justify-between gap-4"><div><span className="rounded-full bg-[#F2F0DF] px-2.5 py-1 text-[10px] font-bold uppercase text-[#8A7000]">{assignment.subject}</span><h3 className="mt-3 text-lg font-extrabold text-[#174B2B]">{assignment.title}</h3><p className="mt-1 text-xs text-[#888]">{classMap[assignment.classId]?.name} · Due {assignment.dueDate}</p></div><StatusBadge status={submission?.status ?? 'assigned'} /></div><p className="mt-4 text-sm leading-relaxed text-[#666]">{assignment.instructions}</p>{submission?.teacherFeedback && <div className="mt-4 rounded-2xl bg-[#E8F5E9] p-4"><p className="text-xs font-bold uppercase text-[#2E7D32]">Teacher feedback {submission.score !== null ? `· ${submission.score}/10` : ''}</p><p className="mt-1 text-sm text-[#466B48]">{submission.teacherFeedback}</p></div>}<div className="mt-5 flex items-center justify-between border-t border-[#F0F0F0] pt-4"><p className="text-xs text-[#AAA]">Assigned {assignment.assignedDate}</p>{submission?.status !== 'reviewed' && <button type="button" onClick={() => setSubmitAssignment(assignment)} className="rounded-full bg-[#C3D3A4] px-4 py-2 text-xs font-bold text-[#174B2B]">{submission?.status === 'submitted' ? 'Update Submission' : 'Submit Work'}</button>}</div></article> })}</div>
        {scopedAssignments.length === 0 && <p className="mt-6 rounded-[28px] bg-white p-12 text-center text-sm text-[#888]">No published homework is available.</p>}
        <SubmissionModal key={submitAssignment?.id ?? 'no-assignment'} open={Boolean(submitAssignment)} assignment={submitAssignment} student={child} onClose={() => setSubmitAssignment(null)} onSubmit={submitHomework} />
      </div>
    )
  }

  const roleDescription = isSuperAdmin ? 'Monitor homework activity and completion across all branches.' : isBranchAdmin ? 'Manage homework and monitor completion for your branch.' : 'Create homework and review submissions for your assigned class.'
  const reviewSubmissionRecord = reviewTarget ? submissions.find((item) => item.id === reviewTarget) : null
  const reviewAssignment = reviewSubmissionRecord ? assignments.find((item) => item.id === reviewSubmissionRecord.assignmentId) : null
  const reviewStudent = reviewSubmissionRecord ? students.find((item) => item.id === reviewSubmissionRecord.studentId) : null

  function saveAssignment(data) {
    addAssignment(data, getClassRoster(data.classId))
  }

  return (
    <div className="pb-2">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-extrabold text-[#174B2B]">Homework</h2><p className="mt-1 text-sm text-[#888]">{roleDescription}</p></div><button type="button" onClick={() => setAssignmentModalOpen(true)} className="rounded-full bg-[#C3D3A4] px-5 py-2.5 text-sm font-bold text-[#174B2B]">+ Create Homework</button></div>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4"><StatCard title="Published" value={published} /><StatCard title="Due Soon" value={dueSoon} /><StatCard title="Completion" value={`${completion}%`} note={`${submitted} submissions received`} /><StatCard title="Pending Review" value={pendingReview} /></div>
      <section className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F0F0F0] pb-4"><div className="flex rounded-full bg-[#F4F0E5] p-1"><button type="button" onClick={() => setActiveTab('assignments')} className={`rounded-full px-4 py-2 text-sm font-bold ${activeTab === 'assignments' ? 'bg-[#174B2B] text-[#FAF4E7]' : 'text-[#777]'}`}>Assignments ({scopedAssignments.length})</button><button type="button" onClick={() => setActiveTab('submissions')} className={`rounded-full px-4 py-2 text-sm font-bold ${activeTab === 'submissions' ? 'bg-[#174B2B] text-[#FAF4E7]' : 'text-[#777]'}`}>Submissions ({scopedSubmissions.length})</button></div><div className="flex flex-wrap gap-2">{isSuperAdmin && <select value={branchFilter} onChange={(event) => { setBranchFilter(event.target.value); setClassFilter('all') }} className="rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm"><option value="all">All Branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>}<select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm"><option value="all">All Classes</option>{visibleClasses.map((item) => <option key={item.id} value={item.id}>{isSuperAdmin && branchFilter === 'all' ? `${branchMap[item.branchId]} · ` : ''}{item.name}</option>)}</select><input type="search" placeholder="Search homework..." value={search} onChange={(event) => setSearch(event.target.value)} className="rounded-full border border-[#E5E5E5] px-4 py-2 text-sm outline-none focus:border-[#638753]" /></div></div>
        {activeTab === 'assignments' ? <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm"><thead><tr className="border-b border-[#F0F0F0] text-xs font-bold uppercase tracking-wide text-[#888]"><th className="py-4 pr-4">Homework</th>{isSuperAdmin && <th className="py-4 pr-4">Branch</th>}<th className="py-4 pr-4">Class</th><th className="py-4 pr-4">Due Date</th><th className="py-4 pr-4">Completion</th><th className="py-4 pr-4">Status</th><th className="py-4">Actions</th></tr></thead><PaginatedBody>{scopedAssignments.map((assignment) => { const assignmentSubmissions = submissions.filter((item) => item.assignmentId === assignment.id); const received = assignmentSubmissions.filter((item) => ['submitted', 'reviewed'].includes(item.status)).length; return <tr key={assignment.id} className="border-b border-[#FAF4E7] last:border-0"><td className="py-4 pr-4"><p className="font-bold text-[#174B2B]">{assignment.title}</p><p className="mt-0.5 text-xs text-[#888]">{assignment.subject}</p></td>{isSuperAdmin && <td className="py-4 pr-4 text-[#555]">{branchMap[assignment.branchId]}</td>}<td className="py-4 pr-4 text-[#555]">{classMap[assignment.classId]?.name}</td><td className="py-4 pr-4 text-[#555]">{assignment.dueDate}</td><td className="py-4 pr-4"><span className="font-bold text-[#174B2B]">{received}</span><span className="text-[#AAA]"> / {assignmentSubmissions.length}</span></td><td className="py-4 pr-4"><StatusBadge status={assignment.status} /></td><td className="py-4"><div className="flex gap-2">{assignment.status === 'draft' && <button type="button" onClick={() => updateAssignmentStatus(assignment.id, 'published')} className="rounded-full bg-[#E8F5E9] px-3 py-1.5 text-xs font-bold text-[#2E7D32]">Publish</button>}{assignment.status === 'published' && <button type="button" onClick={() => updateAssignmentStatus(assignment.id, 'archived')} className="rounded-full border border-[#E5E5E5] px-3 py-1.5 text-xs font-bold text-[#666]">Archive</button>}{assignment.status === 'archived' && <button type="button" onClick={() => updateAssignmentStatus(assignment.id, 'published')} className="rounded-full border border-[#E5E5E5] px-3 py-1.5 text-xs font-bold text-[#666]">Restore</button>}</div></td></tr> })}</PaginatedBody></table></div>
          : <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm"><thead><tr className="border-b border-[#F0F0F0] text-xs font-bold uppercase tracking-wide text-[#888]"><th className="py-4 pr-4">Student</th><th className="py-4 pr-4">Homework</th><th className="py-4 pr-4">Class</th><th className="py-4 pr-4">Submitted</th><th className="py-4 pr-4">Status</th><th className="py-4 pr-4">Score</th><th className="py-4">Review</th></tr></thead><PaginatedBody>{scopedSubmissions.map((submission) => { const assignment = assignments.find((item) => item.id === submission.assignmentId); return <tr key={submission.id} className="border-b border-[#FAF4E7] last:border-0"><td className="py-4 pr-4 font-bold text-[#174B2B]">{studentMap[submission.studentId]?.name}</td><td className="py-4 pr-4"><p className="font-semibold text-[#333]">{assignment?.title}</p><p className="text-xs text-[#AAA]">{submission.parentNote}</p></td><td className="py-4 pr-4 text-[#555]">{classMap[assignment?.classId]?.name}</td><td className="py-4 pr-4 text-[#555]">{submission.submittedAt || '—'}</td><td className="py-4 pr-4"><StatusBadge status={submission.status} /></td><td className="py-4 pr-4 font-bold text-[#174B2B]">{submission.score === null ? '—' : `${submission.score}/10`}</td><td className="py-4">{['submitted', 'reviewed'].includes(submission.status) ? <button type="button" onClick={() => setReviewTarget(submission.id)} className="rounded-full bg-[#C3D3A4] px-3 py-1.5 text-xs font-bold text-[#174B2B]">{submission.status === 'reviewed' ? 'Update Review' : 'Review'}</button> : <span className="text-xs text-[#AAA]">Awaiting work</span>}</td></tr> })}</PaginatedBody></table></div>}
      </section>
      <AssignmentModal key={assignmentModalOpen ? 'open' : 'closed'} open={assignmentModalOpen} classes={creationClasses} onClose={() => setAssignmentModalOpen(false)} onSave={saveAssignment} />
      <ReviewModal key={reviewTarget ?? 'no-review'} open={Boolean(reviewTarget)} submission={reviewSubmissionRecord} student={reviewStudent} assignment={reviewAssignment} onClose={() => setReviewTarget(null)} onSubmit={reviewSubmission} />
    </div>
  )
}
