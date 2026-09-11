export const STUDENT_PROFILES = {
  s1: {
    medical: { bloodType: 'O+', allergies: 'Peanuts', conditions: 'None' },
    emergencyContact: { name: 'Zainal Abidin', relationship: 'Father', phone: '+60 12-111 2233' },
    attendance: [
      { id: 'a1', date: '2026-07-31', status: 'present' },
      { id: 'a2', date: '2026-07-30', status: 'present' },
      { id: 'a3', date: '2026-07-29', status: 'late' },
    ],
  },
  s2: {
    medical: { bloodType: 'A+', allergies: 'None', conditions: 'Mild asthma' },
    emergencyContact: { name: 'Fatimah Zahra', relationship: 'Mother', phone: '+60 12-222 3344' },
    attendance: [
      { id: 'a4', date: '2026-07-31', status: 'present' },
      { id: 'a5', date: '2026-07-30', status: 'absent' },
    ],
  },
  s3: {
    medical: { bloodType: 'B+', allergies: 'Dairy', conditions: 'None' },
    emergencyContact: { name: 'Roslan Ibrahim', relationship: 'Father', phone: '+60 12-333 4455' },
    attendance: [{ id: 'a6', date: '2026-07-31', status: 'present' }],
  },
}

export const INITIAL_STUDENTS = [
  { id: 's1', name: 'Ahmad Zaki', branchId: '1', className: 'Kindergarten A', age: 5, parentName: 'Zainal Abidin', status: 'active' },
  { id: 's2', name: 'Siti Aisyah', branchId: '1', className: 'Kindergarten A', age: 5, parentName: 'Fatimah Zahra', status: 'active' },
  { id: 's3', name: 'Muhammad Hafiz', branchId: '1', className: 'Kindergarten B', age: 6, parentName: 'Roslan Ibrahim', status: 'active' },
  { id: 's4', name: 'Nurul Iman', branchId: '1', className: 'Kindergarten B', age: 6, parentName: 'Aminah Yusof', status: 'active' },
  { id: 's5', name: 'Daniel Lim', branchId: '1', className: 'Kindergarten C', age: 5, parentName: 'Lim Wei Ming', status: 'active' },
  { id: 's6', name: 'Priya Devi', branchId: '1', className: 'Kindergarten C', age: 5, parentName: 'Raj Kumar', status: 'active' },
  { id: 's7', name: 'Adam Hakim', branchId: '2', className: 'Kindergarten A', age: 5, parentName: 'Hakim Rahman', status: 'active' },
  { id: 's8', name: 'Emily Tan', branchId: '2', className: 'Kindergarten A', age: 6, parentName: 'Tan Mei Ling', status: 'active' },
  { id: 's9', name: 'Arif Danish', branchId: '2', className: 'Kindergarten B', age: 5, parentName: 'Danish Ali', status: 'active' },
  { id: 's10', name: 'Chloe Wong', branchId: '2', className: 'Kindergarten B', age: 6, parentName: 'Wong Siew Leng', status: 'active' },
  { id: 's11', name: 'Haziq Imran', branchId: '3', className: 'Kindergarten A', age: 5, parentName: 'Imran Hassan', status: 'active' },
  { id: 's12', name: 'Sophia Lee', branchId: '3', className: 'Kindergarten A', age: 5, parentName: 'Lee Jia Hui', status: 'inactive' },
  { id: 's13', name: 'Farhan Azmi', branchId: '3', className: 'Kindergarten B', age: 6, parentName: 'Azmi Rahman', status: 'active' },
]

const DEFAULT_PROFILE = {
  medical: { bloodType: '—', allergies: 'None', conditions: 'None' },
  emergencyContact: { name: '—', relationship: '—', phone: '—' },
  attendance: [],
}

export function getStudentProfile(studentId) {
  return STUDENT_PROFILES[studentId] ?? DEFAULT_PROFILE
}

export const TEACHER_CLASSES = ['Kindergarten A', 'Kindergarten B']
export const TEACHER_BRANCH_ID = '1'
export const PARENT_STUDENT_IDS = ['s1']
