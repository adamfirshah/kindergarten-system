import PaginatedBody from '../../components/ui/PaginatedBody'
import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useAcademics } from '../../context/AcademicContext'
import { useBranches } from '../../context/BranchContext'
import { useStaff } from '../../context/StaffContext'
import { useStudents } from '../../context/StudentContext'
import { ROLES } from '../../constants/roles'
import { MOCK_BRANCH_ADMIN_BRANCH_ID } from '../../constants/scope'
import { PARENT_STUDENT_IDS } from '../../data/studentDetails'
import ClassFormModal from '../../components/classes/ClassFormModal'
import EnrolStudentModal from '../../components/classes/EnrolStudentModal'

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
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${status === 'active' ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#F4F0E5] text-[#888]'}`}>
      {status === 'active' ? 'Active' : 'Inactive'}
    </span>
  )
}

export default function ClassManagement() {
  const { userRole } = useAuth()
  const { branches } = useBranches()
  const { staff } = useStaff()
  const { students } = useStudents()
  const {
    academicYears,
    terms,
    classes,
    enrolments,
    addClass,
    updateClass,
    getClassRoster,
    enrolStudent,
  } = useAcademics()

  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [academicYearId, setAcademicYearId] = useState('ay-2026')
  const [selectedClassId, setSelectedClassId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingClass, setEditingClass] = useState(null)
  const [enrollingClass, setEnrollingClass] = useState(null)

  const branchMap = Object.fromEntries(branches.map((branch) => [branch.id, branch.name]))
  const staffMap = Object.fromEntries(staff.map((member) => [member.id, member.name]))
  const isSuperAdmin = userRole === ROLES.superAdmin
  const isBranchAdmin = userRole === ROLES.admin
  const isTeacher = userRole === ROLES.teacher
  const isParent = userRole === ROLES.parent
  const canManage = isSuperAdmin || isBranchAdmin

  const scopedClasses = useMemo(() => {
    if (isSuperAdmin) return classes
    if (isBranchAdmin) return classes.filter((item) => item.branchId === MOCK_BRANCH_ADMIN_BRANCH_ID)
    if (isTeacher) return classes.filter((item) => item.teacherId === 'st3')
    if (isParent) {
      const classIds = new Set(
        enrolments
          .filter((item) => PARENT_STUDENT_IDS.includes(item.studentId))
          .map((item) => item.classId),
      )
      return classes.filter((item) => classIds.has(item.id))
    }
    return []
  }, [classes, enrolments, isSuperAdmin, isBranchAdmin, isTeacher, isParent])

  const filteredClasses = scopedClasses.filter((item) => {
    const query = search.toLowerCase()
    const matchesSearch = [item.name, item.level, item.room, staffMap[item.teacherId] ?? '']
      .some((value) => value.toLowerCase().includes(query))
    const matchesBranch = branchFilter === 'all' || item.branchId === branchFilter
    return matchesSearch && matchesBranch && item.academicYearId === academicYearId
  })

  const scopedEnrolments = enrolments.filter((item) => scopedClasses.some((classItem) => classItem.id === item.classId))
  const capacity = scopedClasses.filter((item) => item.status === 'active').reduce((sum, item) => sum + item.capacity, 0)
  const enrolled = scopedEnrolments.filter((item) => item.status === 'active').length
  const selectedClass = classes.find((item) => item.id === selectedClassId) ?? null
  const selectedRoster = selectedClass ? getClassRoster(selectedClass.id) : []
  const visibleRoster = isParent
    ? selectedRoster.filter((student) => PARENT_STUDENT_IDS.includes(student.id))
    : selectedRoster

  function openAdd() {
    setEditingClass(null)
    setFormOpen(true)
  }

  function openEdit(classRecord) {
    setEditingClass(classRecord)
    setFormOpen(true)
  }

  function handleSave(data) {
    if (editingClass) updateClass(editingClass.id, data)
    else addClass(data)
  }

  return (
    <div className="pb-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#174B2B]">Class Management</h2>
          <p className="mt-1 text-sm text-[#888]">
            {isParent ? 'View your child’s current class and teacher.' : isTeacher ? 'View your assigned classes and student rosters.' : 'Manage classes, teachers, capacity and student enrolment by academic year.'}
          </p>
        </div>
        {canManage && (
          <button type="button" onClick={openAdd} className="rounded-full bg-[#C3D3A4] px-5 py-2.5 text-sm font-bold text-[#174B2B] transition hover:bg-[#AFC58D] hover:shadow-md">+ Add Class</button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active Classes" value={scopedClasses.filter((item) => item.status === 'active').length} />
        <StatCard label="Enrolled" value={enrolled} sub="Current academic year" />
        <StatCard label="Capacity" value={capacity} sub="Available class places" />
        <StatCard label="Utilisation" value={capacity ? `${Math.round((enrolled / capacity) * 100)}%` : '0%'} sub={`${Math.max(capacity - enrolled, 0)} places available`} />
      </div>

      <section className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold text-[#174B2B]">Classes</h3>
          <div className="flex flex-wrap gap-2">
            <select value={academicYearId} onChange={(event) => setAcademicYearId(event.target.value)} className="rounded-full border border-[#EBEBEB] bg-white px-4 py-2 text-sm outline-none focus:border-[#638753]">
              {academicYears.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            {isSuperAdmin && (
              <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} className="rounded-full border border-[#EBEBEB] bg-white px-4 py-2 text-sm outline-none focus:border-[#638753]">
                <option value="all">All Branches</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            )}
            <input type="search" placeholder="Search class..." value={search} onChange={(event) => setSearch(event.target.value)} className="rounded-full border border-[#EBEBEB] px-4 py-2 text-sm outline-none focus:border-[#638753] focus:shadow-[0_0_0_3px_rgba(23,75,43,0.25)]" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#F0F0F0] text-xs font-bold uppercase tracking-wide text-[#888]">
                <th className="pb-3 pr-4">Class</th><th className="pb-3 pr-4">Branch</th><th className="pb-3 pr-4">Teacher</th><th className="pb-3 pr-4">Schedule</th><th className="pb-3 pr-4">Enrolment</th><th className="pb-3 pr-4">Status</th><th className="pb-3">Actions</th>
              </tr>
            </thead>
            <PaginatedBody>
              {filteredClasses.map((classRecord) => {
                const count = getClassRoster(classRecord.id).length
                return (
                  <tr key={classRecord.id} className="border-b border-[#FAF4E7] last:border-0">
                    <td className="py-4 pr-4"><p className="font-bold text-[#174B2B]">{classRecord.name}</p><p className="mt-0.5 text-xs text-[#AAA]">{classRecord.level} · {classRecord.room}</p></td>
                    <td className="py-4 pr-4 font-semibold text-[#555]">{branchMap[classRecord.branchId]}</td>
                    <td className="py-4 pr-4 text-[#555]">{staffMap[classRecord.teacherId] ?? 'Unassigned'}</td>
                    <td className="py-4 pr-4 text-[#555]">{classRecord.schedule}</td>
                    <td className="py-4 pr-4"><span className="font-bold text-[#174B2B]">{count}</span><span className="text-[#AAA]"> / {classRecord.capacity}</span></td>
                    <td className="py-4 pr-4"><StatusBadge status={classRecord.status} /></td>
                    <td className="py-4"><div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setSelectedClassId(classRecord.id)} className="rounded-full bg-[#C3D3A4] px-3 py-1.5 text-xs font-bold text-[#174B2B] hover:bg-[#AFC58D]">View Roster</button>
                      {canManage && <button type="button" onClick={() => openEdit(classRecord)} className="rounded-full border border-[#EBEBEB] px-3 py-1.5 text-xs font-bold text-[#555] hover:bg-[#F2F0DF]">Edit</button>}
                      {canManage && <button type="button" onClick={() => setEnrollingClass(classRecord)} className="rounded-full border border-[#EBEBEB] px-3 py-1.5 text-xs font-bold text-[#555] hover:bg-[#F2F0DF]">Enrol Student</button>}
                    </div></td>
                  </tr>
                )
              })}
            </PaginatedBody>
          </table>
          {filteredClasses.length === 0 && <p className="py-10 text-center text-sm text-[#888]">No classes found for this academic year.</p>}
        </div>
      </section>

      {selectedClass && (
        <section className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
          <div className="flex items-start justify-between gap-3">
            <div><h3 className="text-base font-bold text-[#174B2B]">{selectedClass.name} Roster</h3><p className="mt-1 text-xs text-[#888]">{branchMap[selectedClass.branchId]} · {staffMap[selectedClass.teacherId] ?? 'Teacher unassigned'}</p></div>
            <button type="button" onClick={() => setSelectedClassId(null)} className="rounded-full border border-[#EBEBEB] px-3 py-1.5 text-xs font-bold text-[#555]">Close</button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleRoster.map((student) => (
              <article key={student.id} className="rounded-2xl border border-[#F0F0F0] bg-[#FFFDF5] p-4">
                <p className="font-bold text-[#174B2B]">{student.name}</p><p className="mt-1 text-xs text-[#888]">Age {student.age} · Parent: {student.parentName}</p>
              </article>
            ))}
            {visibleRoster.length === 0 && <p className="text-sm text-[#888]">No active students are enrolled in this class.</p>}
          </div>
        </section>
      )}

      <ClassFormModal open={formOpen} classRecord={editingClass} branches={isBranchAdmin ? branches.filter((branch) => branch.id === MOCK_BRANCH_ADMIN_BRANCH_ID) : branches} teachers={staff} academicYears={academicYears.filter((year) => year.status !== 'closed')} terms={terms} onClose={() => setFormOpen(false)} onSave={handleSave} />
      <EnrolStudentModal key={enrollingClass?.id ?? 'no-enrolment'} open={Boolean(enrollingClass)} classRecord={enrollingClass} students={students} enrolledCount={enrollingClass ? getClassRoster(enrollingClass.id).length : 0} onClose={() => setEnrollingClass(null)} onEnrol={enrolStudent} />
    </div>
  )
}
