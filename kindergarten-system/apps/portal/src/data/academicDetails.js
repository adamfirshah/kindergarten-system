export const ACADEMIC_YEARS = [
  {
    id: 'ay-2026',
    name: '2026 Academic Year',
    startsOn: '2026-01-05',
    endsOn: '2026-11-27',
    status: 'active',
  },
  {
    id: 'ay-2025',
    name: '2025 Academic Year',
    startsOn: '2025-01-06',
    endsOn: '2025-11-28',
    status: 'closed',
  },
]

export const ACADEMIC_TERMS = [
  { id: 'term-1-2026', academicYearId: 'ay-2026', name: 'Term 1', startsOn: '2026-01-05', endsOn: '2026-04-03' },
  { id: 'term-2-2026', academicYearId: 'ay-2026', name: 'Term 2', startsOn: '2026-04-20', endsOn: '2026-08-07' },
  { id: 'term-3-2026', academicYearId: 'ay-2026', name: 'Term 3', startsOn: '2026-08-24', endsOn: '2026-11-27' },
]

export const INITIAL_CLASSES = [
  { id: 'c1', branchId: '1', academicYearId: 'ay-2026', termId: 'term-2-2026', name: 'Kindergarten A', level: 'Age 5', teacherId: 'st3', room: 'Room A', capacity: 20, schedule: 'Mon–Fri · 8:00 AM', status: 'active' },
  { id: 'c2', branchId: '1', academicYearId: 'ay-2026', termId: 'term-2-2026', name: 'Kindergarten B', level: 'Age 6', teacherId: 'st4', room: 'Room B', capacity: 20, schedule: 'Mon–Fri · 8:00 AM', status: 'active' },
  { id: 'c3', branchId: '1', academicYearId: 'ay-2026', termId: 'term-2-2026', name: 'Kindergarten C', level: 'Age 5', teacherId: 'st5', room: 'Room C', capacity: 18, schedule: 'Mon–Fri · 1:00 PM', status: 'active' },
  { id: 'c4', branchId: '2', academicYearId: 'ay-2026', termId: 'term-2-2026', name: 'Kindergarten A', level: 'Age 5–6', teacherId: 'st8', room: 'Room A', capacity: 22, schedule: 'Mon–Fri · 8:00 AM', status: 'active' },
  { id: 'c5', branchId: '2', academicYearId: 'ay-2026', termId: 'term-2-2026', name: 'Kindergarten B', level: 'Age 5–6', teacherId: 'st9', room: 'Room B', capacity: 22, schedule: 'Mon–Fri · 1:00 PM', status: 'active' },
  { id: 'c6', branchId: '3', academicYearId: 'ay-2026', termId: 'term-2-2026', name: 'Kindergarten A', level: 'Age 5', teacherId: 'st12', room: 'Room A', capacity: 18, schedule: 'Mon–Fri · 8:00 AM', status: 'active' },
  { id: 'c7', branchId: '3', academicYearId: 'ay-2026', termId: 'term-2-2026', name: 'Kindergarten B', level: 'Age 6', teacherId: 'st12', room: 'Room B', capacity: 18, schedule: 'Mon–Fri · 1:00 PM', status: 'inactive' },
]
