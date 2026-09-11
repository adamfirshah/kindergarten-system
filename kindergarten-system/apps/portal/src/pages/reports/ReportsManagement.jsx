import RefreshButton from '../../components/ui/RefreshButton'
import PaginatedBody from '../../components/ui/PaginatedBody'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import DemoReports from './DemoReports'
const money = (n) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(Number(n))
const metrics = [['invoiced','Invoices due'],['collected','Payments recorded'],['outstanding','Unpaid invoices due'],['overdue','Overdue within period'],['approved_expenses','Approved expenses']]
const field = 'rounded-xl border border-gray-300 bg-white px-3 py-2 text-[#174B2B]'
export default function ReportsManagement() {
  const { userRole, userBranchId, session } = useAuth()
  const canFinance = [1,2,5].includes(userRole)
  const [demo, setDemo] = useState(false)
  return <div className="space-y-5 text-[#174B2B]">
    {canFinance && <div className="flex gap-3"><button className={field} onClick={() => setDemo(false)}>Financial reports</button><button className={field} onClick={() => setDemo(true)}>Legacy reports (demo)</button></div>}
    {canFinance && !demo ? <LiveFinanceReport key={`${session?.user?.id}:${userRole}:${userBranchId}`} /> : <><p role="status" className="rounded-xl bg-amber-50 p-4 text-amber-900">Demo reports — these figures use sample operational data and are not official reports. Do not use these exports for accounting or student assessment.</p><DemoReports /></>}
  </div>
}
function LiveFinanceReport() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const [from, setFrom] = useState(`${today.slice(0,7)}-01`)
  const [to, setTo] = useState(today)
  const [result, setResult] = useState(null)
  const [revision, setRevision] = useState(0)
  const [branch, setBranch] = useState('')
  useEffect(() => {
    let active = true
    supabase.rpc('get_live_finance_report', { date_from: from, date_to: to }).then(({ data, error }) => {
      if (active) setResult({ from,to,revision,data,error: error?.message })
    }).catch((error) => { if (active) setResult({ from,to,revision,error: error.message }) })
    return () => { active = false }
  }, [from,to,revision])
  const current = result?.from===from && result?.to===to && result?.revision===revision ? result : null
  const rows = (current?.data?.rows ?? []).filter((r) => !branch || r.branch_id===branch)
  const total = (key) => rows.reduce((sum,r) => sum + Number(r[key] ?? 0),0)
  function download() {
    const escape = (value) => `"${String(value ?? '').replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"','""')}"`
    const csv = [['From','To','Branch',...metrics.map((m)=>m[1]),'Partial invoices excluded from outstanding','Paid invoices without date (all dates)'],...rows.map((r)=>[from,to,r.branch_name,...metrics.map(([k])=>r[k]),r.partial_count,r.missing_date_count])].map((r)=>r.map(escape).join(',')).join('\r\n')
    const url=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}))
    const a=document.createElement('a'); a.href=url; a.download=`finance-${from}-${to}.csv`; a.click(); URL.revokeObjectURL(url)
  }
  return <section className="space-y-5">
    <header><h2 className="text-2xl font-extrabold">Financial reports</h2><p className="mt-2 text-sm text-gray-600">School fee invoices and approved expenses from your Finance database. Platform subscriptions are excluded.</p></header>
    <div className="flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm">From<input className={field} type="date" value={from} onChange={(e)=>setFrom(e.target.value)} /></label><label className="grid gap-1 text-sm">To<input className={field} type="date" value={to} onChange={(e)=>setTo(e.target.value)} /></label><label className="grid gap-1 text-sm">Branch<select className={field} value={branch} onChange={(e)=>setBranch(e.target.value)}><option value="">All accessible branches</option>{(current?.data?.rows ?? []).map((r)=><option key={r.branch_id} value={r.branch_id}>{r.branch_name}</option>)}</select></label><RefreshButton loading={!current} className={field} onClick={()=>setRevision((r)=>r+1)}>Refresh</RefreshButton><button className="rounded-full bg-[#C3D3A4] px-5 py-2 font-bold disabled:opacity-40" disabled={!current || Boolean(current.error) || !rows.length} onClick={download}>Export CSV</button></div>
    {!current ? <p role="status">Loading report…</p> : current.error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">Unable to load report: {current.error}</p> : <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{metrics.map(([key,label])=><article key={key} className="rounded-[24px] bg-white p-5 shadow-sm"><p className="text-sm text-gray-600">{label}</p><p className="mt-2 text-2xl font-extrabold">{money(total(key))}</p></article>)}</div>
      <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Invoice totals use due dates and current status. Payments use recorded payment dates, so they may relate to invoices due in other months. Uploaded proof remains unpaid until approved. Approved expenses use expense dates and do not confirm bank settlement.</p>
      {(total('partial_count')>0 || total('missing_date_count')>0) && <p role="status" className="rounded-xl bg-orange-50 p-4 text-sm">Reconciliation needed: {total('partial_count')} partial invoice(s) in this period are excluded from outstanding because the remaining balance is unknown. {total('missing_date_count')} paid invoice(s) across all dates have no payment date and are excluded from payments recorded.</p>}
      <div className="overflow-x-auto rounded-[24px] bg-white p-5"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Branch</th>{metrics.map(([k,label])=><th className="p-3" key={k}>{label}</th>)}</tr></thead><PaginatedBody>{rows.map((r)=><tr className="border-t border-gray-100" key={r.branch_id}><td className="p-3 font-bold">{r.branch_name}</td>{metrics.map(([k])=><td className="whitespace-nowrap p-3" key={k}>{money(r[k])}</td>)}</tr>)}</PaginatedBody></table>{!rows.length && <p className="py-5 text-center">No accessible branches found.</p>}</div>
      <p className="text-xs text-gray-500">Updated {new Date(current.data.generated_at).toLocaleString('en-MY',{timeZone:'Asia/Kuala_Lumpur'})} (Malaysia time). Current balances are not historical month-end snapshots.</p>
    </>}
  </section>
}
