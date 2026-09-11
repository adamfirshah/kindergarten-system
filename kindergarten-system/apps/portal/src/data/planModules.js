export const PLAN_MODULES = [
  { code: 'students', name: 'Students', description: 'Student profiles, enrolment and student records.' },
  { code: 'staff', name: 'Staff', description: 'Staff profiles and branch assignments.' },
  { code: 'classes', name: 'Classes', description: 'Classes, academic years, terms and class enrolment.' },
  { code: 'parents', name: 'Parents', description: 'Parent profiles, child links and contact information.' },
  { code: 'attendance', name: 'Attendance', description: 'Daily attendance, check-in, check-out and absence reasons.' },
  { code: 'finance', name: 'Finance', description: 'Student fees, payments, expenses and approvals.' },
  { code: 'homework', name: 'Homework', description: 'Assignments, submissions and teacher feedback.' },
  { code: 'announcements', name: 'Announcements', description: 'School announcements, recipients and acknowledgements.' },
  { code: 'reports', name: 'Reports', description: 'Attendance, finance and homework summaries.' },
  { code: 'ai_analytics', name: 'AI Analytics', description: 'Operational risk indicators and analytics insights.' },
]

// Preserve the existing core / reports / full analytics plan defaults.
export function planModuleCodes(plan) {
  if (Array.isArray(plan?.moduleCodes)) return [...new Set(plan.moduleCodes)].filter((code) => PLAN_MODULES.some((module) => module.code === code))
  if (!plan) return []
  return PLAN_MODULES.filter(({ code }) => (
    code === 'reports' ? plan.analyticsLevel !== 'Not included'
      : code === 'ai_analytics' ? ['Basic analytics', 'Full AI analytics'].includes(plan.analyticsLevel)
        : true
  )).map(({ code }) => code)
}

export function analyticsForModules(codes, previous) {
  if (codes.includes('ai_analytics')) return ['Basic analytics', 'Full AI analytics'].includes(previous) ? previous : 'Full AI analytics'
  return codes.includes('reports') ? 'Reports only' : 'Not included'
}
