import { createContext, useContext, useMemo, useState } from 'react'
import { SUBSCRIPTION_PLANS } from '../data/branchDetails'

import { useMasterData } from './MasterDataContext'
import { PLAN_MODULES } from '../data/planModules'

function readSaved(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

const BranchContext = createContext(null)

export function BranchProvider({ children }) {
  const { data: master, mutate } = useMasterData()
  const branches = (master.branches ?? []).map((b) => ({ ...b, students: (master.students ?? []).filter((s) => s.branch_id === b.id && s.status === 'active').length, staff: (master.branch_staff ?? []).filter((s) => s.branch_id === b.id && s.status === 'active').length }))
  const [savedCatalogue] = useState(() => readSaved('papa.planCatalogue', { plans: SUBSCRIPTION_PLANS, modules: PLAN_MODULES }))
  const [subscriptionPlans, setSubscriptionPlans] = useState(savedCatalogue.plans)
  const planModules = PLAN_MODULES
  const [planStorageError, setPlanStorageError] = useState('')

  function persistCatalogue(plans, modules) {
    try {
      localStorage.setItem('papa.planCatalogue', JSON.stringify({ plans, modules }))
      setPlanStorageError('')
    } catch { setPlanStorageError('Browser storage is unavailable. Changes will be lost when you refresh.') }
  }

  const stats = useMemo(() => ({
    total: branches.length,
    active: branches.filter((b) => b.status === 'active').length,
    students: branches.reduce((sum, b) => sum + b.students, 0),
    staff: branches.reduce((sum, b) => sum + b.staff, 0),
    capacity: branches.reduce((sum, b) => sum + b.capacity, 0),
  }), [branches])

  function addBranch(data) { return mutate('save_master_record', { entity: 'branches', record_key: null, payload: data }) }
  function updateBranch(id, data) { return mutate('save_master_record', { entity: 'branches', record_key: String(id), payload: data }) }
  function toggleBranchStatus(id) { return updateBranch(id, { status: branches.find((b) => b.id === id)?.status === 'active' ? 'inactive' : 'active' }) }
  function updateSubscription() { throw new Error('Use the subscription management workflow.') }

  function saveSubscriptionPlan(code, data) {
    const nextPlans = {
      ...subscriptionPlans,
      [code]: { ...subscriptionPlans[code], ...data, updatedAt: new Date().toISOString() },
    }
    setSubscriptionPlans(nextPlans)
    persistCatalogue(nextPlans, planModules)
  }

  function deleteSubscriptionPlan(code) {
    if (branches.some((branch) => branch.subscription === code)) return false
    const nextPlans = Object.fromEntries(Object.entries(subscriptionPlans).filter(([planCode]) => planCode !== code))
    setSubscriptionPlans(nextPlans)
    persistCatalogue(nextPlans, planModules)
    return true
  }

  function getBranch(id) {
    return branches.find((b) => b.id === id) ?? null
  }

  function getBranchStudents(id) {
    return (master.students ?? []).filter((s) => s.branch_id === id).map((s) => ({ ...s, name: s.name ?? s.full_name, className: s.class_name }))
  }

  function getBranchStaff(id) {
    return (master.branch_staff ?? []).filter((s) => s.branch_id === id).map((s) => ({ ...s, name: s.name ?? s.full_name, role: s.staff_role }))
  }

  function getSubscriptionPlan(plan) {
    return subscriptionPlans[plan] ?? subscriptionPlans.Basic
  }

  return (
    <BranchContext.Provider
      value={{
        branches,
        stats,
        addBranch,
        updateBranch,
        toggleBranchStatus,
        updateSubscription,
        subscriptionPlans,
        planModules,
        planStorageError,
        saveSubscriptionPlan,
        deleteSubscriptionPlan,
        getBranch,
        getBranchStudents,
        getBranchStaff,
        getSubscriptionPlan,
      }}
    >
      {children}
    </BranchContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBranches() {
  const ctx = useContext(BranchContext)
  if (!ctx) throw new Error('useBranches must be used inside BranchProvider')
  return ctx
}
