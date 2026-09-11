import PaginatedBody from '../../components/ui/PaginatedBody'
import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useAttendance } from '../../context/AttendanceContextStore.js'
import { useAcademics } from '../../context/AcademicContext'
import { useBranches } from '../../context/BranchContext'
import { useStudents } from '../../context/StudentContext'
import { ROLES } from '../../constants/roles'
import { MOCK_BRANCH_ADMIN_BRANCH_ID } from '../../constants/scope'
import { PARENT_STUDENT_IDS, TEACHER_BRANCH_ID } from '../../data/studentDetails'
import { ATTENDANCE_STATUSES } from '../../data/attendanceDetails'
import AbsenceReasonModal from '../../components/attendance/AbsenceReasonModal'

const TODAY = '2026-09-02'
const MOCK_CURRENT_TEACHER_ID = 'st3'

const STATUS_STYLE = {
  present: 'bg-[#E8F5E9] text-[#2E7D32]',
  late: 'bg-[#FFF3E0] text-[#E65100]',
  absent: 'bg-[#FFEBEE] text-[#C62828]',
  excused: 'bg-[#E3F2FD] text-[#1565C0]',
  unmarked: 'bg-[#F4F0E5] text-[#777]',
}

function formatStatus(status) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function StatusBadge({ status }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[status] ?? STATUS_STYLE.unmarked}`}>{formatStatus(status)}</span>
}

function StatCard({ label, value, sub, accent }) {
  return (
    <article className="rounded-[22px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-[#888]">{label}</p><p className="mt-1 text-2xl font-extrabold text-[#174B2B]">{value}</p>{sub && <p className="mt-1 text-xs text-[#AAA]">{sub}</p>}</div>
        {accent && <span className={`mt-1 h-3 w-3 rounded-full ${accent}`} />}
      </div>
    </article>
  )
}

function getRecord(records, studentId, date) {
  return records.find((record) => record.studentId === studentId && record.date === date)
}

function downloadCsv(rows, date) {
  const headers = ['Student', 'Branch', 'Class', 'Date', 'Status', 'Check In', 'Check Out', 'Remarks']
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `attendance-${date}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function AttendanceManagement() {
  const { userRole } = useAuth()
  const { records, setStudentAttendance, markAllPresent, submitAbsenceReason } = useAttendance()
  const { classes } = useAcademics()
  const { branches } = useBranches()
  const { students } = useStudents()
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const [branchFilter, setBranchFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [reasonRecord, setReasonRecord] = useState(null)

  const isSuperAdmin = userRole === ROLES.superAdmin
  const isBranchAdmin = userRole === ROLES.admin
  const isTeacher = userRole === ROLES.teacher
  const isParent = userRole === ROLES.parent
  const branchMap = Object.fromEntries(branches.map((branch) => [branch.id, branch.name]))
  const classMap = Object.fromEntries(classes.map((item) => [item.id, item]))

  const scopedClasses = useMemo(() => {
    if (isSuperAdmin) return classes
    if (isBranchAdmin) return classes.filter((item) => item.branchId === MOCK_BRANCH_ADMIN_BRANCH_ID)
    if (isTeacher) return classes.filter((item) => item.branchId === TEACHER_BRANCH_ID && item.teacherId === MOCK_CURRENT_TEACHER_ID)
    return []
  }, [classes, isSuperAdmin, isBranchAdmin, isTeacher])

  const scopedStudents = useMemo(() => {
    if (isSuperAdmin) return students.filter((student) => student.status === 'active')
    if (isBranchAdmin) return students.filter((student) => student.branchId === MOCK_BRANCH_ADMIN_BRANCH_ID && student.status === 'active')
    if (isTeacher) {
      const allowedClassNames = new Set(scopedClasses.map((item) => item.name))
      return students.filter((student) => student.branchId === TEACHER_BRANCH_ID && allowedClassNames.has(student.className) && student.status === 'active')
    }
    if (isParent) return students.filter((student) => PARENT_STUDENT_IDS.includes(student.id))
    return []
  }, [students, scopedClasses, isSuperAdmin, isBranchAdmin, isTeacher, isParent])

  const visibleClasses = scopedClasses.filter((item) => branchFilter === 'all' || item.branchId === branchFilter)
  const visibleStudents = scopedStudents.filter((student) => {
    const classRecord = classes.find((item) => item.branchId === student.branchId && item.name === student.className)
    const matchesBranch = branchFilter === 'all' || student.branchId === branchFilter
    const matchesClass = classFilter === 'all' || classRecord?.id === classFilter
    const matchesSearch = student.name.toLowerCase().includes(search.toLowerCase())
    return matchesBranch && matchesClass && matchesSearch
  })

  const dailyRows = visibleStudents.map((student) => ({
    student,
    classRecord: classes.find((item) => item.branchId === student.branchId && item.name === student.className),
    record: getRecord(records, student.id, selectedDate),
  }))

  const dailyStats = {
    present: dailyRows.filter(({ record }) => record?.status === 'present').length,
    late: dailyRows.filter(({ record }) => record?.status === 'late').length,
    absent: dailyRows.filter(({ record }) => ['absent', 'excused'].includes(record?.status)).length,
    unmarked: dailyRows.filter(({ record }) => !record).length,
  }
  const attendanceRate = dailyRows.length ? Math.round(((dailyStats.present + dailyStats.late) / dailyRows.length) * 100) : 0

  function changeStatus(student, classRecord, status) {
    setStudentAttendance({ studentId: student.id, classId: classRecord?.id, date: selectedDate, status })
  }

  function exportAttendance() {
    downloadCsv(dailyRows.map(({ student, classRecord, record }) => [
      student.name,
      branchMap[student.branchId],
      classRecord?.name ?? student.className,
      selectedDate,
      record?.status ?? 'unmarked',
      record?.checkIn ?? '',
      record?.checkOut ?? '',
      record?.remarks ?? '',
    ]), selectedDate)
  }

  if (isParent) {
    const childIds = new Set(scopedStudents.map((student) => student.id))
    const history = records
      .filter((record) => childIds.has(record.studentId))
      .sort((a, b) => b.date.localeCompare(a.date))
    const present = history.filter((record) => record.status === 'present').length
    const late = history.filter((record) => record.status === 'late').length
    const absent = history.filter((record) => ['absent', 'excused'].includes(record.status)).length
    const rate = history.length ? Math.round(((present + late) / history.length) * 100) : 0
    const selectedStudent = reasonRecord ? students.find((student) => student.id === reasonRecord.studentId) : null

    return (
      <div className="pb-2">
        <div><h2 className="text-2xl font-extrabold text-[#174B2B]">My Child&apos;s Attendance</h2><p className="mt-1 text-sm text-[#888]">View attendance history and submit an explanation for an absence.</p></div>
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Attendance Rate" value={`${rate}%`} sub={`${history.length} school days`} />
          <StatCard label="Present" value={present} accent="bg-[#43A047]" />
          <StatCard label="Late" value={late} accent="bg-[#FB8C00]" />
          <StatCard label="Absent / Excused" value={absent} accent="bg-[#E53935]" />
        </div>
        <section className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
          <div className="mb-4"><h3 className="text-base font-bold text-[#174B2B]">Attendance History</h3><p className="mt-1 text-xs text-[#888]">Attendance status is recorded by the school. Reasons submitted here are reviewed separately.</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-[#F0F0F0] text-xs font-bold uppercase tracking-wide text-[#888]"><th className="pb-3 pr-4">Date</th><th className="pb-3 pr-4">Child</th><th className="pb-3 pr-4">Class</th><th className="pb-3 pr-4">Status</th><th className="pb-3 pr-4">Check In</th><th className="pb-3">Reason / Action</th></tr></thead>
              <PaginatedBody>{history.map((record) => { const child = students.find((student) => student.id === record.studentId); return <tr key={record.id} className="border-b border-[#FAF4E7] last:border-0"><td className="py-4 pr-4 font-semibold text-[#174B2B]">{record.date}</td><td className="py-4 pr-4">{child?.name}</td><td className="py-4 pr-4 text-[#666]">{classMap[record.classId]?.name ?? child?.className}</td><td className="py-4 pr-4"><StatusBadge status={record.status} /></td><td className="py-4 pr-4 text-[#666]">{record.checkIn || '—'}</td><td className="py-4"><div className="flex items-center gap-3"><span className="max-w-[280px] truncate text-xs text-[#777]">{record.absenceReason || (['absent', 'excused'].includes(record.status) ? 'No reason submitted' : '—')}</span>{['absent', 'excused'].includes(record.status) && <button type="button" onClick={() => setReasonRecord(record)} className="shrink-0 rounded-full border border-[#E5E5E5] px-3 py-1.5 text-xs font-bold text-[#555]">{record.absenceReason ? 'Update' : 'Submit Reason'}</button>}</div></td></tr> })}</PaginatedBody>
            </table>
          </div>
        </section>
        <AbsenceReasonModal key={reasonRecord?.id ?? 'no-record'} open={Boolean(reasonRecord)} record={reasonRecord} student={selectedStudent} onClose={() => setReasonRecord(null)} onSubmit={submitAbsenceReason} />
      </div>
    )
  }

  const selectedClass = scopedClasses.find((item) => item.id === classFilter)
  const canExport = isSuperAdmin || isBranchAdmin
  const roleDescription = isSuperAdmin
    ? 'Monitor, correct and export attendance across all branches.'
    : isBranchAdmin
      ? 'Manage daily attendance for students in your branch.'
      : 'Take daily attendance for your assigned class.'

  return (
    <div className="pb-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-2xl font-extrabold text-[#174B2B]">Attendance</h2><p className="mt-1 text-sm text-[#888]">{roleDescription}</p></div>
        <div className="flex gap-2">
          {canExport && <button type="button" onClick={exportAttendance} className="rounded-full border border-[#E5E5E5] bg-white px-5 py-2.5 text-sm font-bold text-[#555]">Export CSV</button>}
          {selectedClass && <button type="button" onClick={() => markAllPresent(visibleStudents, selectedClass.id, selectedDate)} className="rounded-full bg-[#C3D3A4] px-5 py-2.5 text-sm font-bold text-[#174B2B]">Mark All Present</button>}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Attendance Rate" value={`${attendanceRate}%`} sub={`${dailyRows.length} students`} />
        <StatCard label="Present" value={dailyStats.present} accent="bg-[#43A047]" />
        <StatCard label="Late" value={dailyStats.late} accent="bg-[#FB8C00]" />
        <StatCard label="Absent / Excused" value={dailyStats.absent} accent="bg-[#E53935]" />
        <StatCard label="Not Marked" value={dailyStats.unmarked} accent="bg-[#BDBDBD]" />
      </div>

      <section className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-base font-bold text-[#174B2B]">Daily Register</h3><p className="mt-1 text-xs text-[#888]">Changes are saved to the selected date.</p></div>
          <div className="flex flex-wrap gap-2">
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm" />
            {isSuperAdmin && <select value={branchFilter} onChange={(event) => { setBranchFilter(event.target.value); setClassFilter('all') }} className="rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm"><option value="all">All Branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>}
            <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm"><option value="all">All Classes</option>{visibleClasses.map((item) => <option key={item.id} value={item.id}>{isSuperAdmin && branchFilter === 'all' ? `${branchMap[item.branchId]} · ` : ''}{item.name}</option>)}</select>
            <input type="search" placeholder="Search student..." value={search} onChange={(event) => setSearch(event.target.value)} className="rounded-full border border-[#E5E5E5] px-4 py-2 text-sm outline-none focus:border-[#638753]" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b border-[#F0F0F0] text-xs font-bold uppercase tracking-wide text-[#888]"><th className="pb-3 pr-4">Student</th>{isSuperAdmin && <th className="pb-3 pr-4">Branch</th>}<th className="pb-3 pr-4">Class</th><th className="pb-3 pr-4">Check In</th><th className="pb-3 pr-4">Status</th><th className="pb-3">Remarks</th></tr></thead>
            <PaginatedBody>{dailyRows.map(({ student, classRecord, record }) => <tr key={student.id} className="border-b border-[#FAF4E7] last:border-0"><td className="py-4 pr-4"><p className="font-bold text-[#174B2B]">{student.name}</p><p className="mt-0.5 text-xs text-[#AAA]">Age {student.age}</p></td>{isSuperAdmin && <td className="py-4 pr-4 text-[#666]">{branchMap[student.branchId]}</td>}<td className="py-4 pr-4 text-[#555]">{classRecord?.name ?? student.className}</td><td className="py-4 pr-4 text-[#666]">{record?.checkIn || '—'}</td><td className="py-4 pr-4"><select aria-label={`Attendance status for ${student.name}`} value={record?.status ?? 'unmarked'} onChange={(event) => changeStatus(student, classRecord, event.target.value)} className={`rounded-full border-0 px-3 py-1.5 text-xs font-bold outline-none ${STATUS_STYLE[record?.status ?? 'unmarked']}`}><option value="unmarked" disabled>Not Marked</option>{ATTENDANCE_STATUSES.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}</select></td><td className="py-4 text-xs text-[#777]">{record?.absenceReason || record?.remarks || '—'}</td></tr>)}</PaginatedBody>
          </table>
          {dailyRows.length === 0 && <p className="py-12 text-center text-sm text-[#888]">No students found for this selection.</p>}
        </div>
      </section>
    </div>
  )
}
