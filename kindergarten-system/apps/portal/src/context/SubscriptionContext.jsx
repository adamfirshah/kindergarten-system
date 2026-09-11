import { createContext, useContext, useMemo, useState } from 'react'
import { INITIAL_SUBSCRIPTION_INVOICES } from '../data/subscriptionDetails'

const SubscriptionContext = createContext(null)

export function SubscriptionProvider({ children }) {
  const [invoices, setInvoices] = useState(INITIAL_SUBSCRIPTION_INVOICES)

  function markInvoicePaid(id) {
    setInvoices((previous) => previous.map((invoice) => invoice.id === id
      ? { ...invoice, status: 'paid', paidAt: '2026-09-03' }
      : invoice))
  }

  const stats = useMemo(() => ({
    billed: invoices.reduce((sum, invoice) => sum + invoice.amount, 0),
    collected: invoices.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + invoice.amount, 0),
    outstanding: invoices.filter((invoice) => ['pending', 'overdue'].includes(invoice.status)).reduce((sum, invoice) => sum + invoice.amount, 0),
    overdue: invoices.filter((invoice) => invoice.status === 'overdue').length,
  }), [invoices])

  return <SubscriptionContext.Provider value={{ invoices, stats, markInvoicePaid }}>{children}</SubscriptionContext.Provider>
}

// Context hooks intentionally live beside their provider to match the project pattern.
// eslint-disable-next-line react-refresh/only-export-components
export function useSubscriptions() {
  const context = useContext(SubscriptionContext)
  if (!context) throw new Error('useSubscriptions must be used inside SubscriptionProvider')
  return context
}
