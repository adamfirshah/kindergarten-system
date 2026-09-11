import { useMasterData } from './MasterDataContext'
import { useStudents } from './StudentContext'
export function AcademicProvider({ children }) { return children }
// eslint-disable-next-line react-refresh/only-export-components
export function useAcademics() {
  const { data } = useMasterData()
  const { students } = useStudents()
  const classes = (data.classes ?? []).map((c) => ({ ...c, id: String(c.id), branchId: c.branch_id, teacherId: c.teacher_staff_id, academicYearId: c.academic_year_id }))
  const enrolments = (data.student_classes ?? []).map((e) => ({ ...e, id: String(e.id), classId: String(e.class_id), studentId: String(e.student_id), academicYearId: e.academic_year_id, enrolledOn: e.start_date }))
  return { classes, enrolments, academicYears: data.academic_years ?? [], terms: (data.academic_terms ?? []).map((t) => ({ ...t, academicYearId: t.academic_year_id })), stats: { classes: classes.length, enrolled: enrolments.filter((e) => e.status === 'active').length, capacity: classes.reduce((sum,c) => sum + c.capacity,0) }, getClassRoster: (id) => students.filter((s) => enrolments.some((e) => e.classId === String(id) && e.studentId === s.id && e.status === 'active')) }
}
