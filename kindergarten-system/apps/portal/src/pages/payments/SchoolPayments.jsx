import RefreshButton from '../../components/ui/RefreshButton'
import FeeAging from './FeeAging'
import RecurringBilling from './RecurringBilling'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const money = (value) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(value)
const input = 'mt-1 w-full rounded-xl border border-[#DDD] bg-white p-3 text-sm'
const button = 'rounded-full text-[#174B2B] bg-[#C3D3A4] px-4 py-2 text-sm font-bold disabled:opacity-40'

export default function SchoolPayments() {
  const { session, userRole } = useAuth()
  if (!session || ![1,2,4,5].includes(userRole)) return <p className="p-8">Payments are not available for this role.</p>
  return <PaymentWorkspace key={`${session.user.id}-${userRole}`} role={userRole} userId={session.user.id} />
}

function PaymentWorkspace({ role, userId }) {
  const parent = role === 4
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState('')
  const [tab, setTab] = useState('invoices')
  return <div className="pb-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-extrabold">{parent ? 'Payments' : 'School fee payments'}</h2><p className="mt-1 text-sm text-[#888]">{parent ? 'Manage school fees, choose how to pay and keep your receipts in one place.' : 'Issue invoices and verify bank-transfer payments for your branch.'}</p></div><RefreshButton hidden={tab !== 'invoices'} loading={invoiceLoading} type="button" onClick={() => setRefresh((value) => value + 1)} className={button}>Refresh</RefreshButton></div>
    {parent ? <PaymentMethods /> : <div className="mt-5 rounded-2xl bg-[#F2F0DF] p-4 text-sm leading-6 text-[#867230]">Approve only after matching the amount and reference against an actual bank transaction. Uploading proof never marks an invoice paid automatically.</div>}
    {!parent && <div className="mt-5 flex flex-wrap gap-2">{[['invoices','Invoices & verification'],['create','Create invoice'],['aging','Outstanding & aging'],['recurring','Recurring Billing'],...(role===1 ? [['bank','HQ bank account']] : [])].map(([id,label]) => <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-full px-4 py-2 text-sm font-bold ${tab===id ? 'bg-[#174B2B] text-[#FAF4E7]' : 'bg-white'}`}>{label}</button>)}</div>}
    {tab==='invoices' && <><label className="mt-5 block max-w-xs text-xs font-bold text-[#777]">Invoice status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(0) }} className={input}><option value="">All invoices</option><option value="pending">Unpaid</option><option value="paid">Paid</option><option value="partial">Partial (contact finance)</option><option value="void">Void</option></select></label><InvoiceList onLoading={setInvoiceLoading} key={`${page}-${status}-${refresh}`} parent={parent} userId={userId} page={page} status={status} onPage={setPage} onRefresh={() => setRefresh((value) => value+1)} /></>}
    {tab==='create' && <InvoiceCreator onSaved={() => { setTab('invoices'); setPage(0); setRefresh((value)=>value+1) }} />}
    {tab==='recurring' && <RecurringBilling role={role} />}
    {tab==='aging' && <FeeAging key={refresh} />}
    {tab==='bank' && role===1 && <BankAccountEditor />}
    <p className="mt-5 text-xs text-[#999]">School fees are separate from PAPA platform subscriptions. Payment updates and verification results appear in your notifications.</p>
  </div>
}

function InvoiceList({ parent, userId, page, status, onPage, onRefresh, onLoading }) {
  const [loaded, setLoaded] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled=false
    onLoading(true)
    async function load() {
      try {
        let query=supabase.from('payments').select('*',{count:'exact'}).order('due_date',{ascending:false}).order('id',{ascending:false})
        if (status==='pending') query=query.in('status',['pending','overdue'])
        else if(status) query=query.eq('status',status)
        const result=await query.range(page*10,page*10+9)
        if(result.error) throw result.error
        const ids=result.data.map((row)=>row.id)
        const [proofs,accounts,summary]=await Promise.all([
          ids.length ? supabase.from('payment_proofs').select('*').in('payment_id',ids).order('submitted_at',{ascending:false}) : {data:[]},
          supabase.from('hq_payment_account').select('*'),
          supabase.rpc('fee_payment_summary'),
        ])
        if(proofs.error || accounts.error || summary.error) throw proofs.error || accounts.error || summary.error
        if(!cancelled) setLoaded({rows:result.data,total:result.count,proofs:proofs.data,accounts:accounts.data,summary:summary.data})
      } catch { if(!cancelled) setError('Unable to load payments. Ensure migrations through 021_hq_payment_account.sql are installed and your account has access, then refresh.') } finally { if(!cancelled) onLoading(false) }
    }
    load(); return ()=>{cancelled=true}
  },[page,status,onLoading])
  if(error) return <p role="alert" className="mt-5 rounded-2xl bg-white p-6 text-sm text-red-700">{error}</p>
  if(!loaded) return <p role="status" className="py-12 text-center text-sm text-[#888]">Loading invoices…</p>
  return <div className="mt-5 space-y-4"><div className="grid gap-3 sm:grid-cols-3">{[['Unpaid invoice total',money(loaded.summary.unpaid)],['Awaiting verification',loaded.summary.awaiting],['Paid invoices',loaded.summary.paid]].map(([label,value])=><div key={label} className="rounded-2xl bg-white p-5"><p className="text-xs font-bold text-[#888]">{label}</p><p className="mt-2 text-2xl font-extrabold">{value}</p></div>)}</div><p className="text-xs text-[#999]">Totals cover all your accessible invoices. Awaiting-verification invoices remain unpaid until approved.{loaded.summary.partial>0&&` ${loaded.summary.partial} partially paid invoice(s) excluded from unpaid total; contact finance for the remaining balance.`}</p><p className="text-xs text-[#888]">{loaded.total} invoices match this filter</p>{!loaded.rows.length && <div className="rounded-[28px] border border-dashed border-[#DDDCD2] bg-white px-6 py-12 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF8D5] text-2xl text-[#8A7528]">▤</span><h3 className="mt-4 text-lg font-extrabold text-[#174B2B]">{status ? 'No invoices match this filter' : 'No invoices yet'}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#888]">{status ? 'Try All invoices to view your payment history.' : parent ? 'When your school issues an invoice for your child, it will appear here with the amount, due date and payment options.' : 'Create an invoice for a student to start collecting school fees.'}</p>{parent && !status && <p className="mt-3 text-xs text-[#999]">Expecting an invoice? Contact your branch’s admin or finance team.</p>}</div>}{loaded.rows.map((invoice)=><InvoiceCard key={invoice.id} invoice={invoice} parent={parent} userId={userId} proofs={loaded.proofs.filter((proof)=>proof.payment_id===invoice.id)} account={loaded.accounts[0]} onRefresh={onRefresh} />)}<div className={`items-center justify-between ${loaded.total>10 || page>0 ? 'flex' : 'hidden'}`}><button type="button" disabled={page===0} onClick={()=>onPage(page-1)} className={button}>Previous</button><span className="text-xs text-[#888]">Page {page+1}</span><button type="button" disabled={(page+1)*10>=loaded.total} onClick={()=>onPage(page+1)} className={button}>Next</button></div></div>
}

function InvoiceCard({invoice,parent,userId,proofs,account,onRefresh}) {
  const { userRole } = useAuth()
  const [voidReason,setVoidReason] = useState('')
  const [expanded,setExpanded]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [file,setFile]=useState(null)
  const [reference,setReference]=useState('')
  const [reason,setReason]=useState('')
  const [verified,setVerified]=useState(false)
  const pending=proofs.find((proof)=>proof.status==='pending')
  const approved=proofs.find((proof)=>proof.status==='approved')
  const latest=proofs[0]
  const unpaid=['pending','overdue'].includes(invoice.status)
  const overdue=unpaid && invoice.due_date < new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur'}).format(new Date())
  async function run(action) { setBusy(true); setError(''); try { await action() } catch(failure) { setError(failure.message || 'Operation failed. Please retry.') } finally {setBusy(false)} }
  async function upload(event) {
    event.preventDefault()
    if(!file || !['image/jpeg','image/png','application/pdf'].includes(file.type) || file.size>5242880 || file.size===0) {setError('Choose a JPG, PNG or PDF file, up to 5 MB.'); return}
    await run(async()=>{
      const ext={'image/jpeg':'jpg','image/png':'png','application/pdf':'pdf'}[file.type]
      const path=`${userId}/${invoice.id}/${crypto.randomUUID()}.${ext}`
      const uploaded=await supabase.storage.from('payment-proofs').upload(path,file,{contentType:file.type,upsert:false})
      if(uploaded.error) throw uploaded.error
      const result=await supabase.rpc('submit_payment_proof',{target:invoice.id,path,transfer_reference:reference.trim()})
      if(result.error) throw result.error
      onRefresh()
    })
  }
  async function review(approve) {
    await run(async()=>{
      const result=await supabase.rpc('review_payment_proof',{target:pending.id,approve,reason})
      if(result.error) throw result.error
      onRefresh()
    })
  }
  async function viewProof(proof) {
    await run(async()=>{
      const result=await supabase.storage.from('payment-proofs').createSignedUrl(proof.storage_path,60)
      if(result.error) throw result.error
      const link=document.createElement('a'); link.href=result.data.signedUrl; link.target='_blank'; link.rel='noopener noreferrer'; link.click()
    })
  }
  function receipt() {
    const snapshot=approved.receipt_snapshot
    const lines=['PAPA — PAYMENT RECEIPT',approved.receipt_no,`Invoice: ${snapshot.invoice}`,`Branch: ${snapshot.branch || ''}`,`Student: ${snapshot.student || invoice.student_id}`,`Description: ${snapshot.description || ''}`,`Amount: ${money(snapshot.amount)}`,`Bank reference: ${snapshot.reference}`,`Verified: ${snapshot.paid_at}`]
    const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'})); const a=document.createElement('a'); a.href=url; a.download=`${approved.receipt_no}.txt`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  return <article className="rounded-[24px] bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-4"><div><p className="text-xs text-[#888]">{invoice.fee_branch_name || 'School fee'} · {invoice.fee_student_name || `Student #${invoice.student_id}`}</p><h3 className="mt-1 font-extrabold">{invoice.fee_description || invoice.payment_type || 'School fee'}</h3><p className="mt-1 break-all text-xs text-[#999]">{invoice.invoice_no}</p><p className="mt-2 text-xs text-[#777]">Due {invoice.due_date}</p></div><div className="text-right"><p className="text-xl font-extrabold">{money(invoice.amount)}</p><p className={`mt-2 text-xs font-bold ${overdue?'text-red-700':'text-[#888]'}`}>{pending?'Awaiting verification':overdue?'Overdue':invoice.status}</p></div></div><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={()=>setExpanded(!expanded)} className="rounded-full border px-4 py-2 text-sm font-bold">{expanded?'Hide details':parent && unpaid && !pending?'Choose payment method':'View details'}</button>{approved && <button type="button" onClick={receipt} className={button}>Download receipt</button>}</div>
    {expanded && <div className="mt-5 border-t border-[#EEE] pt-5">
      {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
      {parent && unpaid && !pending && <><div className="mb-4 rounded-2xl border border-[#E8E8E1] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-bold text-[#174B2B]">Online payment · FPX</h4><span className="rounded-full bg-[#F2F2EF] px-3 py-1 text-xs text-[#777]">Not activated yet</span></div><p className="mt-2 text-xs leading-5 text-[#888]">Online checkout will be available after merchant activation. You can use manual transfer below once bank details are available.</p><button type="button" disabled className="mt-3 rounded-full bg-[#ECECE7] px-4 py-2 text-xs font-bold text-[#888]">Pay online · coming soon</button></div><h4 className="mb-3 text-sm font-bold text-[#174B2B]">Manual transfer & upload proof</h4>{account?<div className="rounded-2xl bg-[#F2F0DF] p-4 text-sm leading-7"><p className="font-bold">Transfer {money(invoice.amount)} to the HQ collection account:</p><p>{account.bank_name} · {account.account_name}</p><p className="font-mono font-bold">{account.account_number}</p><p>Reference: {invoice.invoice_no}</p></div>:<p className="text-sm text-[#888]">HQ bank details have not been configured. Contact your school before paying.</p>}{latest?.status==='rejected' && <p className="mt-3 text-sm text-red-700">Previous proof rejected: {latest.rejection_reason}</p>}{account && <form onSubmit={upload} className="mt-4 space-y-3"><label className="block text-xs font-bold">Bank transaction reference<input required maxLength={120} value={reference} onChange={(event)=>setReference(event.target.value)} className={input}/></label><label className="block text-xs font-bold">Bank receipt (JPG, PNG or PDF · maximum 5 MB)<input required type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event)=>setFile(event.target.files?.[0] || null)} className={input}/></label><button disabled={busy} className={button}>{busy?'Submitting…':'Submit payment proof'}</button></form>}</>}
      {invoice.status==='void' && invoice.void_reason && <p className="rounded-xl bg-gray-50 p-3 text-sm">Cancelled: {invoice.void_reason}</p>}
      {[1,2].includes(userRole) && unpaid && !pending && !approved && <form className="mt-4 rounded-xl border border-red-200 p-4" onSubmit={(event)=>{event.preventDefault();run(async()=>{const {error}=await supabase.rpc('void_fee_invoice',{target:invoice.id,reason:voidReason});if(error)throw error;onRefresh()})}}><h4 className="font-bold">Cancel incorrect invoice</h4><p className="mt-1 text-xs text-gray-600">This voids the invoice and notifies linked parents. It does not delete the record or refund a payment.</p><label className="mt-3 block text-sm">Reason<input required maxLength={500} value={voidReason} onChange={(event)=>setVoidReason(event.target.value)} className={input}/></label><button disabled={busy||!voidReason.trim()} className="mt-3 rounded-full border border-red-300 px-4 py-2 text-sm text-red-700">Void invoice & notify parents</button></form>}
      {invoice.status==='partial' && <p className="text-sm text-[#888]">Contact branch finance to confirm the remaining balance before paying.</p>}
      {pending && <div className="space-y-3"><p className="text-sm">Proof submitted on {new Date(pending.submitted_at).toLocaleString('en-MY')} · Reference {pending.reference}</p><button type="button" disabled={busy} onClick={()=>viewProof(pending)} className={button}>View private proof</button>{parent?<p className="text-sm text-[#888]">Your branch finance team will verify the bank transaction. You’ll receive an in-app notification after review.</p>:<><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={verified} onChange={(event)=>setVerified(event.target.checked)}/>I matched {money(pending.amount)} and its reference to the actual bank transaction.</label><button type="button" disabled={busy || !verified} onClick={()=>review(true)} className={button}>Confirm payment & issue receipt</button><label className="block text-xs font-bold">Reason if rejecting<input maxLength={500} value={reason} onChange={(event)=>setReason(event.target.value)} className={input}/></label><button type="button" disabled={busy || !reason.trim()} onClick={()=>review(false)} className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-40">Reject proof</button></>}</div>}
      {proofs.length>0 && <details className="mt-4 text-xs text-[#777]"><summary className="cursor-pointer font-bold">Submission history ({proofs.length})</summary>{proofs.map((proof)=><div key={proof.id} className="mt-3 border-t pt-3"><p>{proof.status} · {proof.reference} · {money(proof.amount)}</p>{proof.rejection_reason && <p>{proof.rejection_reason}</p>}<button type="button" disabled={busy} onClick={()=>viewProof(proof)} className="mt-2 underline">View proof</button></div>)}</details>}
    </div>}
  </article>
}

function InvoiceCreator({onSaved}) {
  const [students,setStudents]=useState([])
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  useEffect(()=>{let cancelled=false; supabase.from('students').select('id,name,full_name,branch_id').order('name').then(({data,error})=>{if(!cancelled){if(error)setError('Unable to load students.');else setStudents(data || [])}});return()=>{cancelled=true}},[])
  async function submit(event) {
    event.preventDefault(); const data=new FormData(event.currentTarget); setBusy(true);setError('')
    try { const result=await supabase.rpc('create_fee_invoice',{student:Number(data.get('student')),description:data.get('description'),total:Number(data.get('amount')),due:data.get('due')}); if(result.error)throw result.error;onSaved() } catch(failure){setError(failure.message)}finally{setBusy(false)}
  }
  return <form onSubmit={submit} className="mt-5 max-w-2xl space-y-4 rounded-3xl bg-white p-6"><h3 className="font-extrabold">Create a school fee invoice</h3><p className="text-xs text-[#888]">Linked parents will receive an in-app invoice notification.</p>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}<label className="block text-xs font-bold">Student<select required name="student" className={input}><option value="">Choose a student</option>{students.map((student)=><option key={student.id} value={student.id}>{student.full_name || student.name} · #{student.id}</option>)}</select></label><label className="block text-xs font-bold">Description<input required name="description" maxLength={240} placeholder="September tuition" className={input}/></label><label className="block text-xs font-bold">Amount (RM)<input required name="amount" type="number" min="0.01" step="0.01" className={input}/></label><label className="block text-xs font-bold">Due date<input required name="due" type="date" className={input}/></label><button disabled={busy} className={button}>{busy?'Creating…':'Create invoice'}</button></form>
}

function BankAccountEditor() {
  const [state,setState]=useState(null)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [refresh,setRefresh]=useState(0)
  useEffect(()=>{let active=true;supabase.from('hq_payment_account').select('*').maybeSingle().then(({data,error})=>{if(active)setState({account:data,error:error?.message})}).catch((error)=>{if(active)setState({error:error.message})});return()=>{active=false}},[refresh])
  async function submit(event){
    event.preventDefault();const form=new FormData(event.currentTarget);setBusy(true);setMessage('')
    try{const {data,error}=await supabase.rpc('save_hq_payment_account',{bank:form.get('bank'),holder:form.get('holder'),number:form.get('number'),expected_version:state.account?.version??0});if(error)throw error;setState({account:data});setMessage('HQ bank details saved for all branches.')}
    catch(error){setMessage(error.message)}finally{setBusy(false)}
  }
  return <section className="mt-5 max-w-2xl rounded-3xl bg-white p-6"><h3 className="font-extrabold">HQ collection account</h3><p className="mt-2 text-sm text-[#777]">All branches use this account for school fee transfers. Only superadmin can change these details. Check the bank name, holder and account number before saving.</p><RefreshButton loading={!state} type="button" disabled={busy} className="mt-3 underline" onClick={()=>{setState(null);setRefresh((n)=>n+1)}}>Refresh bank details</RefreshButton>{!state?<p role="status">Loading…</p>:state.error?<p role="alert">{state.error}</p>:<form key={state.account?.version??0} onSubmit={submit} className="mt-4 space-y-4"><label className="block text-sm">Bank name<input required disabled={busy} name="bank" maxLength={100} defaultValue={state.account?.bank_name??''} className={input}/></label><label className="block text-sm">Account holder<input required disabled={busy} name="holder" maxLength={160} defaultValue={state.account?.account_name??''} className={input}/></label><label className="block text-sm">Account number<input required disabled={busy} name="number" minLength={5} maxLength={40} inputMode="numeric" defaultValue={state.account?.account_number??''} className={input}/></label><button className={button} disabled={busy}>{busy?'Saving…':'Save HQ account'}</button></form>}{message&&<p role="status" className="mt-3 text-sm">{message}</p>}</section>
}

function PaymentMethods() {
  return <section aria-label="Payment methods" className="mt-6">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-extrabold text-[#174B2B]">Two ways to pay</h3><p className="text-xs text-[#888]">Select an invoice below to get started</p></div>
    <div className="grid gap-4 md:grid-cols-2">
      <article className="relative overflow-hidden rounded-[24px] bg-[#174B2B] p-6 text-white">
        <div className="flex items-start justify-between gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-xl text-[#FAF4E7]">↗</span><span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-[#FAF4E7]">Awaiting activation</span></div>
        <h4 className="mt-4 text-xl font-extrabold">Pay online</h4><p className="mt-2 text-sm leading-6 text-white/65">Start checkout from your invoice, choose your bank and return here for confirmation and your receipt.</p>
        <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-white/75"><span className="rounded-lg bg-white/10 px-2 py-1">FPX online banking</span><span className="rounded-lg bg-white/10 px-2 py-1">HQ collection account</span><span className="rounded-lg bg-white/10 px-2 py-1">Automatic confirmation</span></div>
        <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-5 text-white/55">This option is being prepared. Online payments are not available yet.</p>
      </article>
      <article className="rounded-[24px] border border-[#E7E3CD] bg-[#FFFDF3] p-6">
        <div className="flex items-start justify-between gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF0AB] text-xl text-[#766218]">↑</span><span className="rounded-full bg-[#FFF0AB] px-3 py-1 text-[11px] font-semibold text-[#766218]">Reviewed by finance</span></div>
        <h4 className="mt-4 text-xl font-extrabold text-[#174B2B]">Manual bank transfer</h4><p className="mt-2 text-sm leading-6 text-[#777]">Use the bank details on your invoice, then upload your transfer receipt for the finance team to verify.</p>
        <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-[#766218]"><span className="rounded-lg bg-[#FFF4C7] px-2 py-1">JPG, PNG or PDF</span><span className="rounded-lg bg-[#FFF4C7] px-2 py-1">Up to 5 MB</span><span className="rounded-lg bg-[#FFF4C7] px-2 py-1">Receipt after approval</span></div>
        <p className="mt-4 border-t border-[#EDE6C8] pt-3 text-xs leading-5 text-[#999]">Available on unpaid invoices once collection bank details are configured.</p>
      </article>
    </div>
  </section>
}
