import { useMasterData } from './MasterDataContext'
export function StaffProvider({ children }) { return children }
// eslint-disable-next-line react-refresh/only-export-components
export function useStaff() {
  const { data } = useMasterData()
  const staff = (data.branch_staff ?? []).map((s) => ({ ...s, id: String(s.id), name: s.name ?? s.full_name ?? '', branchId: s.branch_id, position: s.staff_role, role: s.staff_role }))
  return { staff, stats: { total: staff.length, teachers: staff.filter((s) => s.position === 'teacher').length, admins: staff.filter((s) => s.position === 'branch_admin').length, finance: staff.filter((s) => s.position === 'finance').length }, getStaffMember: (id) => staff.find((s) => s.id === String(id)), getProfile: () => ({ salaryGrade: '—', attendance: [], leave: [] }), filterByAccess: () => staff }
}
// eslint-disable-next-line react-refresh/only-export-components
export function useStaffAccess() { return useStaff().staff }
