import { useMemo, useState } from 'react'
import { INITIAL_ATTENDANCE } from '../data/attendanceDetails'

import { AttendanceContext } from './AttendanceContextStore.js'

export function AttendanceProvider({ children }) {
  const [records, setRecords] = useState(INITIAL_ATTENDANCE)

  function setStudentAttendance({ studentId, classId, date, status, remarks = '' }) {
    setRecords((previous) => {
      const existing = previous.find((record) => record.studentId === studentId && record.date === date)
      if (existing) {
        return previous.map((record) => record.id === existing.id
          ? {
              ...record,
              classId,
              status,
              remarks,
              checkIn: status === 'present' ? record.checkIn || '08:00' : status === 'late' ? record.checkIn || '08:15' : '',
              checkOut: ['present', 'late'].includes(status) ? record.checkOut : '',
            }
          : record)
      }
      return [...previous, {
        id: crypto.randomUUID(), studentId, classId, date, status, remarks,
        checkIn: status === 'present' ? '08:00' : status === 'late' ? '08:15' : '',
        checkOut: '', absenceReason: '', source: 'manual',
      }]
    })
  }

  function markAllPresent(students, classId, date) {
    students.forEach((student) => setStudentAttendance({ studentId: student.id, classId, date, status: 'present' }))
  }

  function submitAbsenceReason(recordId, reason) {
    setRecords((previous) => previous.map((record) => record.id === recordId ? { ...record, absenceReason: reason } : record))
  }

  const stats = useMemo(() => ({
    total: records.length,
    present: records.filter((record) => record.status === 'present').length,
    late: records.filter((record) => record.status === 'late').length,
    absent: records.filter((record) => record.status === 'absent').length,
  }), [records])

  return <AttendanceContext.Provider value={{ records, stats, setStudentAttendance, markAllPresent, submitAbsenceReason }}>{children}</AttendanceContext.Provider>
}
