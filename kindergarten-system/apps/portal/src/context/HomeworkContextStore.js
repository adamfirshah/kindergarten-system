import { createContext, useContext } from 'react'

export const HomeworkContext = createContext(null)

export function useHomework() {
  const context = useContext(HomeworkContext)
  if (!context) throw new Error('useHomework must be used inside HomeworkProvider')
  return context
}
