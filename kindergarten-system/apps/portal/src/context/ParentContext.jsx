import { useMasterData } from './MasterDataContext'
export function ParentProvider({ children }) { return children }
// eslint-disable-next-line react-refresh/only-export-components
export function useParents() {
  const { data } = useMasterData()
  const parents = (data.parents ?? []).map((p) => ({ ...p, id: String(p.id), name: p.name ?? '', email: p.email ?? '', phone: p.phone ?? '', branchId: p.primary_branch_id, userId: p.user_id, communication: p.communication_preference }))
  const links = (data.student_parents ?? []).map((l) => ({ ...l, id: String(l.id), parentId: String(l.parent_id), studentId: String(l.student_id), isPrimary: l.is_primary_contact }))
  return { parents, links, stats: { total: parents.length, active: parents.filter((p) => p.status === 'active').length, linkedAccounts: parents.filter((p) => p.userId).length, linkedChildren: new Set(links.map((l) => l.studentId)).size }, getChildren: (id) => new Set(links.filter((l) => l.parentId === String(id)).map((l) => l.studentId)) }
}
