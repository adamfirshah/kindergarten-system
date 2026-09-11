import { createContext, useContext } from 'react'

export const UserContext = createContext(null)

export function useUsers() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUsers must be used inside UserProvider')
  return ctx
}
