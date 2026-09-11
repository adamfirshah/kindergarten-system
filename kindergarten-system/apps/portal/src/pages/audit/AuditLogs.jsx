import RefreshButton from '../../components/ui/RefreshButton'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ROLES, ROLE_LABELS } from '../../constants/roles'
import { supabase } from '../../lib/supabase'
import { AUDIT_ACTIONS, AUDIT_MODULES, PAGE_SIZE, fetchAuditLogs } from '../../services/auditLogs'

const emptyFilters = { module: '', action: '', branch: '', from: '', to: '' }
const fieldClass = 'mt-1 w-full rounded-xl border border-[#E5E5DF] bg-white px-3 py-2.5 text-sm font-normal'
function timestamp(value) {
  return new Intl.DateTimeFormat('en-MY', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(value))
}

export default function AuditLogs() {
  const { session, userRole, loadingRole } = useAuth()
  if (loadingRole || session === undefined) return <p className="p-8 text-sm text-[#888]">Loading access…</p>
  if (!session || ![ROLES.superAdmin, ROLES.admin].includes(userRole)) return <p role="alert" className="rounded-3xl bg-white p-8 text-sm text-[#777]">Audit logs are only available to superadmins and branch administrators.</p>
  return <AuditBrowser key={`${session.user.id}-${userRole}`} isSuperAdmin={userRole === ROLES.superAdmin} />
}

function AuditBrowser({ isSuperAdmin }) {
  const [filters, setFilters] = useState(emptyFilters)
  const [page, setPage] = useState(0)
  const [logsLoading, setLogsLoading] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [branches, setBranches] = useState([])
  const [branchError, setBranchError] = useState('')
  useEffect(() => {
    if (!isSuperAdmin) return
    let cancelled = false
    async function load() {
      try {
        const { data, error } = await supabase.from('branches').select('id,name').order('name')
        if (error) throw error
        if (!cancelled) { setBranches(data ?? []); setBranchError('') }
      } catch { if (!cancelled) setBranchError('Branch filter unavailable. You can still view all accessible logs.') }
    }
    load()
    return () => { cancelled = true }
  }, [isSuperAdmin, refresh])
  function changeFilter(name, value) {
    setFilters((previous) => ({ ...previous, [name]: value }))
    setPage(0)
  }
  const invalidDates = filters.from && filters.to && filters.from > filters.to
  return <div className="pb-4">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-extrabold text-[#174B2B]">Audit Logs</h2><p className="mt-1 text-sm text-[#888]">Track who changed records, when it happened and which fields were affected.</p></div><RefreshButton loading={logsLoading && !invalidDates} type="button" onClick={() => setRefresh((value) => value + 1)} className="rounded-full border border-[#DDD] bg-white px-5 py-2.5 text-sm font-bold">Refresh logs</RefreshButton></div>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-[#F2F0DF] p-5"><div><p className="text-sm font-extrabold text-[#174B2B]">{isSuperAdmin ? 'Platform-wide visibility' : 'Your branch only'}</p><p className="mt-1 text-xs leading-5 text-[#48634B]">{isSuperAdmin ? 'View activity across every branch, including platform-level changes.' : 'Only events belonging to your assigned branch are visible. Platform-level and other branches’ events are excluded.'}</p></div><span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#48634B]">Read-only history</span></div>
    <section className="mt-5 rounded-[28px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-extrabold">Activity history</h3><button type="button" onClick={() => { setFilters(emptyFilters); setPage(0) }} className="text-xs font-bold text-[#777] underline">Clear filters</button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {isSuperAdmin && <label className="text-xs font-bold text-[#777]">Branch<select value={filters.branch} onChange={(event) => changeFilter('branch', event.target.value)} className={fieldClass}><option value="">All branches + platform</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name || branch.id}</option>)}</select></label>}
        <label className="text-xs font-bold text-[#777]">Module<select value={filters.module} onChange={(event) => changeFilter('module', event.target.value)} className={fieldClass}><option value="">All modules</option>{Object.entries(AUDIT_MODULES).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
        <label className="text-xs font-bold text-[#777]">Action<select value={filters.action} onChange={(event) => changeFilter('action', event.target.value)} className={fieldClass}><option value="">All actions</option>{Object.entries(AUDIT_ACTIONS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
        <label className="text-xs font-bold text-[#777]">From date<input type="date" value={filters.from} onChange={(event) => changeFilter('from', event.target.value)} className={fieldClass} /></label>
        <label className="text-xs font-bold text-[#777]">To date<input type="date" value={filters.to} onChange={(event) => changeFilter('to', event.target.value)} className={fieldClass} /></label>
      </div>
      {branchError && <p role="status" className="mt-3 text-xs text-[#888]">{branchError}</p>}
      {invalidDates ? <p role="alert" className="py-8 text-sm text-red-700">Choose an end date on or after the start date.</p> : <AuditResults onLoading={setLogsLoading} key={JSON.stringify({ filters, page, refresh })} filters={filters} page={page} setPage={setPage} />}
    </section>
    <p className="mt-4 text-xs leading-5 text-[#999]">Times are shown in Malaysia time (UTC+8). History starts when audit logging is enabled and records saved database changes. Unsaved changes and actions in demo-only modules are not recorded.</p>
  </div>
}

function AuditResults({ filters, page, setPage, onLoading }) {
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  useEffect(() => {
    let cancelled = false
    onLoading(true)
    fetchAuditLogs(supabase, filters, page).then((data) => { if (!cancelled) setResult(data) }).catch((failure) => {
      if (!cancelled) setError(['42P01', 'PGRST205'].includes(failure.code) ? 'Audit logging is not installed yet. Ask your platform administrator to run migration 013_audit_logs.sql.' : 'Unable to load audit logs. Check your connection and access, then refresh to retry.')
    }).finally(() => { if (!cancelled) onLoading(false) })
    return () => { cancelled = true }
  }, [filters, page, onLoading])
  if (error) return <p role="alert" className="my-5 rounded-2xl bg-[#FFF0EC] p-5 text-sm text-[#A33]">{error}</p>
  if (!result) return <p role="status" className="py-12 text-center text-sm text-[#888]">Loading audit logs…</p>
  return <>
    <p aria-live="polite" className="mt-5 text-xs text-[#888]">{result.total} matching event{result.total === 1 ? '' : 's'}</p>
    {!result.rows.length ? <div className="py-14 text-center"><h4 className="font-bold">No activity found</h4><p className="mt-2 text-sm text-[#888]">Try a different filter. New database changes will appear here after they are saved.</p></div> : <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead><tr className="border-b border-[#EEE] text-xs uppercase text-[#888]">{['Time (MYT)', 'Performed by', 'Activity', 'Branch', 'Details'].map((label) => <th key={label} scope="col" className="px-3 py-3">{label}</th>)}</tr></thead><tbody>{result.rows.map((event) => <tr key={event.id} className="border-b border-[#F2F2EE] hover:bg-[#FCFCF8]"><td className="px-3 py-4 text-xs text-[#777]">{timestamp(event.occurred_at)}</td><td className="px-3 py-4"><p className="font-semibold">{event.actor_name}</p><p className="mt-1 text-xs text-[#999]">{ROLE_LABELS[event.actor_role] ?? 'System / database'}</p></td><td className="px-3 py-4"><span className={`rounded-full px-2 py-1 text-xs font-bold ${event.action === 'DELETE' ? 'bg-[#FDECEC] text-[#B63838]' : event.action === 'INSERT' ? 'bg-[#E9F7EF] text-[#267A48]' : 'bg-[#FFF6D2] text-[#856A00]'}`}>{AUDIT_ACTIONS[event.action]}</span><p className="mt-2 text-xs text-[#777]">{AUDIT_MODULES[event.module] ?? event.module}</p></td><td className="px-3 py-4 text-xs text-[#777]">{event.branch_name ?? (event.branch_id ? 'Branch record' : 'Platform / unscoped')}</td><td className="px-3 py-4"><button type="button" aria-label={`View ${AUDIT_ACTIONS[event.action]} ${AUDIT_MODULES[event.module]} event`} onClick={() => setSelected(event)} className="rounded-full border border-[#DDD] px-3 py-2 text-xs font-bold">View details</button></td></tr>)}</tbody></table></div>}
    <div className="mt-5 flex items-center justify-between gap-3"><p className="text-xs text-[#888]">Page {page + 1} of {Math.max(page + 1, Math.ceil(result.total / PAGE_SIZE))}</p><div className="flex gap-2"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-full border px-4 py-2 text-xs font-bold disabled:opacity-40">Previous</button><button type="button" disabled={(page + 1) * PAGE_SIZE >= result.total} onClick={() => setPage(page + 1)} className="rounded-full border px-4 py-2 text-xs font-bold disabled:opacity-40">Next</button></div></div>
    {selected && <AuditDetail event={selected} onClose={() => setSelected(null)} />}
  </>
}

function AuditDetail({ event, onClose }) {
  const ref = useRef(null)
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close() }, [])
  return <dialog ref={ref} aria-labelledby="audit-detail-title" onCancel={onClose} onClick={(click) => { if (click.target === click.currentTarget) onClose() }} className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl backdrop:bg-black/40">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase text-[#888]">Audit event</p><h3 id="audit-detail-title" className="mt-1 text-xl font-extrabold">{AUDIT_MODULES[event.module]} · {AUDIT_ACTIONS[event.action]}</h3></div><button autoFocus type="button" aria-label="Close event details" onClick={onClose} className="h-9 w-9 rounded-full bg-[#F4F0E5]">×</button></div>
    <dl className="mt-5 space-y-3 text-sm">{[['Time (MYT)', timestamp(event.occurred_at)], ['Performed by', event.actor_name], ['Role', ROLE_LABELS[event.actor_role] ?? 'System / database'], ['Branch', event.branch_name ?? event.branch_id ?? 'Platform / unscoped'], ['Record ID', event.record_id ?? 'Unavailable'], ['Event ID', event.id]].map(([label, value]) => <div key={label}><dt className="text-xs text-[#888]">{label}</dt><dd className="mt-1 break-all font-medium">{value}</dd></div>)}</dl>
    <h4 className="mt-5 text-sm font-bold">{event.action === 'UPDATE' ? 'Changed fields' : 'Recorded fields'}</h4><div className="mt-2 flex flex-wrap gap-2">{event.changed_fields.map((field) => <span key={field} className="rounded-lg bg-[#F4F0E5] px-2 py-1 text-xs">{field.replaceAll('_', ' ')}</span>)}</div><p className="mt-4 text-xs leading-5 text-[#888]">Field values are not copied into the audit trail. This preserves a record of the change without duplicating sensitive information.</p>
  </dialog>
}
