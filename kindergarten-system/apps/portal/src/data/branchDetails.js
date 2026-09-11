export const SUBSCRIPTION_PLANS = {
  Premium: {
    label: 'Premium',
    price: 'RM 1,200 / month',
    monthlyPrice: 1200,
    studentLimit: null,
    analyticsLevel: 'Full AI analytics',
    isActive: true,
    updatedAt: '2026-09-03',
    features: ['Unlimited students', 'Full analytics', 'Priority support', 'Multi-branch sync'],
  },
  Standard: {
    label: 'Standard',
    price: 'RM 800 / month',
    monthlyPrice: 800,
    studentLimit: 200,
    analyticsLevel: 'Reports only',
    isActive: true,
    updatedAt: '2026-09-03',
    features: ['Up to 200 students', 'Basic analytics', 'Email support'],
  },
  Basic: {
    label: 'Basic',
    price: 'RM 400 / month',
    monthlyPrice: 400,
    studentLimit: 100,
    analyticsLevel: 'Not included',
    isActive: true,
    updatedAt: '2026-09-03',
    features: ['Up to 100 students', 'Core modules only'],
  },
}

export const BRANCH_STUDENTS = {
  '1': [
    { id: 's1', name: 'Ahmad Zaki', class: 'Kindergarten A', age: 5, parent: 'Zainal Abidin' },
    { id: 's2', name: 'Siti Aisyah', class: 'Kindergarten A', age: 5, parent: 'Fatimah Zahra' },
    { id: 's3', name: 'Muhammad Hafiz', class: 'Kindergarten B', age: 6, parent: 'Roslan Ibrahim' },
    { id: 's4', name: 'Nurul Iman', class: 'Kindergarten B', age: 6, parent: 'Aminah Yusof' },
    { id: 's5', name: 'Daniel Lim', class: 'Kindergarten C', age: 5, parent: 'Lim Wei Ming' },
    { id: 's6', name: 'Priya Devi', class: 'Kindergarten C', age: 5, parent: 'Raj Kumar' },
  ],
  '2': [
    { id: 's7', name: 'Adam Hakim', class: 'Kindergarten A', age: 5, parent: 'Hakim Rahman' },
    { id: 's8', name: 'Emily Tan', class: 'Kindergarten A', age: 6, parent: 'Tan Mei Ling' },
    { id: 's9', name: 'Arif Danish', class: 'Kindergarten B', age: 5, parent: 'Danish Ali' },
    { id: 's10', name: 'Chloe Wong', class: 'Kindergarten B', age: 6, parent: 'Wong Siew Leng' },
  ],
  '3': [
    { id: 's11', name: 'Haziq Imran', class: 'Kindergarten A', age: 5, parent: 'Imran Hassan' },
    { id: 's12', name: 'Sophia Lee', class: 'Kindergarten A', age: 5, parent: 'Lee Jia Hui' },
    { id: 's13', name: 'Farhan Azmi', class: 'Kindergarten B', age: 6, parent: 'Azmi Rahman' },
  ],
}

export const BRANCH_STAFF = {
  '1': [
    { id: 'st1', name: 'Dr. Nor Azlina', role: 'branch_admin', email: 'azlina@papa.edu.my', phone: '+60 12-345 6789' },
    { id: 'st2', name: 'Encik Kamal', role: 'branch_admin', email: 'kamal@papa.edu.my', phone: '+60 12-345 6790' },
    { id: 'st3', name: 'Cik Farah', role: 'teacher', email: 'farah@papa.edu.my', phone: '+60 12-345 6791' },
    { id: 'st4', name: 'Mr. Raj', role: 'teacher', email: 'raj@papa.edu.my', phone: '+60 12-345 6792' },
    { id: 'st5', name: 'Pn. Siti', role: 'teacher', email: 'siti@papa.edu.my', phone: '+60 12-345 6793' },
    { id: 'st6', name: 'Ahmad Finance', role: 'finance', email: 'finance.kl@papa.edu.my', phone: '+60 12-345 6794' },
  ],
  '2': [
    { id: 'st7', name: 'Pn. Rashidah', role: 'branch_admin', email: 'rashidah@papa.edu.my', phone: '+60 13-111 2222' },
    { id: 'st8', name: 'Cik Mira', role: 'teacher', email: 'mira@papa.edu.my', phone: '+60 13-111 2223' },
    { id: 'st9', name: 'Mr. Kevin', role: 'teacher', email: 'kevin@papa.edu.my', phone: '+60 13-111 2224' },
    { id: 'st10', name: 'Nurul Finance', role: 'finance', email: 'finance.sa@papa.edu.my', phone: '+60 13-111 2225' },
  ],
  '3': [
    { id: 'st11', name: 'Encik Hafiz', role: 'branch_admin', email: 'hafiz@papa.edu.my', phone: '+60 14-555 6666' },
    { id: 'st12', name: 'Cik Lina', role: 'teacher', email: 'lina@papa.edu.my', phone: '+60 14-555 6667' },
    { id: 'st13', name: 'David Finance', role: 'finance', email: 'finance.pg@papa.edu.my', phone: '+60 14-555 6668' },
  ],
}

export const STAFF_ROLE_LABELS = {
  branch_admin: 'Branch Admin',
  teacher: 'Teacher',
  finance: 'Finance',
}
