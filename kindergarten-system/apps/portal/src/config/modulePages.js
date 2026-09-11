const PAGE_TITLES = {
  dashboard: 'Dashboard',
  'my-profile': 'My Profile',
  branches: 'Branch Management',
  students: 'Student Management',
  children: 'My Children',
  staff: 'Staff Management',
  parents: 'Parents',
  users: 'User Management',
  attendance: 'Attendance',
  finance: 'Finance',
  classes: 'Classes',
  homework: 'Homework',
  timetable: 'Timetable',
  announcement: 'Announcement',
  notifications: 'Notifications',
  reports: 'Reports',
  'dashboard-analytics': 'Dashboard Analytics',
  subscription: 'Subscription',
  'audit-logs': 'Audit Logs',
  'system-settings': 'System Settings',
  payments: 'Payments',
}

export function getPageTitle(activeId) {
  return PAGE_TITLES[activeId] ?? 'Dashboard'
}
