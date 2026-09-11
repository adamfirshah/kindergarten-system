export const INITIAL_ANNOUNCEMENTS = [
  { id: 'ann1', branchId: null, classId: null, title: 'Scheduled Platform Maintenance', message: 'The PAPA portal will be unavailable on 6 September from 1:00 AM to 3:00 AM for scheduled maintenance.', category: 'System', priority: 'high', audience: 'all', publishAt: '2026-09-03 08:00', expiresAt: '2026-09-07', status: 'published', createdBy: 'u1', recipientCount: 28, readCount: 19, acknowledgementCount: 0 },
  { id: 'ann2', branchId: '1', classId: null, title: 'Annual Sports Day Registration', message: 'Sports Day will be held on 19 September. Parents are invited to register their child before 10 September.', category: 'Event', priority: 'normal', audience: 'parents', publishAt: '2026-09-02 14:30', expiresAt: '2026-09-20', status: 'published', createdBy: 'u2', recipientCount: 36, readCount: 24, acknowledgementCount: 12 },
  { id: 'ann3', branchId: '1', classId: null, title: 'Health Screening Consent Required', message: 'The branch health screening is scheduled for 8 September. Please acknowledge this announcement after reviewing the consent information.', category: 'Health', priority: 'urgent', audience: 'parents', publishAt: '2026-09-03 09:15', expiresAt: '2026-09-08', status: 'published', createdBy: 'u2', recipientCount: 36, readCount: 18, acknowledgementCount: 11 },
  { id: 'ann4', branchId: '1', classId: 'c1', title: 'Kindergarten A Class Photo', message: 'Class photographs will be taken this Friday. Children should wear the complete school uniform.', category: 'Class', priority: 'normal', audience: 'parents', publishAt: '2026-09-02 16:00', expiresAt: '2026-09-06', status: 'published', createdBy: 'u2', recipientCount: 20, readCount: 15, acknowledgementCount: 0 },
  { id: 'ann5', branchId: '1', classId: null, title: 'Malaysia Day Holiday Notice', message: 'The branch will be closed for the Malaysia Day public holiday. Classes resume on the next school day.', category: 'Holiday', priority: 'normal', audience: 'all', publishAt: '2026-09-10 08:00', expiresAt: '2026-09-18', status: 'draft', createdBy: 'u2', recipientCount: 0, readCount: 0, acknowledgementCount: 0 },
  { id: 'ann6', branchId: '2', classId: null, title: 'Parent–Teacher Meeting', message: 'Appointment slots for the September parent–teacher meeting are now open.', category: 'Academic', priority: 'normal', audience: 'parents', publishAt: '2026-09-01 10:00', expiresAt: '2026-09-15', status: 'published', createdBy: 'u6', recipientCount: 28, readCount: 20, acknowledgementCount: 8 },
]

export const INITIAL_ANNOUNCEMENT_RECEIPTS = [
  { id: 'receipt-1', announcementId: 'ann1', userId: 'u1', readAt: '2026-09-03 08:05', acknowledgedAt: '' },
  { id: 'receipt-2', announcementId: 'ann1', userId: 'u3', readAt: '2026-09-03 08:20', acknowledgedAt: '' },
  { id: 'receipt-3', announcementId: 'ann2', userId: 'u5', readAt: '2026-09-02 18:40', acknowledgedAt: '2026-09-02 18:42' },
]

export const INITIAL_ANNOUNCEMENT_REPLIES = [
  { id: 'reply-1', announcementId: 'ann2', userId: 'u3', author: 'Cik Farah', message: 'Teachers will distribute the activity-group list after registration closes.', createdAt: '2026-09-02 17:10' },
]

export const ANNOUNCEMENT_CATEGORIES = ['General', 'Academic', 'Class', 'Event', 'Health', 'Holiday', 'System', 'Emergency']
export const ANNOUNCEMENT_PRIORITIES = ['normal', 'high', 'urgent']
export const ANNOUNCEMENT_AUDIENCES = ['all', 'staff', 'parents']
