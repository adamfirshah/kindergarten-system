import { BRANCH_STAFF, STAFF_ROLE_LABELS } from './branchDetails'

export { STAFF_ROLE_LABELS }

export const INITIAL_STAFF = Object.entries(BRANCH_STAFF).flatMap(([branchId, members]) =>
  members.map((member) => ({
    ...member,
    branchId,
    name: member.name,
    position: member.role,
  })),
)

export const STAFF_PROFILES = {
  st3: {
    salaryGrade: 'G3',
    attendance: [
      { id: 'sa1', date: '2026-07-31', status: 'present' },
      { id: 'sa2', date: '2026-07-30', status: 'present' },
    ],
    leave: [{ id: 'sl1', type: 'Annual', from: '2026-08-10', to: '2026-08-12', status: 'approved' }],
  },
}

const DEFAULT_PROFILE = {
  salaryGrade: '—',
  attendance: [],
  leave: [],
}

export function getStaffProfile(staffId) {
  return STAFF_PROFILES[staffId] ?? DEFAULT_PROFILE
}
