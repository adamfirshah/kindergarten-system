import { createContext, useContext } from 'react'

export const AnnouncementContext = createContext(null)

export function useAnnouncements() {
  const context = useContext(AnnouncementContext)
  if (!context) throw new Error('useAnnouncements must be used inside AnnouncementProvider')
  return context
}
