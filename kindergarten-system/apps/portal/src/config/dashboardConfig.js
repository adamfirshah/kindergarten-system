import { ROLES } from '../constants/roles'

export function getDashboardConfig(roleId) {
  switch (roleId) {
    case ROLES.superAdmin:
      return superAdminConfig
    case ROLES.admin:
      return adminConfig
    case ROLES.accountant:
      return accountantConfig
    case ROLES.teacher:
      return teacherConfig
    case ROLES.parent:
      return parentConfig
    default:
      return adminConfig
  }
}

const superAdminConfig = {
  roleLabel: 'Super Admin',
  pageTitle: 'Dashboard',
  hero: {
    title: 'Lead with clarity,\n nurture with care',
    subtitle: 'Full system access — manage every branch, user, and report from one place.',
    cta: 'Get Started',
    emoji: '🏫',
  },
  categories: {
    title: 'Modules',
    items: [
      { id: 'students', label: 'Students', emoji: '👶', bg: 'bg-[#FFD700]' },
      { id: 'staff', label: 'Staff', emoji: '👩‍🏫', bg: 'bg-[#121212] text-white' },
      { id: 'branches', label: 'Branches', emoji: '🏢', bg: 'bg-[#FFF9E0]' },
    ],
  },
  recent: {
    title: 'Recent Activity',
    items: [
      { id: 1, tag: 'Today · 09:30', name: 'New enrollment', price: '3 students', emoji: '📝' },
      { id: 2, tag: 'Today · 08:15', name: 'Staff check-in', price: '12 present', emoji: '✅' },
      { id: 3, tag: 'Yesterday', name: 'Payment received', price: 'RM 2,400', emoji: '💰' },
    ],
  },
  panel: {
    cardTitle: 'System Overview',
    cardAmount: '248',
    cardSub: 'Active users across all branches',
    cardNumber: '**** **** **** 1001',
    cardExpiry: '12/28',
    address: 'PAPA Kindergarten HQ, Kuala Lumpur',
    addressNote: 'Main administration office for all branches.',
    summaryTitle: 'Quick Actions',
    summaryItems: [
      { id: 1, name: 'Pending approvals', qty: '5', price: 'Review' },
      { id: 2, name: 'Open tickets', qty: '2', price: 'View' },
      { id: 3, name: 'Reports due', qty: '1', price: 'Generate' },
    ],
    serviceFee: 'Alerts',
    serviceAmount: '3 new',
    totalLabel: 'Status',
    totalAmount: 'All clear',
    checkoutLabel: 'Open Admin Panel',
  },
}

const adminConfig = {
  roleLabel: 'Branch Admin',
  pageTitle: 'Dashboard',
  hero: {
    title: 'Run your branch\n with confidence',
    subtitle: 'Manage teachers, students, parents, and daily operations for your branch.',
    cta: 'Get Started',
    emoji: '📋',
  },
  categories: {
    title: 'Modules',
    items: [
      { id: 'students', label: 'Students', emoji: '👶', bg: 'bg-[#FFD700]' },
      { id: 'staff', label: 'Teachers', emoji: '👩‍🏫', bg: 'bg-[#121212] text-white' },
      { id: 'parents', label: 'Parents', emoji: '👨‍👩‍👧', bg: 'bg-[#FFF9E0]' },
    ],
  },
  recent: {
    title: 'Recent Activity',
    items: [
      { id: 1, tag: 'Today · 09:30', name: 'New enrollment', price: '2 students', emoji: '📝' },
      { id: 2, tag: 'Today · 08:15', name: 'Teacher check-in', price: '8 present', emoji: '✅' },
      { id: 3, tag: 'Yesterday', name: 'Parent meeting', price: 'Scheduled', emoji: '📅' },
    ],
  },
  panel: {
    ...superAdminConfig.panel,
    cardTitle: 'School Stats',
    cardAmount: '86',
    cardSub: 'Students enrolled this term',
    cardNumber: '**** **** **** 2002',
  },
}

const accountantConfig = {
  ...adminConfig,
  roleLabel: 'Accountant',
  pageTitle: 'Finance Dashboard',
  hero: {
    title: 'Numbers that\n keep schools running',
    subtitle: 'Track fees, invoices, and payments with a clear financial overview.',
    cta: 'View Reports',
    emoji: '💳',
  },
  categories: {
    title: 'Finance',
    items: [
      { id: 'invoices', label: 'Invoices', emoji: '🧾', bg: 'bg-[#FFD700]' },
      { id: 'fees', label: 'Fees', emoji: '💵', bg: 'bg-[#121212] text-white' },
      { id: 'reports', label: 'Reports', emoji: '📊', bg: 'bg-[#FFF9E0]' },
    ],
  },
  recent: {
    title: 'Recent Transactions',
    items: [
      { id: 1, tag: 'Today · 10:00', name: 'Tuition payment', price: 'RM 850', emoji: '💰' },
      { id: 2, tag: 'Today · 09:20', name: 'Late fee waived', price: 'RM 0', emoji: '📝' },
      { id: 3, tag: 'Yesterday', name: 'Monthly report', price: 'Exported', emoji: '📊' },
    ],
  },
  panel: {
    ...adminConfig.panel,
    cardTitle: 'Total Collected',
    cardAmount: 'RM 42.5k',
    cardSub: 'This month across all classes',
    summaryTitle: 'Outstanding',
    summaryItems: [
      { id: 1, name: 'Overdue invoices', qty: '8', price: 'RM 3,200' },
      { id: 2, name: 'Pending approval', qty: '4', price: 'RM 1,600' },
      { id: 3, name: 'Refunds', qty: '1', price: 'RM 200' },
    ],
    checkoutLabel: 'Process Payments',
  },
}

const teacherConfig = {
  roleLabel: 'Teacher',
  pageTitle: 'Dashboard',
  hero: {
    title: 'Every child deserves\n your best today',
    subtitle: 'Take attendance, manage your classes, and stay connected with parents.',
    cta: 'My Classes',
    emoji: '🎨',
  },
  categories: {
    title: 'My Tools',
    items: [
      { id: 'classes', label: 'Classes', emoji: '📚', bg: 'bg-[#FFD700]' },
      { id: 'attendance', label: 'Attendance', emoji: '✅', bg: 'bg-[#121212] text-white' },
      { id: 'activities', label: 'Activities', emoji: '🎭', bg: 'bg-[#FFF9E0]' },
    ],
  },
  recent: {
    title: 'Today\'s Schedule',
    items: [
      { id: 1, tag: '08:00 · Room A', name: 'Morning Circle', price: '18 kids', emoji: '🌅' },
      { id: 2, tag: '10:30 · Room B', name: 'Art & Craft', price: '15 kids', emoji: '🖍️' },
      { id: 3, tag: '14:00 · Room A', name: 'Story Time', price: '18 kids', emoji: '📖' },
    ],
  },
  panel: {
    cardTitle: 'Today\'s Class',
    cardAmount: '18/20',
    cardSub: 'Students present in Room A',
    cardNumber: '**** **** **** 3003',
    cardExpiry: '03/28',
    address: 'Room A — PAPA Kindergarten',
    addressNote: 'Morning session · 8:00 AM – 12:00 PM',
    summaryTitle: 'Pending Tasks',
    summaryItems: [
      { id: 1, name: 'Attendance log', qty: '1', price: 'Submit' },
      { id: 2, name: 'Parent messages', qty: '3', price: 'Reply' },
      { id: 3, name: 'Activity photos', qty: '5', price: 'Upload' },
    ],
    serviceFee: 'Break',
    serviceAmount: '30 min',
    totalLabel: 'Next class',
    totalAmount: '10:30 AM',
    checkoutLabel: 'Mark Attendance',
  },
}

const parentConfig = {
  roleLabel: 'Parent',
  pageTitle: 'Dashboard',
  hero: {
    title: 'Stay connected with\n your child\'s journey',
    subtitle: 'View attendance, updates, and payments — everything about your little one.',
    cta: 'View Children',
    emoji: '💛',
  },
  categories: {
    title: 'Quick Access',
    items: [
      { id: 'child', label: 'My Child', emoji: '👧', bg: 'bg-[#FFD700]' },
      { id: 'payments', label: 'Payments', emoji: '💳', bg: 'bg-[#121212] text-white' },
      { id: 'reports', label: 'Reports', emoji: '📋', bg: 'bg-[#FFF9E0]' },
    ],
  },
  recent: {
    title: 'Recent Updates',
    items: [
      { id: 1, tag: 'Today · 08:05', name: 'Checked in', price: 'On time', emoji: '✅' },
      { id: 2, tag: 'Yesterday', name: 'Art activity', price: 'Photo shared', emoji: '🎨' },
      { id: 3, tag: 'Mon · 14:00', name: 'Tuition due', price: 'RM 450', emoji: '💰' },
    ],
  },
  panel: {
    cardTitle: 'Fee Balance',
    cardAmount: 'RM 450',
    cardSub: 'Due on 5 Aug 2026',
    cardNumber: '**** **** **** 4004',
    cardExpiry: '08/26',
    address: 'Home — Jalan Melati 12',
    addressNote: 'Pickup contact: +60 12-345 6789',
    summaryTitle: 'This Month',
    summaryItems: [
      { id: 1, name: 'Tuition fee', qty: 'x1', price: 'RM 400' },
      { id: 2, name: 'Activity fee', qty: 'x1', price: 'RM 50' },
      { id: 3, name: 'Meal plan', qty: 'x1', price: 'RM 120' },
    ],
    serviceFee: 'Service',
    serviceAmount: 'RM 5',
    totalLabel: 'Total Due',
    totalAmount: 'RM 575',
    checkoutLabel: 'Pay Now',
  },
}
