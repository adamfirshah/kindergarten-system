import PaginatedBody from '../../components/ui/PaginatedBody'
import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useAcademics } from '../../context/AcademicContext'
import { useAttendance } from '../../context/AttendanceContextStore.js'
import { useBranches } from '../../context/BranchContext'
import { useFinance } from '../../context/FinanceContextStore.js'
import { useHomework } from '../../context/HomeworkContextStore.js'
import { useStudents } from '../../context/StudentContext'
import { ROLES } from '../../constants/roles'
import { MOCK_BRANCH_ADMIN_BRANCH_ID } from '../../constants/scope'
import { PARENT_STUDENT_IDS, TEACHER_BRANCH_ID } from '../../data/studentDetails'
import { REPORT_PERIODS, STUDENT_LEARNING_RESULTS } from '../../data/reportDetails'

const TEACHER_CLASS_NAMES = ['Kindergarten A']

function money(value) {
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 }).format(value)
}

function StatCard({ title, value, note, tone }) {
  return <article className={`rounded-[22px] p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)] ${tone === 'yellow' ? 'bg-[#C3D3A4]' : 'bg-white'}`}><p className={`text-xs font-semibold uppercase tracking-wide ${tone === 'yellow' ? 'text-[#174B2B]/60' : 'text-[#888]'}`}>{title}</p><p className="mt-1 text-2xl font-extrabold text-[#174B2B]">{value}</p>{note && <p className={`mt-1 text-xs ${tone === 'yellow' ? 'text-[#174B2B]/55' : 'text-[#AAA]'}`}>{note}</p>}</article>
}

function ProgressBar({ value, colour = 'bg-[#C3D3A4]' }) {
  return <div className="h-2 w-full overflow-hidden rounded-full bg-[#EFEFEA]"><div className={`h-full rounded-full ${colour}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>
}

function downloadCsv(headers, rows, filename) {
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function DemoReports() {
  const { userRole } = useAuth()
  const { branches } = useBranches()
  const { students } = useStudents()
  const { classes } = useAcademics()
  const { records: attendance } = useAttendance()
  const { payments, expenses } = useFinance()
  const { assignments, submissions } = useHomework()
  const [branchFilter, setBranchFilter] = useState('all')
  const [period, setPeriod] = useState('term-3')
  const [activeReport, setActiveReport] = useState(null)

  const isSuperAdmin = userRole === ROLES.superAdmin
  const isBranchAdmin = userRole === ROLES.admin
  const isTeacher = userRole === ROLES.teacher
  const isParent = userRole === ROLES.parent
  const isAccountant = userRole === ROLES.accountant

  const reportOptions = isAccountant
    ? [{ id: 'finance', label: 'Financial' }]
    : isParent
      ? [{ id: 'child', label: 'My Child' }]
      : isTeacher
        ? [{ id: 'attendance', label: 'Attendance' }, { id: 'homework', label: 'Homework' }, { id: 'progress', label: 'Student Progress' }]
        : [{ id: 'overview', label: 'Overview' }, { id: 'attendance', label: 'Attendance' }, { id: 'finance', label: 'Financial' }, { id: 'homework', label: 'Homework' }, { id: 'progress', label: 'Student Progress' }]
  const selectedReport = activeReport && reportOptions.some((item) => item.id === activeReport) ? activeReport : reportOptions[0].id

  const scopedStudents = useMemo(() => students.filter((student) => {
    if (isParent) return PARENT_STUDENT_IDS.includes(student.id)
    if (isTeacher) return student.branchId === TEACHER_BRANCH_ID && TEACHER_CLASS_NAMES.includes(student.className)
    if (isBranchAdmin || isAccountant) return student.branchId === MOCK_BRANCH_ADMIN_BRANCH_ID
    if (isSuperAdmin && branchFilter !== 'all') return student.branchId === branchFilter
    return true
  }), [students, isParent, isTeacher, isBranchAdmin, isAccountant, isSuperAdmin, branchFilter])
  const studentIds = new Set(scopedStudents.map((student) => student.id))
  const scopedAttendance = attendance.filter((item) => studentIds.has(item.studentId))
  const scopedPayments = payments.filter((item) => !isSuperAdmin ? item.branchId === MOCK_BRANCH_ADMIN_BRANCH_ID : branchFilter === 'all' || item.branchId === branchFilter)
  const scopedExpenses = expenses.filter((item) => !isSuperAdmin ? item.branchId === MOCK_BRANCH_ADMIN_BRANCH_ID : branchFilter === 'all' || item.branchId === branchFilter)
  const scopedClasses = classes.filter((item) => {
    if (isTeacher) return item.branchId === TEACHER_BRANCH_ID && TEACHER_CLASS_NAMES.includes(item.name)
    if (isParent) return scopedStudents.some((student) => student.branchId === item.branchId && student.className === item.name)
    if (isBranchAdmin || isAccountant) return item.branchId === MOCK_BRANCH_ADMIN_BRANCH_ID
    return branchFilter === 'all' || item.branchId === branchFilter
  })
  const classIds = new Set(scopedClasses.map((item) => item.id))
  const scopedAssignments = assignments.filter((item) => classIds.has(item.classId))
  const assignmentIds = new Set(scopedAssignments.map((item) => item.id))
  const scopedSubmissions = submissions.filter((item) => assignmentIds.has(item.assignmentId) && studentIds.has(item.studentId))
  const scopedResults = STUDENT_LEARNING_RESULTS.filter((item) => studentIds.has(item.studentId))
  const scopedBranches = isSuperAdmin
    ? branches.filter((branch) => branchFilter === 'all' || branch.id === branchFilter)
    : branches.filter((branch) => branch.id === MOCK_BRANCH_ADMIN_BRANCH_ID)

  const presentCount = scopedAttendance.filter((item) => ['present', 'late'].includes(item.status)).length
  const attendanceRate = scopedAttendance.length ? Math.round((presentCount / scopedAttendance.length) * 100) : 0
  const collected = scopedPayments.filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0)
  const outstanding = scopedPayments.filter((item) => ['pending', 'partial', 'overdue'].includes(item.status)).reduce((sum, item) => sum + item.amount, 0)
  const approvedExpenses = scopedExpenses.filter((item) => item.status === 'approved').reduce((sum, item) => sum + item.amount, 0)
  const completedHomework = scopedSubmissions.filter((item) => ['submitted', 'reviewed'].includes(item.status)).length
  const homeworkRate = scopedSubmissions.length ? Math.round((completedHomework / scopedSubmissions.length) * 100) : 0
  const averageScore = scopedResults.length ? Math.round(scopedResults.reduce((sum, item) => sum + item.score, 0) / scopedResults.length) : 0

  const attendanceRows = scopedStudents.map((student) => {
    const records = scopedAttendance.filter((item) => item.studentId === student.id)
    const present = records.filter((item) => ['present', 'late'].includes(item.status)).length
    return { student, total: records.length, present, absent: records.filter((item) => ['absent', 'excused'].includes(item.status)).length, rate: records.length ? Math.round((present / records.length) * 100) : 0 }
  })
  const homeworkRows = scopedAssignments.map((assignment) => {
    const rows = scopedSubmissions.filter((item) => item.assignmentId === assignment.id)
    const completed = rows.filter((item) => ['submitted', 'reviewed'].includes(item.status)).length
    return { assignment, total: rows.length, completed, reviewed: rows.filter((item) => item.status === 'reviewed').length, rate: rows.length ? Math.round((completed / rows.length) * 100) : 0 }
  })

  function exportReport() {
    if (selectedReport === 'finance') {
      downloadCsv(['Metric', 'Amount'], [['Collected', collected], ['Outstanding', outstanding], ['Approved Expenses', approvedExpenses], ['Net', collected - approvedExpenses]], `financial-report-${period}.csv`)
    } else if (selectedReport === 'homework') {
      downloadCsv(['Homework', 'Class', 'Due Date', 'Completed', 'Total', 'Rate'], homeworkRows.map((row) => [row.assignment.title, classes.find((item) => item.id === row.assignment.classId)?.name, row.assignment.dueDate, row.completed, row.total, `${row.rate}%`]), `homework-report-${period}.csv`)
    } else if (selectedReport === 'progress' || selectedReport === 'child') {
      downloadCsv(['Student', 'Subject', 'Score', 'Level', 'Term'], scopedResults.map((row) => [students.find((item) => item.id === row.studentId)?.name, row.subject, row.score, row.level, row.term]), `student-progress-${period}.csv`)
    } else {
      downloadCsv(['Student', 'Class', 'Present', 'Absent', 'Total', 'Rate'], attendanceRows.map((row) => [row.student.name, row.student.className, row.present, row.absent, row.total, `${row.rate}%`]), `attendance-report-${period}.csv`)
    }
  }

  const heading = isSuperAdmin ? 'Platform Reports' : isBranchAdmin ? 'Branch Reports' : isTeacher ? 'Class Reports' : isParent ? 'My Child Reports' : 'Financial Reports'
  const description = isSuperAdmin ? 'Review performance across branches and export operational reports.' : isBranchAdmin ? 'Operational and financial insights for your branch.' : isTeacher ? 'Attendance, homework and learning progress for your class.' : isParent ? 'A private summary for your linked child only.' : 'Collections, outstanding fees, expenses and net cash position.'

  return (
    <div className="pb-2">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-extrabold text-[#174B2B]">{heading}</h2><p className="mt-1 text-sm text-[#888]">{description}</p></div><div className="flex flex-wrap gap-2">{isSuperAdmin && <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} className="rounded-full border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm"><option value="all">All Branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>}<select value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-full border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm">{REPORT_PERIODS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><button type="button" onClick={exportReport} className="rounded-full bg-[#C3D3A4] px-5 py-2.5 text-sm font-bold text-[#174B2B]">Export CSV</button></div></div>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">{isAccountant ? <><StatCard title="Collected" value={money(collected)} tone="yellow" /><StatCard title="Outstanding" value={money(outstanding)} /><StatCard title="Expenses" value={money(approvedExpenses)} /><StatCard title="Net" value={money(collected - approvedExpenses)} /></> : isParent ? <><StatCard title="Attendance" value={`${attendanceRate}%`} tone="yellow" /><StatCard title="Homework" value={`${homeworkRate}%`} /><StatCard title="Learning Average" value={`${averageScore}%`} /><StatCard title="Reports" value={scopedResults.length} note="Learning observations" /></> : <><StatCard title="Students" value={scopedStudents.length} /><StatCard title="Attendance" value={`${attendanceRate}%`} tone="yellow" /><StatCard title="Homework" value={`${homeworkRate}%`} /><StatCard title={isTeacher ? 'Learning Average' : 'Collected'} value={isTeacher ? `${averageScore}%` : money(collected)} /></>}</div>
      <section className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap gap-2 border-b border-[#F0F0F0] pb-4">{reportOptions.map((item) => <button key={item.id} type="button" onClick={() => setActiveReport(item.id)} className={`rounded-full px-4 py-2 text-sm font-bold ${selectedReport === item.id ? 'bg-[#174B2B] text-[#FAF4E7]' : 'bg-[#F4F0E5] text-[#777]'}`}>{item.label}</button>)}</div>
        {selectedReport === 'overview' && <OverviewReport branches={scopedBranches} students={scopedStudents} attendance={scopedAttendance} payments={scopedPayments} assignments={scopedAssignments} submissions={scopedSubmissions} />}
        {selectedReport === 'attendance' && <AttendanceReport rows={attendanceRows} />}
        {selectedReport === 'finance' && <FinanceReport payments={scopedPayments} expenses={scopedExpenses} students={students} collected={collected} outstanding={outstanding} approvedExpenses={approvedExpenses} />}
        {selectedReport === 'homework' && <HomeworkReport rows={homeworkRows} classes={classes} />}
        {selectedReport === 'progress' && <ProgressReport results={scopedResults} students={students} />}
        {selectedReport === 'child' && <ChildReport student={scopedStudents[0]} attendanceRows={attendanceRows} homeworkRows={homeworkRows} results={scopedResults} />}
      </section>
    </div>
  )
}

function OverviewReport({ branches, students, attendance, payments, assignments, submissions }) {
  return <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr className="border-b border-[#F0F0F0] text-xs font-bold uppercase text-[#888]"><th className="pb-3 pr-4">Branch</th><th className="pb-3 pr-4">Students</th><th className="pb-3 pr-4">Attendance</th><th className="pb-3 pr-4">Collected</th><th className="pb-3">Homework Completion</th></tr></thead><PaginatedBody>{branches.map((branch) => { const branchStudentIds = new Set(students.filter((item) => item.branchId === branch.id).map((item) => item.id)); const attendanceRows = attendance.filter((item) => branchStudentIds.has(item.studentId)); const attendancePresent = attendanceRows.filter((item) => ['present', 'late'].includes(item.status)).length; const attendanceRate = attendanceRows.length ? Math.round((attendancePresent / attendanceRows.length) * 100) : 0; const branchAssignmentIds = new Set(assignments.filter((item) => item.branchId === branch.id).map((item) => item.id)); const submissionRows = submissions.filter((item) => branchAssignmentIds.has(item.assignmentId)); const complete = submissionRows.filter((item) => ['submitted', 'reviewed'].includes(item.status)).length; const homeworkRate = submissionRows.length ? Math.round((complete / submissionRows.length) * 100) : 0; const collected = payments.filter((item) => item.branchId === branch.id && item.status === 'paid').reduce((sum, item) => sum + item.amount, 0); return <tr key={branch.id} className="border-b border-[#FAF4E7]"><td className="py-4 pr-4 font-bold text-[#174B2B]">{branch.name}</td><td className="py-4 pr-4">{branchStudentIds.size}</td><td className="py-4 pr-4"><div className="flex items-center gap-3"><span className="w-10 font-bold">{attendanceRate}%</span><div className="w-28"><ProgressBar value={attendanceRate} /></div></div></td><td className="py-4 pr-4 font-semibold">{money(collected)}</td><td className="py-4"><div className="flex items-center gap-3"><span className="w-10 font-bold">{homeworkRate}%</span><div className="w-28"><ProgressBar value={homeworkRate} colour="bg-[#174B2B]" /></div></div></td></tr> })}</PaginatedBody></table></div>
}

function AttendanceReport({ rows }) {
  return <ReportTable empty={rows.length === 0}><thead><tr className="border-b border-[#F0F0F0] text-xs font-bold uppercase text-[#888]"><th className="pb-3 pr-4">Student</th><th className="pb-3 pr-4">Class</th><th className="pb-3 pr-4">Present</th><th className="pb-3 pr-4">Absent</th><th className="pb-3">Rate</th></tr></thead><PaginatedBody>{rows.map((row) => <tr key={row.student.id} className="border-b border-[#FAF4E7]"><td className="py-4 pr-4 font-bold">{row.student.name}</td><td className="py-4 pr-4 text-[#666]">{row.student.className}</td><td className="py-4 pr-4">{row.present}</td><td className="py-4 pr-4">{row.absent}</td><td className="py-4"><div className="flex items-center gap-3"><span className="w-10 font-bold">{row.rate}%</span><div className="w-36"><ProgressBar value={row.rate} /></div></div></td></tr>)}</PaginatedBody></ReportTable>
}

function FinanceReport({ payments, expenses, students, collected, outstanding, approvedExpenses }) {
  return <div className="mt-5"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-[#F2F0DF] p-4"><p className="text-xs text-[#888]">Collected</p><p className="mt-1 font-extrabold">{money(collected)}</p></div><div className="rounded-2xl bg-[#FFF5F5] p-4"><p className="text-xs text-[#888]">Outstanding</p><p className="mt-1 font-extrabold">{money(outstanding)}</p></div><div className="rounded-2xl bg-[#F4F0E5] p-4"><p className="text-xs text-[#888]">Approved Expenses</p><p className="mt-1 font-extrabold">{money(approvedExpenses)}</p></div></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-[#F0F0F0] text-xs font-bold uppercase text-[#888]"><th className="pb-3 pr-4">Reference</th><th className="pb-3 pr-4">Description</th><th className="pb-3 pr-4">Type</th><th className="pb-3 pr-4">Status</th><th className="pb-3">Amount</th></tr></thead><PaginatedBody>{payments.map((item) => <tr key={item.id} className="border-b border-[#FAF4E7]"><td className="py-4 pr-4 font-bold">{item.invoiceNo}</td><td className="py-4 pr-4">{students.find((student) => student.id === item.studentId)?.name}</td><td className="py-4 pr-4 text-[#666]">Payment</td><td className="py-4 pr-4 capitalize">{item.status}</td><td className="py-4 font-semibold">{money(item.amount)}</td></tr>)}{expenses.map((item) => <tr key={item.id} className="border-b border-[#FAF4E7]"><td className="py-4 pr-4 font-bold">{item.expenseDate}</td><td className="py-4 pr-4">{item.description}</td><td className="py-4 pr-4 text-[#666]">Expense</td><td className="py-4 pr-4 capitalize">{item.status}</td><td className="py-4 font-semibold text-[#C62828]">-{money(item.amount)}</td></tr>)}</PaginatedBody></table></div></div>
}

function HomeworkReport({ rows, classes }) {
  return <ReportTable empty={rows.length === 0}><thead><tr className="border-b border-[#F0F0F0] text-xs font-bold uppercase text-[#888]"><th className="pb-3 pr-4">Homework</th><th className="pb-3 pr-4">Class</th><th className="pb-3 pr-4">Due</th><th className="pb-3 pr-4">Reviewed</th><th className="pb-3">Completion</th></tr></thead><PaginatedBody>{rows.map((row) => <tr key={row.assignment.id} className="border-b border-[#FAF4E7]"><td className="py-4 pr-4 font-bold">{row.assignment.title}</td><td className="py-4 pr-4 text-[#666]">{classes.find((item) => item.id === row.assignment.classId)?.name}</td><td className="py-4 pr-4">{row.assignment.dueDate}</td><td className="py-4 pr-4">{row.reviewed}/{row.total}</td><td className="py-4"><div className="flex items-center gap-3"><span className="w-10 font-bold">{row.rate}%</span><div className="w-36"><ProgressBar value={row.rate} /></div></div></td></tr>)}</PaginatedBody></ReportTable>
}

function ProgressReport({ results, students }) {
  return <ReportTable empty={results.length === 0}><thead><tr className="border-b border-[#F0F0F0] text-xs font-bold uppercase text-[#888]"><th className="pb-3 pr-4">Student</th><th className="pb-3 pr-4">Subject</th><th className="pb-3 pr-4">Term</th><th className="pb-3 pr-4">Level</th><th className="pb-3">Score</th></tr></thead><PaginatedBody>{results.map((row) => <tr key={`${row.studentId}-${row.subject}`} className="border-b border-[#FAF4E7]"><td className="py-4 pr-4 font-bold">{students.find((item) => item.id === row.studentId)?.name}</td><td className="py-4 pr-4">{row.subject}</td><td className="py-4 pr-4 text-[#666]">{row.term}</td><td className="py-4 pr-4">{row.level}</td><td className="py-4"><div className="flex items-center gap-3"><span className="w-10 font-bold">{row.score}%</span><div className="w-36"><ProgressBar value={row.score} /></div></div></td></tr>)}</PaginatedBody></ReportTable>
}

function ChildReport({ student, attendanceRows, homeworkRows, results }) {
  if (!student) return <p className="py-12 text-center text-sm text-[#888]">No child is linked to this account.</p>
  const attendance = attendanceRows[0]
  return <div className="mt-5"><div className="rounded-[24px] bg-[#174B2B] p-6 text-white"><p className="text-xs font-bold uppercase tracking-wide text-[#FAF4E7]">Private child report</p><h3 className="mt-2 text-xl font-extrabold !text-white">{student.name}</h3><p className="mt-1 text-sm text-white/60">{student.className} · Age {student.age}</p><div className="mt-5 grid grid-cols-3 gap-3"><div><p className="text-xs text-white/50">Attendance</p><p className="mt-1 text-lg font-bold">{attendance?.rate ?? 0}%</p></div><div><p className="text-xs text-white/50">Homework</p><p className="mt-1 text-lg font-bold">{homeworkRows.filter((row) => row.completed > 0).length}/{homeworkRows.length}</p></div><div><p className="text-xs text-white/50">Subjects</p><p className="mt-1 text-lg font-bold">{results.length}</p></div></div></div><div className="mt-5"><ProgressReport results={results} students={[student]} /></div></div>
}

function ReportTable({ children, empty }) {
  if (empty) return <p className="py-12 text-center text-sm text-[#888]">No report data is available for this selection.</p>
  return <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">{children}</table></div>
}
