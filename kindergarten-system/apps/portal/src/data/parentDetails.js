export const INITIAL_PARENTS = [
  { id: 'p1', userId: 'u5', branchId: '1', name: 'Zainal Abidin', icNo: '850412-14-5521', phone: '+60 12-111 2233', email: 'zainal@email.com', address: 'Ampang, Kuala Lumpur', occupation: 'Engineer', status: 'active', communication: 'WhatsApp' },
  { id: 'p2', userId: null, branchId: '1', name: 'Fatimah Zahra', icNo: '870221-10-4418', phone: '+60 12-222 3344', email: 'fatimah@email.com', address: 'Keramat, Kuala Lumpur', occupation: 'Teacher', status: 'active', communication: 'Email' },
  { id: 'p3', userId: null, branchId: '1', name: 'Roslan Ibrahim', icNo: '820707-08-3391', phone: '+60 12-333 4455', email: 'roslan@email.com', address: 'Setiawangsa, Kuala Lumpur', occupation: 'Manager', status: 'active', communication: 'WhatsApp' },
  { id: 'p4', userId: null, branchId: '1', name: 'Aminah Yusof', icNo: '890519-06-2264', phone: '+60 12-444 5566', email: 'aminah@email.com', address: 'Wangsa Maju, Kuala Lumpur', occupation: 'Accountant', status: 'active', communication: 'WhatsApp' },
  { id: 'p5', userId: null, branchId: '1', name: 'Lim Wei Ming', icNo: '840313-14-1182', phone: '+60 12-555 6677', email: 'weiming@email.com', address: 'Cheras, Kuala Lumpur', occupation: 'Designer', status: 'active', communication: 'Email' },
  { id: 'p6', userId: null, branchId: '1', name: 'Raj Kumar', icNo: '860924-10-7742', phone: '+60 12-666 7788', email: 'rajkumar@email.com', address: 'Sentul, Kuala Lumpur', occupation: 'Consultant', status: 'active', communication: 'WhatsApp' },
  { id: 'p7', userId: null, branchId: '2', name: 'Hakim Rahman', icNo: '830116-10-6214', phone: '+60 13-111 2233', email: 'hakim@email.com', address: 'Seksyen 7, Shah Alam', occupation: 'Entrepreneur', status: 'active', communication: 'WhatsApp' },
  { id: 'p8', userId: null, branchId: '2', name: 'Tan Mei Ling', icNo: '881102-10-5129', phone: '+60 13-222 3344', email: 'meiling@email.com', address: 'Seksyen 13, Shah Alam', occupation: 'Pharmacist', status: 'active', communication: 'Email' },
  { id: 'p9', userId: null, branchId: '2', name: 'Danish Ali', icNo: '850628-08-4033', phone: '+60 13-333 4455', email: 'danish@email.com', address: 'Bukit Jelutong, Shah Alam', occupation: 'Technician', status: 'active', communication: 'WhatsApp' },
  { id: 'p10', userId: null, branchId: '2', name: 'Wong Siew Leng', icNo: '871215-10-2920', phone: '+60 13-444 5566', email: 'siewleng@email.com', address: 'Kota Kemuning, Shah Alam', occupation: 'Business Owner', status: 'active', communication: 'Email' },
  { id: 'p11', userId: null, branchId: '3', name: 'Imran Hassan', icNo: '810909-07-8841', phone: '+60 14-111 2233', email: 'imran@email.com', address: 'Georgetown, Penang', occupation: 'Chef', status: 'active', communication: 'WhatsApp' },
  { id: 'p12', userId: null, branchId: '3', name: 'Lee Jia Hui', icNo: '900305-07-7730', phone: '+60 14-222 3344', email: 'jiahui@email.com', address: 'Jelutong, Penang', occupation: 'Doctor', status: 'inactive', communication: 'Email' },
  { id: 'p13', userId: null, branchId: '3', name: 'Azmi Rahman', icNo: '841128-02-6621', phone: '+60 14-333 4455', email: 'azmi@email.com', address: 'Bayan Lepas, Penang', occupation: 'Supervisor', status: 'active', communication: 'WhatsApp' },
]

export const INITIAL_STUDENT_PARENT_LINKS = [
  { id: 'sp1', studentId: 's1', parentId: 'p1', relationship: 'Father', isPrimary: true },
  { id: 'sp2', studentId: 's2', parentId: 'p2', relationship: 'Mother', isPrimary: true },
  { id: 'sp3', studentId: 's3', parentId: 'p3', relationship: 'Father', isPrimary: true },
  { id: 'sp4', studentId: 's4', parentId: 'p4', relationship: 'Mother', isPrimary: true },
  { id: 'sp5', studentId: 's5', parentId: 'p5', relationship: 'Father', isPrimary: true },
  { id: 'sp6', studentId: 's6', parentId: 'p6', relationship: 'Father', isPrimary: true },
  { id: 'sp7', studentId: 's7', parentId: 'p7', relationship: 'Father', isPrimary: true },
  { id: 'sp8', studentId: 's8', parentId: 'p8', relationship: 'Mother', isPrimary: true },
  { id: 'sp9', studentId: 's9', parentId: 'p9', relationship: 'Father', isPrimary: true },
  { id: 'sp10', studentId: 's10', parentId: 'p10', relationship: 'Mother', isPrimary: true },
  { id: 'sp11', studentId: 's11', parentId: 'p11', relationship: 'Father', isPrimary: true },
  { id: 'sp12', studentId: 's12', parentId: 'p12', relationship: 'Mother', isPrimary: true },
  { id: 'sp13', studentId: 's13', parentId: 'p13', relationship: 'Father', isPrimary: true },
]

export const MOCK_CURRENT_PARENT_ID = 'p1'
