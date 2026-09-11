import { ROLES } from '../constants/roles'

/** Access levels from the permission matrix */
export const ACCESS = {
  FULL: 'full',
  OWN: 'own',
  VIEW: 'view',
  OWN_CLASS: 'own_class',
  OWN_CHILD: 'own_child',
  SELF: 'self',
  CONTACTS: 'contacts',
  LIMITED: 'limited',
  CHILD_ONLY: 'child_only',
  FINANCIAL_ONLY: 'financial_only',
  CREATE: 'create',
  OWN_BRANCH: 'own_branch',
  PAY: 'pay',
  REPLY: 'reply',
  TEACHERS_ONLY: 'teachers_only',
  NONE: 'none',
}

export const ACCESS_LABELS = {
  [ACCESS.FULL]: 'Full Access',
  [ACCESS.OWN]: 'Own Branch',
  [ACCESS.VIEW]: 'View Only',
  [ACCESS.OWN_CLASS]: 'Own Class',
  [ACCESS.OWN_CHILD]: 'Own Child',
  [ACCESS.SELF]: 'Self',
  [ACCESS.CONTACTS]: 'Contacts',
  [ACCESS.LIMITED]: 'Limited',
  [ACCESS.CHILD_ONLY]: 'Child Only',
  [ACCESS.FINANCIAL_ONLY]: 'Financial Only',
  [ACCESS.CREATE]: 'Create',
  [ACCESS.OWN_BRANCH]: 'Own Branch',
  [ACCESS.PAY]: 'View + Pay',
  [ACCESS.REPLY]: 'View + Reply',
  [ACCESS.TEACHERS_ONLY]: 'Teachers Only',
  [ACCESS.NONE]: 'No Access',
}

/**
 * Permission matrix — module id → role id → access level
 * Matches the PAPA Kindergarten system permission matrix.
 */
const PERMISSION_MATRIX = {
  dashboard: {
    [ROLES.superAdmin]: ACCESS.FULL,
    [ROLES.admin]: ACCESS.FULL,
    [ROLES.teacher]: ACCESS.FULL,
    [ROLES.parent]: ACCESS.FULL,
    [ROLES.accountant]: ACCESS.FULL,
  },
  branches: {
    [ROLES.superAdmin]: ACCESS.FULL,
    [ROLES.admin]: ACCESS.OWN,
    [ROLES.teacher]: ACCESS.NONE,
    [ROLES.parent]: ACCESS.NONE,
    [ROLES.accountant]: ACCESS.NONE,
  },
  subscription: {
    [ROLES.superAdmin]: ACCESS.FULL,
    [ROLES.admin]: ACCESS.VIEW,
    [ROLES.teacher]: ACCESS.NONE,
    [ROLES.parent]: ACCESS.NONE,
    [ROLES.accountant]: ACCESS.NONE,
  },
  users: {
    [ROLES.superAdmin]: ACCESS.FULL,
    [ROLES.admin]: ACCESS.OWN,
    [ROLES.teacher]: ACCESS.NONE,
    [ROLES.parent]: ACCESS.NONE,
    [ROLES.accountant]: ACCESS.NONE,
  },
  students: {
    [ROLES.superAdmin]: ACCESS.FULL,
    [ROLES.admin]: ACCESS.OWN,
    [ROLES.teacher]: ACCESS.OWN_CLASS,
    [ROLES.parent]: ACCESS.NONE,
    [ROLES.accountant]: ACCESS.VIEW,
  },
  children: {
    [ROLES.superAdmin]: ACCESS.NONE,
    [ROLES.admin]: ACCESS.NONE,
    [ROLES.teacher]: ACCESS.NONE,
    [ROLES.parent]: ACCESS.OWN_CHILD,
    [ROLES.accountant]: ACCESS.NONE,
  },
  staff: {
    [ROLES.superAdmin]: ACCESS.FULL,
    [ROLES.admin]: ACCESS.TEACHERS_ONLY,
    [ROLES.teacher]: ACCESS.SELF,
    [ROLES.parent]: ACCESS.NONE,
    [ROLES.accountant]: ACCESS.NONE,
  },
  parents: {
    [ROLES.superAdmin]: ACCESS.FULL,
    [ROLES.admin]: ACCESS.OWN,
    [ROLES.teacher]: ACCESS.CONTACTS,
    [ROLES.parent]: ACCESS.SELF,
    [ROLES.accountant]: ACCESS.NONE,
  },
  attendance: {
    [ROLES.superAdmin]: ACCESS.FULL,
    [ROLES.admin]: ACCESS.OWN,
    [ROLES.teacher]: ACCESS.FULL,
    [ROLES.parent]: ACCESS.VIEW,
    [ROLES.accountant]: ACCESS.NONE,
  },
  classes: {
    [ROLES.superAdmin]: ACCESS.FULL,
    [ROLES.admin]: ACCESS.OWN,
    [ROLES.teacher]: ACCESS.FULL,
    [ROLES.parent]: ACCESS.VIEW,
    [ROLES.accountant]: ACCESS.NONE,
  },
  homework: {
    [ROLES.superAdmin]: ACCESS.FULL,
    [ROLES.admin]: ACCESS.OWN,
    [ROLES.teacher]: ACCESS.FULL,
    [ROLES.parent]: ACCESS.VIEW,
    [ROLES.accountant]: ACCESS.NONE,
  },
  finance: {
    [ROLES.superAdmin]: ACCESS.FULL,
    [ROLES.admin]: ACCESS.OWN,
    [ROLES.teacher]: ACCESS.NONE,
    [ROLES.parent]: ACCESS.NONE,
    [ROLES.accountant]: ACCESS.FULL,
  },
  payments: {
    [ROLES.superAdmin]: ACCESS.NONE,
    [ROLES.admin]: ACCESS.NONE,
    [ROLES.teacher]: ACCESS.NONE,
    [ROLES.parent]: ACCESS.PAY,
    [ROLES.accountant]: ACCESS.NONE,
  },
  reports: {
    [ROLES.superAdmin]: ACCESS.FULL,
    [ROLES.admin]: ACCESS.LIMITED,
    [ROLES.teacher]: ACCESS.LIMITED,
    [ROLES.parent]: ACCESS.CHILD_ONLY,
    [ROLES.accountant]: ACCESS.FINANCIAL_ONLY,
  },
  announcement: {
    [ROLES.superAdmin]: ACCESS.FULL,
    [ROLES.admin]: ACCESS.OWN,
    [ROLES.teacher]: ACCESS.REPLY,
    [ROLES.parent]: ACCESS.VIEW,
    [ROLES.accountant]: ACCESS.NONE,
  },
  'audit-logs': {
    [ROLES.superAdmin]: ACCESS.FULL,
    [ROLES.admin]: ACCESS.OWN_BRANCH,
    [ROLES.teacher]: ACCESS.NONE,
    [ROLES.parent]: ACCESS.NONE,
    [ROLES.accountant]: ACCESS.NONE,
  },
  'dashboard-analytics': {
    [ROLES.superAdmin]: ACCESS.FULL,
    [ROLES.admin]: ACCESS.OWN_BRANCH,
    [ROLES.teacher]: ACCESS.NONE,
    [ROLES.parent]: ACCESS.NONE,
    [ROLES.accountant]: ACCESS.NONE,
  },
  'system-settings': {
    [ROLES.superAdmin]: ACCESS.FULL,
    [ROLES.admin]: ACCESS.NONE,
    [ROLES.teacher]: ACCESS.NONE,
    [ROLES.parent]: ACCESS.NONE,
    [ROLES.accountant]: ACCESS.NONE,
  },
}

export function getModuleAccess(roleId, moduleId) {
  return PERMISSION_MATRIX[moduleId]?.[roleId] ?? ACCESS.NONE
}

export function canAccessModule(roleId, moduleId) {
  if (moduleId === "my-profile") return Object.values(ROLES).includes(roleId)
  return getModuleAccess(roleId, moduleId) !== ACCESS.NONE
}

export function hasFullAccess(roleId, moduleId) {
  return getModuleAccess(roleId, moduleId) === ACCESS.FULL
}

export function getAccessibleModuleIds(roleId) {
  return Object.keys(PERMISSION_MATRIX).filter((moduleId) => canAccessModule(roleId, moduleId))
}
