export type UserRole = 'superadmin' | 'branch_admin' | 'teacher' | 'parent' | 'accountant'

export interface Branch {
  id: string
  name: string
  code: string
  status: 'active' | 'inactive'
}

export interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  branchId?: string
}

export interface AcademicYear {
  id: string
  name: string
  startsOn: string
  endsOn: string
  status: 'draft' | 'active' | 'closed'
}

export interface AcademicClass {
  id: string | number
  branchId: string
  academicYearId: string
  termId?: string
  teacherId?: string | number
  name: string
  level?: string
  room?: string
  capacity: number
  schedule?: string
  status: 'active' | 'inactive' | 'archived'
}

export interface StudentEnrolment {
  id: string | number
  studentId: string | number
  classId: string | number
  academicYearId: string
  enrolledOn: string
  endedOn?: string
  status: 'pending' | 'active' | 'completed' | 'transferred' | 'withdrawn'
}

export interface ParentProfile {
  id: string | number
  userId?: string
  primaryBranchId?: string
  name: string
  icNo?: string
  phone?: string
  email?: string
  address?: string
  occupation?: string
  status: 'active' | 'inactive'
  communicationPreference: 'WhatsApp' | 'Email' | 'SMS'
}

export interface StudentParentLink {
  id: string | number
  studentId: string | number
  parentId: string | number
  relationship: 'Mother' | 'Father' | 'Guardian' | 'Parent'
  isPrimaryContact: boolean
}

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused'

export interface AttendanceRecord {
  id: string | number
  studentId: string | number
  classId: string | number
  date: string
  status: AttendanceStatus
  checkIn?: string
  checkOut?: string
  remarks?: string
  absenceReason?: string
  absenceReportedBy?: string
  source: 'manual' | 'kiosk' | 'import' | 'api'
}

export type PaymentStatus = 'paid' | 'pending' | 'partial' | 'overdue' | 'void'

export interface PaymentRecord {
  id: string | number
  studentId: string | number
  branchId: string
  invoiceNo: string
  paymentType: string
  amount: number
  dueDate: string
  paymentDate?: string
  status: PaymentStatus
  method?: string
  referenceNo?: string
  notes?: string
}

export type ExpenseStatus = 'pending' | 'approved' | 'rejected'

export interface ExpenseRecord {
  id: string | number
  branchId: string
  expenseType: string
  description: string
  amount: number
  expenseDate: string
  paidTo: string
  status: ExpenseStatus
  notes?: string
}

export type HomeworkStatus = 'draft' | 'published' | 'archived'
export type HomeworkSubmissionStatus = 'assigned' | 'submitted' | 'reviewed' | 'late'

export interface HomeworkAssignment {
  id: string | number
  branchId: string
  classId: string | number
  title: string
  subject: string
  instructions: string
  assignedDate: string
  dueDate: string
  status: HomeworkStatus
  attachmentUrl?: string
  createdBy?: string
}

export interface HomeworkSubmission {
  id: string | number
  assignmentId: string | number
  studentId: string | number
  status: HomeworkSubmissionStatus
  submittedAt?: string
  parentNote?: string
  attachmentUrl?: string
  teacherFeedback?: string
  score?: number
}

export type AnnouncementStatus = 'draft' | 'published' | 'archived'
export type AnnouncementPriority = 'normal' | 'high' | 'urgent'
export type AnnouncementAudience = 'all' | 'staff' | 'parents'

export interface Announcement {
  id: string
  branchId?: string
  classId?: string | number
  title: string
  message: string
  category: string
  priority: AnnouncementPriority
  audience: AnnouncementAudience
  publishAt: string
  expiresAt?: string
  status: AnnouncementStatus
  createdBy: string
}

export interface AnnouncementReceipt {
  id: string
  announcementId: string
  userId: string
  readAt?: string
  acknowledgedAt?: string
}
