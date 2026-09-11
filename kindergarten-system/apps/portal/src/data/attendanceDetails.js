const DAILY_STATUS = {
  '2026-09-02': ['present', 'present', 'late', 'present', 'absent', 'present', 'present', 'late', 'present', 'present', 'present', 'absent', 'present'],
  '2026-09-01': ['present', 'present', 'present', 'present', 'present', 'present', 'absent', 'present', 'present', 'late', 'present', 'present', 'present'],
  '2026-08-31': ['absent', 'present', 'present', 'present', 'late', 'present', 'present', 'present', 'present', 'present', 'present', 'present', 'absent'],
  '2026-08-28': ['present', 'present', 'present', 'late', 'present', 'present', 'present', 'present', 'absent', 'present', 'present', 'present', 'present'],
  '2026-08-27': ['present', 'present', 'present', 'present', 'present', 'late', 'present', 'present', 'present', 'present', 'absent', 'present', 'present'],
}

const CLASS_IDS = {
  '1:Kindergarten A': 'c1',
  '1:Kindergarten B': 'c2',
  '1:Kindergarten C': 'c3',
  '2:Kindergarten A': 'c4',
  '2:Kindergarten B': 'c5',
  '3:Kindergarten A': 'c6',
  '3:Kindergarten B': 'c7',
}

export const INITIAL_ATTENDANCE = Object.entries(DAILY_STATUS).flatMap(([date, statuses]) =>
  statuses.map((status, index) => {
    const studentNumber = index + 1
    const branchId = studentNumber <= 6 ? '1' : studentNumber <= 10 ? '2' : '3'
    const className = studentNumber <= 2 || [7, 8, 11, 12].includes(studentNumber)
      ? 'Kindergarten A'
      : studentNumber <= 4 || [9, 10, 13].includes(studentNumber)
        ? 'Kindergarten B'
        : 'Kindergarten C'
    return {
      id: `attendance-${date}-${studentNumber}`,
      studentId: `s${studentNumber}`,
      classId: CLASS_IDS[`${branchId}:${className}`],
      date,
      status,
      checkIn: status === 'present' ? '07:55' : status === 'late' ? '08:18' : '',
      checkOut: status === 'absent' ? '' : '12:05',
      remarks: status === 'late' ? 'Arrived after class started' : '',
      absenceReason: status === 'absent' && date !== '2026-09-02' && !(studentNumber === 1 && date === '2026-08-31') ? 'Family matter' : '',
      source: 'manual',
    }
  }),
)

export const ATTENDANCE_STATUSES = ['present', 'late', 'absent', 'excused']
