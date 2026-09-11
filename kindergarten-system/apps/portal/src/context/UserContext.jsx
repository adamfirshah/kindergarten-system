import { useMemo, useState } from 'react'
import { ROLES } from '../constants/roles'
import { USER_LOGIN_HISTORY } from '../data/userDetails'

import { UserContext } from './UserContextStore.js'

const INITIAL_USERS = [
  {
    id: 'u1',
    name: 'Super Admin',
    email: 'superadmin@papa.edu.my',
    roleId: ROLES.superAdmin,
    branchId: null,
    status: 'active',
    lastLogin: '2026-07-31 08:42',
  },
  {
    id: 'u2',
    name: 'Dr. Nor Azlina',
    email: 'azlina@papa.edu.my',
    roleId: ROLES.admin,
    branchId: '1',
    status: 'active',
    lastLogin: '2026-07-31 07:55',
  },
  {
    id: 'u3',
    name: 'Cik Farah',
    email: 'farah@papa.edu.my',
    roleId: ROLES.teacher,
    branchId: '1',
    status: 'active',
    lastLogin: '2026-07-31 07:30',
  },
  {
    id: 'u4',
    name: 'Ahmad Finance',
    email: 'finance.kl@papa.edu.my',
    roleId: ROLES.accountant,
    branchId: '1',
    status: 'active',
    lastLogin: '2026-07-30 14:22',
  },
  {
    id: 'u5',
    name: 'Zainal Abidin',
    email: 'zainal@email.com',
    roleId: ROLES.parent,
    branchId: '1',
    status: 'active',
    lastLogin: '2026-07-31 09:10',
  },
  {
    id: 'u6',
    name: 'Pn. Rashidah',
    email: 'rashidah@papa.edu.my',
    roleId: ROLES.admin,
    branchId: '2',
    status: 'active',
    lastLogin: '2026-07-28 11:45',
  },
  {
    id: 'u7',
    name: 'Cik Mira',
    email: 'mira@papa.edu.my',
    roleId: ROLES.teacher,
    branchId: '2',
    status: 'active',
    lastLogin: '2026-07-31 08:00',
  },
  {
    id: 'u8',
    name: 'Encik Hafiz',
    email: 'hafiz@papa.edu.my',
    roleId: ROLES.admin,
    branchId: '3',
    status: 'disabled',
    lastLogin: '2026-07-29 16:30',
  },
]

export function UserProvider({ children }) {
  const [users, setUsers] = useState(INITIAL_USERS)

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.status === 'active').length,
    disabled: users.filter((u) => u.status === 'disabled').length,
    byRole: {
      [ROLES.superAdmin]: users.filter((u) => u.roleId === ROLES.superAdmin).length,
      [ROLES.admin]: users.filter((u) => u.roleId === ROLES.admin).length,
      [ROLES.teacher]: users.filter((u) => u.roleId === ROLES.teacher).length,
      [ROLES.parent]: users.filter((u) => u.roleId === ROLES.parent).length,
      [ROLES.accountant]: users.filter((u) => u.roleId === ROLES.accountant).length,
    },
  }), [users])

  function addUser(data) {
    setUsers((prev) => [
      ...prev,
      {
        ...data,
        id: crypto.randomUUID(),
        status: 'active',
        lastLogin: '—',
        branchId: data.roleId === ROLES.superAdmin ? null : data.branchId,
      },
    ])
  }

  function updateUserRole(id, roleId) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? {
              ...u,
              roleId,
              branchId: roleId === ROLES.superAdmin ? null : u.branchId,
            }
          : u,
      ),
    )
  }

  function updateUserBranch(id, branchId) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, branchId } : u)))
  }

  function toggleUserStatus(id) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, status: u.status === 'active' ? 'disabled' : 'active' }
          : u,
      ),
    )
  }

  function resetPassword(id) {
    return users.find((u) => u.id === id)?.email ?? null
  }

  function getLoginHistory(id) {
    return USER_LOGIN_HISTORY[id] ?? []
  }

  return (
    <UserContext.Provider
      value={{
        users,
        stats,
        addUser,
        updateUserRole,
        updateUserBranch,
        toggleUserStatus,
        resetPassword,
        getLoginHistory,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}
