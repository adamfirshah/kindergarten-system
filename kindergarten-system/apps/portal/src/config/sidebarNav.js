import {
  IconHome,
  IconUsers,
  IconClass,
  IconCalendar,
  IconPayment,
  IconSettings,
  IconReport,
  IconChild,
  IconBriefcase,
  IconLogout,
  IconLocation,
  IconChart,
  IconMegaphone,
  IconShield,
  IconReceipt,
  IconBook,
} from '../components/icons/DashboardIcons'
import { ROLES } from '../constants/roles'
import { canAccessModule } from './permissions'

const NAV_ITEMS = {
  dashboard: { id: 'dashboard', label: 'Dashboard', icon: IconHome },
  branches: { id: 'branches', label: 'Branches', icon: IconLocation },
  students: { id: 'students', label: 'Students', icon: IconChild },
  children: { id: 'children', label: 'My Children', icon: IconChild },
  staff: { id: 'staff', label: 'Staff', icon: IconBriefcase },
  parents: { id: 'parents', label: 'Parents', icon: IconUsers },
  users: { id: 'users', label: 'Users', icon: IconUsers },
  attendance: { id: 'attendance', label: 'Attendance', icon: IconCalendar },
  finance: { id: 'finance', label: 'Finance', icon: IconPayment },
  payments: { id: 'payments', label: 'Payments', icon: IconPayment },
  classes: { id: 'classes', label: 'Classes', icon: IconClass },
  homework: { id: 'homework', label: 'Homework', icon: IconBook },
  announcement: { id: 'announcement', label: 'Announcements', icon: IconMegaphone },
  reports: { id: 'reports', label: 'Reports', icon: IconReport },
  'dashboard-analytics': { id: 'dashboard-analytics', label: 'AI Analytics', icon: IconChart },
  subscription: { id: 'subscription', label: 'Subscription', icon: IconReceipt },
  'audit-logs': { id: 'audit-logs', label: 'Audit Logs', icon: IconShield },
  'system-settings': { id: 'system-settings', label: 'System Settings', icon: IconSettings },
}

/** Sidebar section layout per role — module ids are filtered by permission matrix */
const ROLE_LAYOUTS = {
  [ROLES.superAdmin]: [
    { id: 'management', label: 'Management', modules: ['branches', 'students', 'staff', 'parents', 'users'] },
    { id: 'operations', label: 'Operations', modules: ['attendance', 'finance', 'classes', 'homework'] },
    { id: 'communication', label: 'Communication', modules: ['announcement'] },
    { id: 'analytics', label: 'Analytics', modules: ['reports', 'dashboard-analytics'] },
    { id: 'administration', label: 'Administration', modules: ['subscription', 'audit-logs', 'system-settings'] },
  ],
  [ROLES.admin]: [
    { id: 'management', label: 'Management', modules: ['students', 'staff', 'parents', 'users'] },
    { id: 'branch', label: 'My Branch', modules: ['branches'] },
    { id: 'operations', label: 'Operations', modules: ['attendance', 'finance', 'classes', 'homework'] },
    { id: 'communication', label: 'Communication', modules: ['announcement'] },
    { id: 'analytics', label: 'Analytics', modules: ['reports', 'dashboard-analytics'] },
    { id: 'administration', label: 'Administration', modules: ['subscription', 'audit-logs'] },
  ],
  [ROLES.teacher]: [
    { id: 'teaching', label: 'Teaching', modules: ['students', 'classes', 'attendance', 'homework'] },
    { id: 'people', label: 'People', modules: ['staff', 'parents'] },
    { id: 'communication', label: 'Communication', modules: ['announcement'] },
    { id: 'analytics', label: 'Analytics', modules: ['reports'] },
  ],
  [ROLES.parent]: [
    { id: 'my-family', label: 'My Family', modules: ['children', 'parents', 'payments'] },
    { id: 'school', label: 'School', modules: ['classes', 'attendance', 'homework'] },
    { id: 'communication', label: 'Communication', modules: ['announcement'] },
    { id: 'analytics', label: 'Analytics', modules: ['reports'] },
  ],
  [ROLES.accountant]: [
    { id: 'operations', label: 'Operations', modules: ['students', 'finance'] },
    { id: 'analytics', label: 'Analytics', modules: ['reports'] },
  ],
}

const ROLE_LABEL_OVERRIDES = {
  [ROLES.superAdmin]: {
    staff: 'Staff',
  },
  [ROLES.admin]: {
    staff: 'Teachers',
    branches: 'My Branch',
  },
  [ROLES.teacher]: {
    staff: 'My Profile',
    parents: 'Parent Contacts',
  },
  [ROLES.parent]: {
    parents: 'My Profile',
  },
}

const FOOTER = [{ id: 'logout', label: 'Logout', icon: IconLogout, action: 'logout' }]

function buildSidebarNav(roleId) {
  if (!roleId) {
    return { dashboard: NAV_ITEMS.dashboard, sections: [], footer: FOOTER }
  }

  const layout = ROLE_LAYOUTS[roleId] ?? ROLE_LAYOUTS[ROLES.admin]
  const labelOverrides = ROLE_LABEL_OVERRIDES[roleId] ?? {}

  const sections = layout
    .map((section) => ({
      id: section.id,
      label: section.label,
      items: section.modules
        .filter((moduleId) => canAccessModule(roleId, moduleId))
        .map((moduleId) => {
          const item = NAV_ITEMS[moduleId]
          if (!item) return null
          const override = labelOverrides[moduleId]
          return override ? { ...item, label: override } : item
        })
        .filter(Boolean),
    }))
    .filter((section) => section.items.length > 0)

  return {
    dashboard: NAV_ITEMS.dashboard,
    sections,
    footer: FOOTER,
  }
}

export function getSidebarNav(roleId) {
  return buildSidebarNav(roleId)
}
