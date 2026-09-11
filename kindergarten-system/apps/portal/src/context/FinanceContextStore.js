import { createContext, useContext } from 'react'

export const FinanceContext = createContext(null)

export function useFinance() {
  const context = useContext(FinanceContext)
  if (!context) throw new Error('useFinance must be used inside FinanceProvider')
  return context
}
