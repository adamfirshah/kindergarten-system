import PaginatedBody from '../../components/ui/PaginatedBody'
import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useAttendance } from '../../context/AttendanceContextStore.js'
import { useBranches } from '../../context/BranchContext'
import { useFinance } from '../../context/FinanceContextStore.js'
import { useHomework } from '../../context/HomeworkContextStore.js'
import { useStudents } from '../../context/StudentContext'
import { ROLES } from '../../constants/roles'
import { MOCK_BRANCH_ADMIN_BRANCH_ID } from '../../constants/scope'

const PRIORITY_ORDER = { high: 0, medium: 1, positive: 2 }

function money(value) {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    maximumFractionDigits: 0,
  }).format(value)
}

function percentage(value) {
  return `${Math.round(value)}%`
}

function rate(items, predicate) {
  if (!items.length) return 0
  return (items.filter(predicate).length / items.length) * 100
}

function ProgressBar({ value, tone = 'yellow' }) {
  const colours = {
    yellow: 'bg-[#C3D3A4]',
    green: 'bg-[#42A86B]',
    red: 'bg-[#E15A5A]',
    black: 'bg-[#174B2B]',
  }
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#EEEDE8]">
      <div
        className={`h-full rounded-full ${colours[tone]}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

function MetricCard({ label, value, note, accent = false }) {
  return (
    <article className={`rounded-[22px] p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)] ${accent ? 'bg-[#C3D3A4]' : 'bg-white'}`}>
      <p className={`text-xs font-bold uppercase tracking-wide ${accent ? 'text-black/55' : 'text-[#8B8B8B]'}`}>{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-[#174B2B]">{value}</p>
      <p className={`mt-1 text-xs ${accent ? 'text-black/55' : 'text-[#AAA]'}`}>{note}</p>
    </article>
  )
}

function buildBranchMetric(branch, students, attendance, payments, expenses, assignments, submissions) {
  const branchStudents = students.filter((item) => item.branchId === branch.id)
  const studentIds = new Set(branchStudents.map((item) => item.id))
  const attendanceRows = attendance.filter((item) => studentIds.has(item.studentId))
  const attendanceRate = rate(attendanceRows, (item) => ['present', 'late'].includes(item.status))
  const attendanceDates = [...new Set(attendanceRows.map((item) => item.date))].sort().reverse()
  const latestRows = attendanceRows.filter((item) => attendanceDates.slice(0, 2).includes(item.date))
  const previousRows = attendanceRows.filter((item) => attendanceDates.slice(2).includes(item.date))
  const attendanceTrend = rate(latestRows, (item) => ['present', 'late'].includes(item.status))
    - rate(previousRows, (item) => ['present', 'late'].includes(item.status))

  const branchAssignments = assignments.filter((item) => item.branchId === branch.id)
  const assignmentIds = new Set(branchAssignments.map((item) => item.id))
  const homeworkRows = submissions.filter((item) => assignmentIds.has(item.assignmentId))
  const homeworkRate = rate(homeworkRows, (item) => ['submitted', 'reviewed'].includes(item.status))
  const branchPayments = payments.filter((item) => item.branchId === branch.id)
  const collected = branchPayments.filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0)
  const outstanding = branchPayments.filter((item) => ['pending', 'partial', 'overdue'].includes(item.status)).reduce((sum, item) => sum + item.amount, 0)
  const overdueCount = branchPayments.filter((item) => item.status === 'overdue').length
  const approvedExpenses = expenses.filter((item) => item.branchId === branch.id && item.status === 'approved').reduce((sum, item) => sum + item.amount, 0)
  const occupancyRate = branch.capacity ? (branch.students / branch.capacity) * 100 : 0

  let riskScore = 0
  if (attendanceRows.length && attendanceRate < 80) riskScore += 35
  else if (attendanceRows.length && attendanceRate < 90) riskScore += 15
  if (homeworkRows.length && homeworkRate < 60) riskScore += 30
  else if (homeworkRows.length && homeworkRate < 80) riskScore += 15
  if (overdueCount > 0) riskScore += 20
  else if (outstanding > 0) riskScore += 10
  if (occupancyRate >= 95) riskScore += 10
  if (branch.status !== 'active') riskScore += 20

  const availableSources = [attendanceRows.length, branchPayments.length, homeworkRows.length, branchStudents.length].filter(Boolean).length
  return {
    branch,
    students: branchStudents.length,
    attendanceRate,
    attendanceTrend,
    homeworkRate,
    collected,
    outstanding,
    approvedExpenses,
    overdueCount,
    occupancyRate,
    forecastCollection: collected + (outstanding * 0.65),
    healthScore: Math.max(0, 100 - riskScore),
    confidence: availableSources * 25,
  }
}

function buildInsights(metrics) {
  const insights = []
  metrics.forEach((metric) => {
    const branchName = metric.branch.name
    if (metric.branch.status !== 'active') {
      insights.push({ id: `${metric.branch.id}-inactive`, priority: 'high', title: `${branchName} is inactive`, detail: 'Operational signals should be reviewed before this branch is reactivated.', action: 'Review branch status' })
    }
    if (metric.attendanceRate && metric.attendanceRate < 90) {
      insights.push({ id: `${metric.branch.id}-attendance`, priority: metric.attendanceRate < 80 ? 'high' : 'medium', title: `Attendance requires attention at ${branchName}`, detail: `Current attendance is ${percentage(metric.attendanceRate)} with a ${metric.attendanceTrend >= 0 ? '+' : ''}${Math.round(metric.attendanceTrend)} point short-term movement.`, action: 'Review absent students' })
    }
    if (metric.homeworkRate && metric.homeworkRate < 75) {
      insights.push({ id: `${metric.branch.id}-homework`, priority: metric.homeworkRate < 60 ? 'high' : 'medium', title: `Homework completion is low at ${branchName}`, detail: `Only ${percentage(metric.homeworkRate)} of tracked submissions are completed or reviewed.`, action: 'Follow up with classes' })
    }
    if (metric.overdueCount > 0) {
      insights.push({ id: `${metric.branch.id}-finance`, priority: 'high', title: `${metric.overdueCount} overdue payment${metric.overdueCount > 1 ? 's' : ''} at ${branchName}`, detail: `${money(metric.outstanding)} remains outstanding across pending, partial and overdue fees.`, action: 'Open finance follow-up' })
    }
    if (metric.occupancyRate >= 90) {
      insights.push({ id: `${metric.branch.id}-capacity`, priority: 'medium', title: `${branchName} is nearing capacity`, detail: `Current enrolment uses ${percentage(metric.occupancyRate)} of available branch capacity.`, action: 'Plan class capacity' })
    }
  })
  if (!insights.length) {
    insights.push({ id: 'healthy', priority: 'positive', title: 'No priority risks detected', detail: 'Current attendance, homework, finance and capacity signals are within the configured thresholds.', action: 'Continue monitoring' })
  }
  return insights.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
}

function buildStudentRisks(students, attendance, payments, submissions) {
  return students.map((student) => {
    const attendanceRows = attendance.filter((item) => item.studentId === student.id)
    const attendanceRate = rate(attendanceRows, (item) => ['present', 'late'].includes(item.status))
    const homeworkRows = submissions.filter((item) => item.studentId === student.id)
    const homeworkRate = rate(homeworkRows, (item) => ['submitted', 'reviewed'].includes(item.status))
    const unpaid = payments.filter((item) => item.studentId === student.id && ['pending', 'partial', 'overdue'].includes(item.status))
    let score = 0
    if (attendanceRows.length && attendanceRate < 80) score += 45
    else if (attendanceRows.length && attendanceRate < 90) score += 25
    if (homeworkRows.length && homeworkRate < 50) score += 35
    else if (homeworkRows.length && homeworkRate < 80) score += 15
    if (unpaid.some((item) => item.status === 'overdue')) score += 20
    else if (unpaid.length) score += 10
    return {
      student,
      attendanceRate,
      homeworkRate,
      unpaid: unpaid.reduce((sum, item) => sum + item.amount, 0),
      score,
      level: score >= 50 ? 'Attention' : score >= 25 ? 'Monitor' : 'Stable',
    }
  }).sort((a, b) => b.score - a.score)
}

export default function AIAnalyticsManagement() {
  const { userRole } = useAuth()
  const { branches } = useBranches()
  const { students } = useStudents()
  const { records: attendance } = useAttendance()
  const { payments, expenses } = useFinance()
  const { assignments, submissions } = useHomework()
  const [branchFilter, setBranchFilter] = useState('all')
  const [activeView, setActiveView] = useState('overview')

  const isSuperAdmin = userRole === ROLES.superAdmin
  const isBranchAdmin = userRole === ROLES.admin
  const visibleBranches = useMemo(() => branches.filter((branch) => {
    if (isBranchAdmin) return branch.id === MOCK_BRANCH_ADMIN_BRANCH_ID
    if (!isSuperAdmin) return false
    return branchFilter === 'all' || branch.id === branchFilter
  }), [branches, branchFilter, isBranchAdmin, isSuperAdmin])

  const metrics = useMemo(
    () => visibleBranches.map((branch) => buildBranchMetric(branch, students, attendance, payments, expenses, assignments, submissions)),
    [visibleBranches, students, attendance, payments, expenses, assignments, submissions],
  )
  const scopedBranchIds = new Set(visibleBranches.map((branch) => branch.id))
  const scopedStudents = students.filter((student) => scopedBranchIds.has(student.branchId))
  const studentRisks = buildStudentRisks(scopedStudents, attendance, payments, submissions)
  const insights = buildInsights(metrics)
  const priorityAlerts = insights.filter((item) => item.priority === 'high').length
  const averageHealth = metrics.length ? metrics.reduce((sum, item) => sum + item.healthScore, 0) / metrics.length : 0
  const averageConfidence = metrics.length ? metrics.reduce((sum, item) => sum + item.confidence, 0) / metrics.length : 0
  const totalOutstanding = metrics.reduce((sum, item) => sum + item.outstanding, 0)

  if (!isSuperAdmin && !isBranchAdmin) {
    return <div className="rounded-[28px] bg-white p-10 text-center text-sm text-[#777]">AI Analytics is available to platform and branch administrators only.</div>
  }

  return (
    <div className="pb-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-extrabold text-[#174B2B]">AI Analytics</h2>
            <span className="rounded-full bg-[#FFF3B0] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#745F00]">Explainable preview</span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-[#888]">Prioritised operational signals calculated from attendance, finance, homework and branch capacity. No external AI model is connected yet.</p>
        </div>
        {isSuperAdmin && (
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} className="rounded-full border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm">
            <option value="all">All Branches</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Health Score" value={percentage(averageHealth)} note="Across visible branches" accent />
        <MetricCard label="Priority Alerts" value={priorityAlerts} note="Requires administrator review" />
        <MetricCard label="Outstanding" value={money(totalOutstanding)} note="Pending, partial and overdue" />
        <MetricCard label="Data Confidence" value={percentage(averageConfidence)} note="Availability across four sources" />
      </div>

      <section className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap gap-2 border-b border-[#F0F0F0] pb-4">
          {[
            { id: 'overview', label: 'Branch Health' },
            { id: 'signals', label: 'Priority Signals' },
            { id: 'students', label: 'Student Risk' },
            { id: 'forecast', label: 'Financial Outlook' },
          ].map((item) => (
            <button key={item.id} type="button" onClick={() => setActiveView(item.id)} className={`rounded-full px-4 py-2 text-sm font-bold ${activeView === item.id ? 'bg-[#174B2B] text-[#FAF4E7]' : 'bg-[#F4F0E5] text-[#777]'}`}>{item.label}</button>
          ))}
        </div>

        {activeView === 'overview' && <BranchHealth metrics={metrics} />}
        {activeView === 'signals' && <PrioritySignals insights={insights} />}
        {activeView === 'students' && <StudentRisk rows={studentRisks} />}
        {activeView === 'forecast' && <FinancialOutlook metrics={metrics} />}
      </section>

      <p className="mt-4 text-xs leading-5 text-[#999]">These indicators are decision support only. Administrators should verify source records before taking action. Thresholds are deterministic and auditable; a future model integration can be added without changing operational data.</p>
    </div>
  )
}

function BranchHealth({ metrics }) {
  if (!metrics.length) return <EmptyState />
  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      {metrics.map((metric) => {
        const tone = metric.healthScore >= 80 ? 'green' : metric.healthScore >= 60 ? 'yellow' : 'red'
        return (
          <article key={metric.branch.id} className="rounded-[24px] border border-[#EEEDE8] p-5">
            <div className="flex items-start justify-between gap-4">
              <div><h3 className="font-extrabold text-[#174B2B]">{metric.branch.name}</h3><p className="mt-1 text-xs text-[#999]">{metric.students} tracked students · {metric.branch.status}</p></div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${metric.healthScore >= 80 ? 'bg-[#E9F7EF] text-[#267A48]' : metric.healthScore >= 60 ? 'bg-[#FFF6D2] text-[#856A00]' : 'bg-[#FDECEC] text-[#B63838]'}`}>{Math.round(metric.healthScore)} health</span>
            </div>
            <div className="mt-5 space-y-4">
              <SignalRow label="Attendance" value={metric.attendanceRate} tone={metric.attendanceRate >= 90 ? 'green' : 'yellow'} />
              <SignalRow label="Homework completion" value={metric.homeworkRate} tone={metric.homeworkRate >= 75 ? 'green' : 'yellow'} />
              <SignalRow label="Capacity used" value={metric.occupancyRate} tone={metric.occupancyRate >= 95 ? 'red' : 'black'} />
              <SignalRow label="Overall health" value={metric.healthScore} tone={tone} />
            </div>
          </article>
        )
      })}
    </div>
  )
}

function SignalRow({ label, value, tone }) {
  return <div><div className="mb-1.5 flex justify-between text-xs"><span className="font-semibold text-[#666]">{label}</span><span className="font-bold text-[#174B2B]">{percentage(value)}</span></div><ProgressBar value={value} tone={tone} /></div>
}

function PrioritySignals({ insights }) {
  return (
    <div className="mt-5 space-y-3">
      {insights.map((item) => (
        <article key={item.id} className="flex flex-col gap-4 rounded-[22px] border border-[#EEEDE8] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${item.priority === 'high' ? 'bg-[#E15A5A]' : item.priority === 'medium' ? 'bg-[#C3D3A4]' : 'bg-[#42A86B]'}`} />
            <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold text-[#174B2B]">{item.title}</h3><span className="text-[10px] font-bold uppercase tracking-wide text-[#999]">{item.priority}</span></div><p className="mt-1 text-sm leading-6 text-[#777]">{item.detail}</p></div>
          </div>
          <span className="shrink-0 rounded-full bg-[#F4F0E5] px-4 py-2 text-xs font-bold text-[#555]">{item.action}</span>
        </article>
      ))}
    </div>
  )
}

function StudentRisk({ rows }) {
  if (!rows.length) return <EmptyState />
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[780px] text-left text-sm">
        <thead><tr className="border-b border-[#EEEDE8] text-xs font-bold uppercase text-[#888]"><th className="pb-3 pr-4">Student</th><th className="pb-3 pr-4">Class</th><th className="pb-3 pr-4">Attendance</th><th className="pb-3 pr-4">Homework</th><th className="pb-3 pr-4">Outstanding</th><th className="pb-3">Signal</th></tr></thead>
        <PaginatedBody>{rows.map((row) => <tr key={row.student.id} className="border-b border-[#F7F6F2]"><td className="py-4 pr-4 font-bold text-[#174B2B]">{row.student.name}</td><td className="py-4 pr-4 text-[#666]">{row.student.className}</td><td className="py-4 pr-4">{percentage(row.attendanceRate)}</td><td className="py-4 pr-4">{percentage(row.homeworkRate)}</td><td className="py-4 pr-4">{money(row.unpaid)}</td><td className="py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${row.level === 'Attention' ? 'bg-[#FDECEC] text-[#B63838]' : row.level === 'Monitor' ? 'bg-[#FFF6D2] text-[#856A00]' : 'bg-[#E9F7EF] text-[#267A48]'}`}>{row.level} · {row.score}</span></td></tr>)}</PaginatedBody>
      </table>
    </div>
  )
}

function FinancialOutlook({ metrics }) {
  if (!metrics.length) return <EmptyState />
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[780px] text-left text-sm">
        <thead><tr className="border-b border-[#EEEDE8] text-xs font-bold uppercase text-[#888]"><th className="pb-3 pr-4">Branch</th><th className="pb-3 pr-4">Collected</th><th className="pb-3 pr-4">Outstanding</th><th className="pb-3 pr-4">Expenses</th><th className="pb-3">Estimated Collection</th></tr></thead>
        <PaginatedBody>{metrics.map((metric) => <tr key={metric.branch.id} className="border-b border-[#F7F6F2]"><td className="py-4 pr-4 font-bold text-[#174B2B]">{metric.branch.name}</td><td className="py-4 pr-4">{money(metric.collected)}</td><td className="py-4 pr-4 text-[#B63838]">{money(metric.outstanding)}</td><td className="py-4 pr-4">{money(metric.approvedExpenses)}</td><td className="py-4 font-bold">{money(metric.forecastCollection)}</td></tr>)}</PaginatedBody>
      </table>
      <p className="mt-4 text-xs text-[#999]">Estimated collection uses collected fees plus 65% of current outstanding balances. It is a planning assumption, not a machine-learning forecast.</p>
    </div>
  )
}

function EmptyState() {
  return <p className="py-12 text-center text-sm text-[#888]">No analytics data is available for this selection.</p>
}
