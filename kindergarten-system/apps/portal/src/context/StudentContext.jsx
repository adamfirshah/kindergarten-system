import { useMasterData } from './MasterDataContext'
export function StudentProvider({ children }) { return children }
// eslint-disable-next-line react-refresh/only-export-components
export function useStudents() {
  const { data, mutate } = useMasterData()
  const students = (data.students ?? []).map((s) => ({ ...s, id: String(s.id), name: s.name ?? s.full_name ?? '', branchId: s.branch_id, className: s.class_name ?? '', parentName: s.parent_name ?? '' }))
  return { students, stats: { total: students.length, active: students.filter((s) => s.status === 'active').length, branches: new Set(students.map((s) => s.branchId)).size },
    getStudent: (id) => students.find((s) => s.id === String(id)) ?? null,
    getProfile: () => ({ medical: { bloodType: '—', allergies: '—', conditions: '—' }, emergencyContact: { name: '—', relationship: '—', phone: '—' }, attendance: [] }),
    filterByAccess: () => students,
    transferBranch: (id, branch) => mutate('save_master_record', { entity: 'students', record_key: String(id), payload: { branch_id: branch } }),
  }
}
// eslint-disable-next-line react-refresh/only-export-components
export function useStudentAccess() { return useStudents().students }
