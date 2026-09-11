import PaginatedBody from '../../components/ui/PaginatedBody'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useBranches } from '../../context/BranchContext'
import { useSubscriptions } from '../../context/SubscriptionContext'
import { ROLES } from '../../constants/roles'
import { MOCK_BRANCH_ADMIN_BRANCH_ID } from '../../constants/scope'
import { planModuleCodes, analyticsForModules } from '../../data/planModules'
import { SUBSCRIPTION_STATUSES } from '../../data/subscriptionDetails'

function money(value) {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value) {
  if (!value) return 'Not scheduled'
  return new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

function normalisePlanCode(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
}

function StatusBadge({ status }) {
  const safeStatus = status ?? 'active'
  const styles = {
    active: 'bg-[#E9F7EF] text-[#267A48]',
    paid: 'bg-[#E9F7EF] text-[#267A48]',
    pending: 'bg-[#FFF6D2] text-[#856A00]',
    past_due: 'bg-[#FDECEC] text-[#B63838]',
    overdue: 'bg-[#FDECEC] text-[#B63838]',
    cancelled: 'bg-[#EEE] text-[#666]',
  }
  return <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${styles[safeStatus] ?? styles.pending}`}>{safeStatus.replace('_', ' ')}</span>
}

function MetricCard({ label, value, note, accent = false }) {
  return (
    <article className={`rounded-[22px] p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)] ${accent ? 'bg-[#C3D3A4]' : 'bg-white'}`}>
      <p className={`text-xs font-bold uppercase tracking-wide ${accent ? 'text-black/55' : 'text-[#888]'}`}>{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-[#174B2B]">{value}</p>
      <p className={`mt-1 text-xs ${accent ? 'text-black/55' : 'text-[#AAA]'}`}>{note}</p>
    </article>
  )
}

export default function SubscriptionManagement() {
  const { userRole } = useAuth()
  const { branches, updateBranch, subscriptionPlans, saveSubscriptionPlan, deleteSubscriptionPlan, planModules, planStorageError } = useBranches()
  const { invoices, markInvoicePaid } = useSubscriptions()
  const [activeView, setActiveView] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const isSuperAdmin = userRole === ROLES.superAdmin
  const isBranchAdmin = userRole === ROLES.admin
  const currentView = activeView ?? (isSuperAdmin ? 'plans' : 'subscriptions')
  const [showCatalogue, setShowCatalogue] = useState(false)

  const visibleBranches = useMemo(() => branches.filter((branch) => (
    isSuperAdmin || (isBranchAdmin && branch.id === MOCK_BRANCH_ADMIN_BRANCH_ID)
  )), [branches, isSuperAdmin, isBranchAdmin])
  const visibleBranchIds = new Set(visibleBranches.map((branch) => branch.id))
  const visibleInvoices = invoices.filter((invoice) => visibleBranchIds.has(invoice.branchId))
  const activeSubscriptions = visibleBranches.filter((branch) => branch.subscriptionStatus === 'active')
  const monthlyRevenue = activeSubscriptions.reduce((sum, branch) => sum + (subscriptionPlans[branch.subscription]?.monthlyPrice ?? 0), 0)
  const outstanding = visibleInvoices.filter((invoice) => ['pending', 'overdue'].includes(invoice.status)).reduce((sum, invoice) => sum + invoice.amount, 0)
  const capacityUsed = visibleBranches.length
    ? visibleBranches.reduce((sum, branch) => sum + (branch.capacity ? (branch.students / branch.capacity) * 100 : 0), 0) / visibleBranches.length
    : 0

  if (!isSuperAdmin && !isBranchAdmin) {
    return <div className="rounded-[28px] bg-white p-10 text-center text-sm text-[#777]">Subscription is available to platform and branch administrators only.</div>
  }

  function openEditor(branch) {
    setEditForm({
      branchId: branch.id,
      branchName: branch.name,
      plan: branch.subscription ?? 'Standard',
      status: branch.subscriptionStatus ?? 'active',
      renewsAt: branch.subscriptionRenewsAt ?? '',
    })
  }

  function saveSubscription(event) {
    event.preventDefault()
    updateBranch(editForm.branchId, {
      subscription: editForm.plan,
      subscriptionStatus: editForm.status,
      subscriptionRenewsAt: editForm.renewsAt,
    })
    setEditForm(null)
  }

  function openPlanEditor(code = null) {
    const plan = code ? subscriptionPlans[code] : null
    setEditForm({
      type: 'plan',
      moduleCodes: planModuleCodes(plan),
      moduleCatalogue: planModules,
      originalCode: code,
      code: code ?? '',
      label: plan?.label ?? '',
      monthlyPrice: plan?.monthlyPrice ?? 0,
      studentLimit: plan?.studentLimit ?? '',
      analyticsLevel: plan?.analyticsLevel ?? 'Not included',
      featuresText: plan?.features?.join('\n') ?? '',
      isActive: plan?.isActive ?? true,
    })
  }

  function savePlan(event) {
    event.preventDefault()
    const code = editForm.originalCode || normalisePlanCode(editForm.code)
    if (!code) return
    saveSubscriptionPlan(code, {
      label: editForm.label.trim(),
      price: `${money(Number(editForm.monthlyPrice))} / month`,
      monthlyPrice: Number(editForm.monthlyPrice),
      studentLimit: editForm.studentLimit === '' ? null : Number(editForm.studentLimit),
      analyticsLevel: analyticsForModules(editForm.moduleCodes, editForm.analyticsLevel),
      moduleCodes: editForm.moduleCodes,
      features: editForm.featuresText.split('\n').map((item) => item.trim()).filter(Boolean),
      isActive: editForm.isActive,
    })
    setEditForm(null)
  }

  function deletePlan(code) {
    const branchCount = branches.filter((branch) => branch.subscription === code).length
    const invoiceCount = invoices.filter((invoice) => invoice.plan === code).length
    if (branchCount || invoiceCount) return
    if (!window.confirm(`Delete the ${subscriptionPlans[code]?.label ?? code} plan? This cannot be undone.`)) return
    deleteSubscriptionPlan(code)
    setEditForm(null)
  }

  const heading = isSuperAdmin ? 'Subscription Management' : 'My Subscription'
  const description = isSuperAdmin
    ? 'Manage platform plans, branch renewals and subscription billing.'
    : 'Review your branch plan, usage limits, renewal and platform invoices.'

  return (
    <div className="pb-2">
      {planStorageError && <p role="alert" className="mb-4 text-sm text-red-700">{planStorageError}</p>}
      <div>
        <h2 className="text-2xl font-extrabold text-[#174B2B]">{heading}</h2>
        <p className="mt-1 text-sm text-[#888]">{description}</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label={isSuperAdmin ? 'Platform MRR' : 'Monthly Plan'} value={money(monthlyRevenue)} note="Active subscriptions only" accent />
        <MetricCard label="Active" value={activeSubscriptions.length} note={`${visibleBranches.length} visible subscription${visibleBranches.length === 1 ? '' : 's'}`} />
        <MetricCard label="Outstanding" value={money(outstanding)} note="Platform subscription invoices" />
        <MetricCard label="Capacity Used" value={`${Math.round(capacityUsed)}%`} note="Average branch enrolment capacity" />
      </div>

      <section className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap gap-2 border-b border-[#F0F0F0] pb-4">
          {[
            ...(isSuperAdmin ? [{ id: 'plans', label: 'Plan Catalogue' }] : []),
            { id: 'subscriptions', label: isSuperAdmin ? 'Branch Subscriptions' : 'Current Plan' },
            { id: 'billing', label: 'Billing History' },
          ].map((item) => (
            <button key={item.id} type="button" onClick={() => setActiveView(item.id)} className={`rounded-full px-4 py-2 text-sm font-bold ${currentView === item.id ? 'bg-[#174B2B] text-[#FAF4E7]' : 'bg-[#F4F0E5] text-[#777]'}`}>{item.label}</button>
          ))}
        </div>

        {currentView === 'subscriptions' && (isSuperAdmin
          ? <SubscriptionsView branches={visibleBranches} plans={subscriptionPlans} isSuperAdmin onEdit={openEditor} />
          : <CurrentPlanView branches={visibleBranches} plans={subscriptionPlans} modules={planModules} onChangePlan={() => setShowCatalogue(true)} />)}
        {isSuperAdmin && currentView === 'plans' && <PlansView plans={subscriptionPlans} branches={branches} invoices={invoices} currentPlans={new Set(visibleBranches.map((branch) => branch.subscription))} isSuperAdmin={isSuperAdmin} onEdit={openPlanEditor} onDelete={deletePlan} />}
        {currentView === 'billing' && <BillingView invoices={visibleInvoices} branches={branches} isSuperAdmin={isSuperAdmin} onMarkPaid={markInvoicePaid} />}
      </section>

      <p className="mt-4 text-xs leading-5 text-[#999]">Subscription billing is the fee paid by each branch to use the PAPA platform. It is separate from student fees and school expenses in the Finance module.</p>

      {showCatalogue && isBranchAdmin && <PlanCatalogueDialog plans={subscriptionPlans} branches={visibleBranches} invoices={visibleInvoices} onClose={() => setShowCatalogue(false)} />}

      {editForm?.type === 'plan'
        ? <PlanModal form={editForm} setForm={setEditForm} plans={subscriptionPlans} branches={branches} invoices={invoices} onClose={() => setEditForm(null)} onSubmit={savePlan} onDelete={deletePlan} />
        : editForm && <SubscriptionModal form={editForm} setForm={setEditForm} plans={subscriptionPlans} onClose={() => setEditForm(null)} onSubmit={saveSubscription} />}
    </div>
  )
}

function SubscriptionsView({ branches, plans, isSuperAdmin, onEdit }) {
  if (!branches.length) return <EmptyState />
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead><tr className="border-b border-[#EEEDE8] text-xs font-bold uppercase text-[#888]"><th className="pb-3 pr-4">Branch</th><th className="pb-3 pr-4">Plan</th><th className="pb-3 pr-4">Usage</th><th className="pb-3 pr-4">Monthly Price</th><th className="pb-3 pr-4">Renewal</th><th className="pb-3 pr-4">Status</th>{isSuperAdmin && <th className="pb-3 text-right">Action</th>}</tr></thead>
        <PaginatedBody>{branches.map((branch) => {
          const plan = plans[branch.subscription] ?? plans.Basic
          const limit = plan.studentLimit
          const usage = limit ? Math.min(100, (branch.students / limit) * 100) : Math.min(100, (branch.students / branch.capacity) * 100)
          return <tr key={branch.id} className="border-b border-[#F7F6F2]"><td className="py-4 pr-4"><p className="font-bold text-[#174B2B]">{branch.name}</p><p className="mt-0.5 text-xs text-[#999]">{branch.students} students</p></td><td className="py-4 pr-4 font-semibold">{plan.label}</td><td className="py-4 pr-4"><div className="w-36"><div className="mb-1 flex justify-between text-xs"><span>{branch.students}</span><span>{limit ?? 'Unlimited'}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#EEEDE8]"><div className={`h-full rounded-full ${usage >= 95 ? 'bg-[#E15A5A]' : 'bg-[#C3D3A4]'}`} style={{ width: `${usage}%` }} /></div></div></td><td className="py-4 pr-4 font-semibold">{money(plan.monthlyPrice)}</td><td className="py-4 pr-4">{formatDate(branch.subscriptionRenewsAt)}</td><td className="py-4 pr-4"><StatusBadge status={branch.subscriptionStatus} /></td>{isSuperAdmin && <td className="py-4 text-right"><button type="button" onClick={() => onEdit(branch)} className="rounded-full bg-[#174B2B] px-4 py-2 text-xs font-bold text-[#FAF4E7]">Manage</button></td>}</tr>
        })}</PaginatedBody>
      </table>
    </div>
  )
}

function PlansView({ plans, branches, invoices, currentPlans, isSuperAdmin, onEdit, onDelete }) {
  const { planModules } = useBranches()
  return (
    <div className="mt-5">
      {isSuperAdmin && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-[#F2F0DF] p-4"><div><p className="font-extrabold text-[#174B2B]">Plan configuration</p><p className="mt-1 text-xs text-[#8A7A31]">Plans apply to branches only; superadmin always has full platform access. Price changes affect future invoices.</p></div><button type="button" onClick={() => onEdit()} className="rounded-full bg-[#C3D3A4] px-5 py-2.5 text-sm font-bold text-[#174B2B]">Create plan</button></div>}
      <div className="grid gap-4 lg:grid-cols-3">
      {Object.entries(plans).reverse().map(([code, plan]) => (
        <article key={code} className={`rounded-[24px] border p-5 ${code === 'Premium' ? 'border-[#C3D3A4] bg-[#FFFDF4]' : 'border-[#EEEDE8]'} ${!plan.isActive ? 'opacity-60' : ''}`}>
          <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-extrabold text-[#174B2B]">{plan.label}</h3>{!plan.isActive && <span className="rounded-full bg-[#EEE] px-2 py-1 text-[9px] font-bold uppercase text-[#666]">Inactive</span>}</div><p className="mt-1 text-2xl font-extrabold">{money(plan.monthlyPrice)}<span className="text-xs font-medium text-[#999]"> / month</span></p><p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[#AAA]">Code: {code}</p></div>{!isSuperAdmin && currentPlans.has(code) && <span className="rounded-full bg-[#174B2B] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#FAF4E7]">Current plan</span>}</div>
          <div className="mt-5"><p className="text-xs font-bold uppercase text-[#777]">Included modules · {planModuleCodes(plan).length}</p><div className="mt-2 flex flex-wrap gap-2">{planModuleCodes(plan).map((moduleCode) => <span key={moduleCode} title={planModules.find((module) => module.code === moduleCode)?.description} className="rounded-lg bg-[#F4F0E5] px-2 py-1 text-xs">{planModules.find((module) => module.code === moduleCode)?.name ?? moduleCode}</span>)}</div>{!planModuleCodes(plan).length && <p className="mt-2 text-xs text-[#999]">No modules selected.</p>}</div>
          <div className="mt-5 space-y-3">{plan.features.map((feature) => <div key={feature} className="flex gap-2 text-sm text-[#666]"><span className="font-bold text-[#42A86B]">✓</span><span>{feature}</span></div>)}</div>
          <div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded-2xl bg-white p-3 text-xs text-[#777]"><span className="block font-bold text-[#174B2B]">Student limit</span><span className="mt-1 block">{plan.studentLimit ?? 'Unlimited'}</span></div><div className="rounded-2xl bg-white p-3 text-xs text-[#777]"><span className="block font-bold text-[#174B2B]">Branches</span><span className="mt-1 block">{branches.filter((branch) => branch.subscription === code).length} using</span></div></div>
          <div className="mt-2 rounded-2xl bg-white p-3 text-xs text-[#777]"><span className="font-bold text-[#174B2B]">Analytics:</span> {plan.analyticsLevel}</div>
          {isSuperAdmin && <div className="mt-4 flex gap-2"><button type="button" onClick={() => onEdit(code)} className="flex-1 rounded-full border border-[#DADADA] px-4 py-2.5 text-sm font-bold text-[#333]">Edit plan</button>{branches.every((branch) => branch.subscription !== code) && invoices.every((invoice) => invoice.plan !== code) && <button type="button" onClick={() => onDelete(code)} className="rounded-full border border-[#F1B8B8] px-4 py-2.5 text-sm font-bold text-[#B63838]">Delete</button>}</div>}
        </article>
      ))}
      </div>
    </div>
  )
}

function BillingView({ invoices, branches, isSuperAdmin, onMarkPaid }) {
  if (!invoices.length) return <EmptyState />
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[850px] text-left text-sm">
        <thead><tr className="border-b border-[#EEEDE8] text-xs font-bold uppercase text-[#888]"><th className="pb-3 pr-4">Invoice</th><th className="pb-3 pr-4">Branch</th><th className="pb-3 pr-4">Period</th><th className="pb-3 pr-4">Due</th><th className="pb-3 pr-4">Amount</th><th className="pb-3 pr-4">Status</th>{isSuperAdmin && <th className="pb-3 text-right">Action</th>}</tr></thead>
        <PaginatedBody>{invoices.map((invoice) => <tr key={invoice.id} className="border-b border-[#F7F6F2]"><td className="py-4 pr-4 font-bold">{invoice.invoiceNo}</td><td className="py-4 pr-4">{branches.find((branch) => branch.id === invoice.branchId)?.name}</td><td className="py-4 pr-4">{invoice.billingPeriod}</td><td className="py-4 pr-4">{formatDate(invoice.dueDate)}</td><td className="py-4 pr-4 font-semibold">{money(invoice.amount)}</td><td className="py-4 pr-4"><StatusBadge status={invoice.status} /></td>{isSuperAdmin && <td className="py-4 text-right">{invoice.status !== 'paid' ? <button type="button" onClick={() => onMarkPaid(invoice.id)} className="rounded-full border border-[#DADADA] px-4 py-2 text-xs font-bold">Mark paid</button> : <span className="text-xs text-[#999]">{formatDate(invoice.paidAt)}</span>}</td>}</tr>)}</PaginatedBody>
      </table>
    </div>
  )
}

function SubscriptionModal({ form, setForm, plans, onClose, onSubmit }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <form onSubmit={onSubmit} className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-extrabold text-[#174B2B]">Manage Subscription</h3><p className="mt-1 text-sm text-[#888]">{form.branchName}</p></div><button type="button" onClick={onClose} className="h-9 w-9 rounded-full bg-[#F4F0E5] text-lg">×</button></div>
        <div className="mt-6 space-y-4">
          <label className="block text-sm font-bold text-[#555]">Plan<select value={form.plan} onChange={(event) => setForm((previous) => ({ ...previous, plan: event.target.value }))} className="mt-2 w-full rounded-2xl border border-[#E1E1E1] bg-white px-4 py-3 font-normal">{Object.keys(plans).filter((plan) => plans[plan].isActive || plan === form.plan).map((plan) => <option key={plan} value={plan}>{plans[plan].label} · {money(plans[plan].monthlyPrice)}/month</option>)}</select></label>
          <label className="block text-sm font-bold text-[#555]">Status<select value={form.status} onChange={(event) => setForm((previous) => ({ ...previous, status: event.target.value }))} className="mt-2 w-full rounded-2xl border border-[#E1E1E1] bg-white px-4 py-3 font-normal">{SUBSCRIPTION_STATUSES.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></label>
          <label className="block text-sm font-bold text-[#555]">Next renewal<input type="date" value={form.renewsAt} onChange={(event) => setForm((previous) => ({ ...previous, renewsAt: event.target.value }))} className="mt-2 w-full rounded-2xl border border-[#E1E1E1] px-4 py-3 font-normal" /></label>
        </div>
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-full border border-[#DDD] px-5 py-2.5 text-sm font-bold">Cancel</button><button type="submit" className="rounded-full bg-[#C3D3A4] px-5 py-2.5 text-sm font-bold text-[#174B2B]">Save changes</button></div>
      </form>
    </div>
  )
}

function PlanModal({ form, setForm, plans, branches, invoices, onClose, onSubmit, onDelete }) {
  const normalisedCode = normalisePlanCode(form.code)
  const codeExists = !form.originalCode && Object.keys(plans).some((code) => code.toLowerCase() === normalisedCode)
  const branchCount = branches.filter((branch) => branch.subscription === form.originalCode).length
  const invoiceCount = invoices.filter((invoice) => invoice.plan === form.originalCode).length
  const canDelete = Boolean(form.originalCode) && branchCount === 0 && invoiceCount === 0
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <form onSubmit={onSubmit} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-extrabold text-[#174B2B]">{form.originalCode ? 'Edit Plan' : 'Create Plan'}</h3><p className="mt-1 text-sm text-[#888]">Configure future subscription pricing and entitlement.</p></div><button type="button" onClick={onClose} className="h-9 w-9 rounded-full bg-[#F4F0E5] text-lg">×</button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold text-[#555]">Plan code<input required disabled={Boolean(form.originalCode)} value={form.code} onChange={(event) => setForm((previous) => ({ ...previous, code: event.target.value }))} placeholder="professional" className="mt-2 w-full rounded-2xl border border-[#E1E1E1] px-4 py-3 font-normal disabled:bg-[#F4F0E5]" />{codeExists && <span className="mt-1 block text-xs text-[#B63838]">This plan code already exists.</span>}</label>
          <label className="block text-sm font-bold text-[#555]">Display name<input required value={form.label} onChange={(event) => setForm((previous) => ({ ...previous, label: event.target.value }))} placeholder="Professional" className="mt-2 w-full rounded-2xl border border-[#E1E1E1] px-4 py-3 font-normal" /></label>
          <label className="block text-sm font-bold text-[#555]">Monthly price (RM)<input required min="0" step="0.01" type="number" value={form.monthlyPrice} onChange={(event) => setForm((previous) => ({ ...previous, monthlyPrice: event.target.value }))} className="mt-2 w-full rounded-2xl border border-[#E1E1E1] px-4 py-3 font-normal" /></label>
          <label className="block text-sm font-bold text-[#555]">Student limit<input min="1" type="number" value={form.studentLimit} onChange={(event) => setForm((previous) => ({ ...previous, studentLimit: event.target.value }))} placeholder="Blank for unlimited" className="mt-2 w-full rounded-2xl border border-[#E1E1E1] px-4 py-3 font-normal" /></label>
          <ModulePicker form={form} setForm={setForm} />
          {form.moduleCodes.includes('ai_analytics') && <label className="block text-sm font-bold text-[#555] sm:col-span-2">Analytics level<select value={analyticsForModules(form.moduleCodes, form.analyticsLevel)} onChange={(event) => setForm((previous) => ({ ...previous, analyticsLevel: event.target.value }))} className="mt-2 w-full rounded-2xl border border-[#E1E1E1] bg-white px-4 py-3 font-normal"><option>Basic analytics</option><option>Full AI analytics</option></select></label>}
          <label className="block text-sm font-bold text-[#555] sm:col-span-2">Additional benefits<span className="mt-1 block text-xs font-normal text-[#888]">Optional, one per line. Use this for benefits such as email support; select modules above.</span><textarea rows="3" value={form.featuresText} onChange={(event) => setForm((previous) => ({ ...previous, featuresText: event.target.value }))} className="mt-2 w-full resize-none rounded-2xl border border-[#E1E1E1] px-4 py-3 font-normal" /></label>
          <label className="flex items-center justify-between rounded-2xl bg-[#F7F7F4] p-4 text-sm font-bold text-[#555] sm:col-span-2"><span><span className="block">Available for assignment</span><span className="mt-1 block text-xs font-normal text-[#999]">Inactive plans remain attached to existing branches but cannot be newly assigned.</span></span><input type="checkbox" checked={form.isActive} onChange={(event) => setForm((previous) => ({ ...previous, isActive: event.target.checked }))} className="h-5 w-5 accent-[#174B2B]" /></label>
        </div>
        {form.originalCode && !canDelete && <p className="mt-5 rounded-2xl bg-[#F7F7F4] p-3 text-xs text-[#777]">This plan cannot be deleted because it is referenced by {branchCount} branch{branchCount === 1 ? '' : 'es'} and {invoiceCount} historical invoice{invoiceCount === 1 ? '' : 's'}. You can deactivate it instead.</p>}
        <div className="mt-6 flex flex-wrap justify-between gap-3"><div>{canDelete && <button type="button" onClick={() => onDelete(form.originalCode)} className="rounded-full border border-[#F1B8B8] px-5 py-2.5 text-sm font-bold text-[#B63838]">Delete plan</button>}</div><div className="flex gap-3"><button type="button" onClick={onClose} className="rounded-full border border-[#DDD] px-5 py-2.5 text-sm font-bold">Cancel</button><button type="submit" disabled={codeExists} className="rounded-full bg-[#C3D3A4] px-5 py-2.5 text-sm font-bold text-[#174B2B] disabled:opacity-40">Save plan</button></div></div>
      </form>
    </div>
  )
}

function EmptyState() {
  return <p className="py-12 text-center text-sm text-[#888]">No subscription data is available.</p>
}

function ModulePicker({ form, setForm }) {
  return <fieldset className="sm:col-span-2">
    <legend className="text-sm font-bold text-[#555]">Included modules</legend>
    <p className="mt-1 text-xs leading-5 text-[#888]">Select the existing modules included in this plan. Each plan can have a different selection.</p>
    <p className="mt-2 text-xs font-semibold text-[#777]">{form.moduleCodes.length} of {form.moduleCatalogue.length} selected</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">{form.moduleCatalogue.map((module) => <label key={module.code} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 ${form.moduleCodes.includes(module.code) ? 'border-[#E3C543] bg-[#FFFBE8]' : 'border-[#E1E1E1]'}`}>
      <input type="checkbox" checked={form.moduleCodes.includes(module.code)} onChange={(event) => { const checked = event.target.checked; setForm((previous) => ({ ...previous, moduleCodes: checked ? [...previous.moduleCodes, module.code] : previous.moduleCodes.filter((code) => code !== module.code) })) }} className="mt-1 h-4 w-4 shrink-0 accent-[#174B2B]" />
      <span><span className="block text-sm font-bold text-[#333]">{module.name}</span><span className="mt-1 block text-xs leading-5 text-[#777]">{module.description}</span></span>
    </label>)}</div>
  </fieldset>
}

function CurrentPlanView({ branches, plans, modules, onChangePlan }) {
  if (!branches.length) return <EmptyState />
  return <div className="mt-5 space-y-5">{branches.map((branch) => {
    const plan = plans[branch.subscription]
    if (!plan) return <p key={branch.id} className="py-8 text-sm text-[#777]">Your plan details are currently unavailable.</p>
    const codes = planModuleCodes(plan)
    const limit = plan.studentLimit
    const usage = limit ? Math.min(100, branch.students / limit * 100) : null
    return <article key={branch.id}>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[24px] border border-[#F0DF8F] bg-[#FFFBE8] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-widest text-[#48634B]">Your current plan</p><StatusBadge status={branch.subscriptionStatus} /></div>
          <h3 className="mt-5 text-3xl font-extrabold text-[#174B2B]">{plan.label}</h3>
          <p className="mt-1 text-sm text-[#777]">{branch.name}</p>
          <p className="mt-5 text-3xl font-extrabold text-[#174B2B]">{money(plan.monthlyPrice)}<span className="ml-1 text-sm font-normal text-[#777]">/ month</span></p>
          <div className="mt-6 flex flex-wrap items-center gap-4"><button type="button" onClick={onChangePlan} className="rounded-full bg-[#174B2B] px-6 py-3 text-sm font-bold text-[#FAF4E7]">Change plan</button><span className="text-xs text-[#48634B]">Compare available plans for your branch</span></div>
        </div>
        <div className="rounded-[24px] border border-[#EEEDE8] p-6">
          <h4 className="text-sm font-bold text-[#174B2B]">Subscription details</h4>
          <dl className="mt-4 space-y-4 text-sm"><div className="flex justify-between gap-3"><dt className="text-[#888]">Next renewal</dt><dd className="font-semibold">{formatDate(branch.subscriptionRenewsAt)}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#888]">Billing cycle</dt><dd className="font-semibold">Monthly</dd></div><div className="flex justify-between gap-3"><dt className="text-[#888]">Student allowance</dt><dd className="font-semibold">{limit ?? 'Unlimited'}</dd></div></dl>
          <div className="mt-5 border-t border-[#EEEDE8] pt-4"><p className="text-xs font-bold text-[#777]">Student usage</p><p className="mt-2 text-lg font-extrabold">{branch.students}<span className="text-sm font-normal text-[#888]">{limit ? ` / ${limit} students` : ' students enrolled'}</span></p>{usage !== null ? <><div role="progressbar" aria-label="Student allowance used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(usage)} className="mt-3 h-2 overflow-hidden rounded-full bg-[#F0F0EB]"><div className={`h-full rounded-full ${branch.students > limit ? 'bg-[#E15A5A]' : 'bg-[#C3D3A4]'}`} style={{ width: `${usage}%` }} /></div><p className="mt-2 text-xs text-[#888]">{branch.students > limit ? `${branch.students - limit} students above your allowance` : `${limit - branch.students} student places remaining`}</p></> : <p className="mt-2 text-xs text-[#888]">Your plan has no student limit.</p>}</div>
        </div>
      </div>
      <div className="mt-6"><div className="flex items-center gap-3"><h4 className="text-base font-extrabold">Included in your plan</h4><span className="rounded-full bg-[#F4F0E5] px-3 py-1 text-xs text-[#777]">{codes.length} modules</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{codes.map((code) => { const module = modules.find((item) => item.code === code); return <div key={code} className="flex items-start gap-3 rounded-2xl bg-[#F8F8F5] p-4"><span className="font-bold text-[#42A86B]">✓</span><div><p className="text-sm font-bold">{module?.name ?? code}</p><p className="mt-1 text-xs leading-5 text-[#888]">{module?.description}</p></div></div> })}</div>{!codes.length && <p className="mt-3 text-sm text-[#888]">No modules included in this plan.</p>}</div>
      {plan.features.length > 0 && <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">{plan.features.map((feature) => <p key={feature} className="text-xs text-[#777]"><span className="mr-2 text-[#42A86B]">✓</span>{feature}</p>)}</div>}
    </article>
  })}</div>
}

function PlanCatalogueDialog({ plans, branches, invoices, onClose }) {
  const dialogRef = useRef(null)
  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])
  const availablePlans = Object.fromEntries(Object.entries(plans).filter(([, plan]) => plan.isActive))
  return <dialog ref={dialogRef} aria-labelledby="change-plan-title" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose() }} className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-6xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl backdrop:bg-black/40">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#888]">Plan catalogue</p><h3 id="change-plan-title" className="mt-1 text-2xl font-extrabold">Find the right plan for your branch</h3><p className="mt-2 text-sm text-[#888]">Compare monthly pricing, student limits and included modules.</p></div><button type="button" autoFocus aria-label="Close plan catalogue" onClick={onClose} className="h-10 w-10 shrink-0 rounded-full bg-[#F4F0E5] text-xl">×</button></div>
    {Object.keys(availablePlans).length ? <PlansView plans={availablePlans} branches={branches} invoices={invoices} currentPlans={new Set(branches.map((branch) => branch.subscription))} isSuperAdmin={false} /> : <p className="py-10 text-sm text-[#888]">No plans are currently available.</p>}
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#EEEDE8] pt-5"><p className="max-w-xl text-sm text-[#777]">To switch plans, contact your platform administrator with your preferred plan. Your current subscription stays active until a change is arranged.</p><button type="button" onClick={onClose} className="rounded-full bg-[#174B2B] px-5 py-3 text-sm font-bold text-[#FAF4E7]">Back to current plan</button></div>
  </dialog>
}
