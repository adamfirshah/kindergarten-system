export const ROLES = {
  superAdmin: 1,
  admin: 2,
  teacher: 3,
  parent: 4,
  accountant: 5,
}

export const ROLE_LABELS = {
  [ROLES.superAdmin]: 'Super Admin',
  [ROLES.admin]: 'Branch Admin',
  [ROLES.teacher]: 'Teacher',
  [ROLES.parent]: 'Parent',
  [ROLES.accountant]: 'Finance',
}

export const MANAGEABLE_ROLES = [
  ROLES.superAdmin,
  ROLES.admin,
  ROLES.teacher,
  ROLES.parent,
  ROLES.accountant,
]
