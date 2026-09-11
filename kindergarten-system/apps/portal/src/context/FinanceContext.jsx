import { useMemo, useState } from 'react'
import { INITIAL_EXPENSES, INITIAL_PAYMENTS } from '../data/financeDetails'

import { FinanceContext } from './FinanceContextStore.js'

export function FinanceProvider({ children }) {
  const [payments, setPayments] = useState(INITIAL_PAYMENTS)
  const [expenses, setExpenses] = useState(INITIAL_EXPENSES)

  function addPayment(data) {
    setPayments((previous) => [...previous, {
      ...data,
      id: crypto.randomUUID(),
      invoiceNo: data.invoiceNo || `INV-${Date.now()}`,
    }])
  }

  function updatePaymentStatus(id, status) {
    setPayments((previous) => previous.map((payment) => payment.id === id
      ? {
          ...payment,
          status,
          paymentDate: status === 'paid' ? payment.paymentDate || '2026-09-02' : payment.paymentDate,
        }
      : payment))
  }

  function addExpense(data) {
    setExpenses((previous) => [...previous, {
      ...data,
      id: crypto.randomUUID(),
      status: 'pending',
    }])
  }

  function reviewExpense(id, status) {
    setExpenses((previous) => previous.map((expense) => expense.id === id ? { ...expense, status } : expense))
  }

  const stats = useMemo(() => ({
    collected: payments.filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + payment.amount, 0),
    outstanding: payments.filter((payment) => ['pending', 'partial', 'overdue'].includes(payment.status)).reduce((sum, payment) => sum + payment.amount, 0),
    expenses: expenses.filter((expense) => expense.status === 'approved').reduce((sum, expense) => sum + expense.amount, 0),
  }), [payments, expenses])

  return (
    <FinanceContext.Provider value={{ payments, expenses, stats, addPayment, updatePaymentStatus, addExpense, reviewExpense }}>
      {children}
    </FinanceContext.Provider>
  )
}
