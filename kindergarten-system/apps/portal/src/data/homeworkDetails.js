export const INITIAL_HOMEWORK = [
  { id: 'hw1', branchId: '1', classId: 'c1', title: 'Trace & Write Letter A', subject: 'Language', instructions: 'Complete pages 4–5. Trace each letter and write it independently twice.', assignedDate: '2026-09-01', dueDate: '2026-09-04', status: 'published', attachmentUrl: '', createdBy: 'st3' },
  { id: 'hw2', branchId: '1', classId: 'c1', title: 'Count Objects 1–10', subject: 'Mathematics', instructions: 'Count the objects and circle the correct number.', assignedDate: '2026-09-02', dueDate: '2026-09-07', status: 'published', attachmentUrl: '', createdBy: 'st3' },
  { id: 'hw3', branchId: '1', classId: 'c2', title: 'My Family Drawing', subject: 'Creative Arts', instructions: 'Draw your family and write each person’s name with parent assistance.', assignedDate: '2026-09-01', dueDate: '2026-09-08', status: 'published', attachmentUrl: '', createdBy: 'st4' },
  { id: 'hw4', branchId: '1', classId: 'c3', title: 'Colour Hunt', subject: 'Discovery', instructions: 'Find three yellow objects at home and draw them.', assignedDate: '2026-09-02', dueDate: '2026-09-09', status: 'draft', attachmentUrl: '', createdBy: 'st5' },
  { id: 'hw5', branchId: '2', classId: 'c4', title: 'Shape Matching', subject: 'Mathematics', instructions: 'Match each household item to its basic shape.', assignedDate: '2026-09-01', dueDate: '2026-09-05', status: 'published', attachmentUrl: '', createdBy: 'st8' },
  { id: 'hw6', branchId: '2', classId: 'c5', title: 'Healthy Food Collage', subject: 'Health', instructions: 'Create a collage with five healthy foods.', assignedDate: '2026-08-28', dueDate: '2026-09-03', status: 'published', attachmentUrl: '', createdBy: 'st9' },
  { id: 'hw7', branchId: '3', classId: 'c6', title: 'Weather Journal', subject: 'Discovery', instructions: 'Draw today’s weather for three days.', assignedDate: '2026-09-01', dueDate: '2026-09-07', status: 'published', attachmentUrl: '', createdBy: 'st12' },
]

export const INITIAL_HOMEWORK_SUBMISSIONS = [
  { id: 'sub1', assignmentId: 'hw1', studentId: 's1', status: 'submitted', submittedAt: '2026-09-02 19:15', parentNote: 'Completed with minimal guidance.', attachmentUrl: '', teacherFeedback: '', score: null },
  { id: 'sub2', assignmentId: 'hw1', studentId: 's2', status: 'reviewed', submittedAt: '2026-09-02 18:40', parentNote: '', attachmentUrl: '', teacherFeedback: 'Excellent letter formation!', score: 10 },
  { id: 'sub3', assignmentId: 'hw2', studentId: 's1', status: 'assigned', submittedAt: '', parentNote: '', attachmentUrl: '', teacherFeedback: '', score: null },
  { id: 'sub4', assignmentId: 'hw2', studentId: 's2', status: 'assigned', submittedAt: '', parentNote: '', attachmentUrl: '', teacherFeedback: '', score: null },
  { id: 'sub5', assignmentId: 'hw3', studentId: 's3', status: 'submitted', submittedAt: '2026-09-02 20:10', parentNote: 'Hafiz enjoyed this activity.', attachmentUrl: '', teacherFeedback: '', score: null },
  { id: 'sub6', assignmentId: 'hw3', studentId: 's4', status: 'assigned', submittedAt: '', parentNote: '', attachmentUrl: '', teacherFeedback: '', score: null },
  { id: 'sub7', assignmentId: 'hw5', studentId: 's7', status: 'reviewed', submittedAt: '2026-09-02 17:20', parentNote: '', attachmentUrl: '', teacherFeedback: 'Good matching work.', score: 9 },
  { id: 'sub8', assignmentId: 'hw5', studentId: 's8', status: 'submitted', submittedAt: '2026-09-02 21:00', parentNote: '', attachmentUrl: '', teacherFeedback: '', score: null },
  { id: 'sub9', assignmentId: 'hw6', studentId: 's9', status: 'late', submittedAt: '', parentNote: '', attachmentUrl: '', teacherFeedback: '', score: null },
]

export const HOMEWORK_SUBJECTS = ['Language', 'Mathematics', 'Creative Arts', 'Discovery', 'Health', 'Other']
