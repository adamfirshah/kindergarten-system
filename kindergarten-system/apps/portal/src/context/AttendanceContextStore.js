import { createContext, useContext } from 'react'

export const AttendanceContext = createContext(null)

export function useAttendance() {
  const context = useContext(AttendanceContext)
  if (!context) throw new Error('useAttendance must be used inside AttendanceProvider')
  return context
}
