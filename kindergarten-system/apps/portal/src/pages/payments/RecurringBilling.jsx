import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
const field='mt-1 w-full rounded-xl border border-[#DDD] bg-white p-2.5 text-sm text-[#222]'
const btn='rounded-full bg-[#C3D3A4] px-4 py-2 text-sm font-bold text-[#174B2B] disabled:opacity-40'
const money=(n)=>new Intl.NumberFormat('en-MY',{style:'currency',currency:'MYR'}).format(n)

export default function RecurringBilling({role}) {
 const [version,setVersion]=useState(0)
 return <BillingWorkspace key={version} role={role} reload={()=>setVersion(version+1)} />
}
function BillingWorkspace({role,reload}) {
 const [data,setData]=useState(null)
 const [error,setError]=useState('')
 const [busy,setBusy]=useState(false)
 const [rule,setRule]=useState(undefined)
 const [batch,setBatch]=useState(null)
 useEffect(()=>{let cancelled=false;async function load(){try{
 const results=await Promise.all([readAll('recurring_fees'),readAll('billing_batches'),readAll('billing_drafts'),readAll('students','id,name,full_name,branch_id,status'),readAll('branches','id,name')]);
 for(const result of results)if(result.error)throw result.error
 if(!cancelled)setData({rules:results[0].data,batches:results[1].data.sort((a,b)=>b.billing_month.localeCompare(a.billing_month)),drafts:results[2].data,students:results[3].data,branches:results[4].data})
 }catch{if(!cancelled)setError('Unable to load recurring billing. Run migrations 016 and 017 in Supabase and check your branch access.')}}load();return()=>{cancelled=true}},[])
 async function call(name,args){setBusy(true);setError('');try{const result=await supabase.rpc(name,args);if(result.error)throw result.error;reload()}catch(failure){setError(failure.message)}finally{setBusy(false)}}
 if(!data)return <div className="mt-5 rounded-3xl bg-white p-6"><p role="status">{error||'Loading recurring billing…'}</p>{error&&<button onClick={reload} className={btn}>Retry</button>}</div>
 const studentName=(id)=>{const s=data.students.find((s)=>s.id===id);return s?.full_name||s?.name||`Student #${id}`}
 const branchName=(id)=>data.branches.find((b)=>b.id===id)?.name||'Branch'
 return <div className="mt-5 space-y-5">
 <div className="rounded-3xl bg-[#F2F0DF] p-5"><h3 className="text-lg font-extrabold">Recurring Billing</h3><p className="mt-2 text-sm text-[#867230]">25th: draft → accountant review → administrator approval → 27th: publish → 5th next month: payment due.</p><p className="mt-2 text-xs text-[#867230]">Unapproved batches remain private. Late batches need a valid due date before publishing. The daily schedule runs on Supabase after migration 017 is installed.</p></div>
 {error&&<p role="alert" className="rounded-2xl bg-white p-4 text-sm text-red-700">{error}</p>}
 <section className="rounded-3xl bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><h3 className="font-bold">Recurring fee rules</h3><button onClick={()=>setRule(null)} className={btn}>Add recurring fee</button></div><p className="mt-2 text-xs text-[#888]">One rule per student and fee component. Rule changes apply to drafts generated later; existing drafts keep their amounts.</p>
 {data.rules.map((r)=><div key={r.id} className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3"><div><p className="text-sm font-bold">{studentName(r.student_id)} · {r.description}</p><p className="mt-1 text-xs text-[#888]">{branchName(r.branch_id)} · {money(r.amount-r.discount)}/month · {r.start_month.slice(0,7)} to {r.end_month?.slice(0,7)||'ongoing'} · {r.active?'Active':'Paused'}</p></div><button onClick={()=>setRule(r)} className="rounded-full border px-4 py-2 text-xs font-bold">Edit</button></div>)}
 {!data.rules.length&&<p className="py-7 text-center text-sm text-[#888]">Add the recurring fees once. Future monthly drafts will be generated automatically.</p>}
 {rule!==undefined&&<form key={rule?.id||'new'} onSubmit={(event)=>{event.preventDefault();const f=new FormData(event.currentTarget);call('save_recurring_fee',{target:rule?.id||null,student:Number(f.get('student')),label:f.get('label'),total:Number(f.get('amount')),reduction:Number(f.get('discount')),starts:f.get('start')+'-01',ends:f.get('end')?f.get('end')+'-01':null,enabled:f.get('active')==='on'})}} className="mt-5 grid gap-3 rounded-2xl bg-[#F8F8F4] p-4 sm:grid-cols-2">
 <label className="text-xs font-bold">Student<select required name="student" defaultValue={rule?.student_id||''} className={field}>{rule?<option value={rule.student_id}>{studentName(rule.student_id)}</option>:<><option value="">Choose student</option>{data.students.map((s)=><option key={s.id} value={s.id}>{studentName(s.id)} · {branchName(s.branch_id)}</option>)}</>}</select></label>
 <label className="text-xs font-bold">Fee component<input required name="label" maxLength={180} defaultValue={rule?.description||''} placeholder="Tuition / meals / transport" className={field}/></label>
 <label className="text-xs font-bold">Monthly amount (RM)<input required type="number" min="0.01" step="0.01" name="amount" defaultValue={rule?.amount} className={field}/></label>
 <label className="text-xs font-bold">Monthly discount (RM)<input required type="number" min="0" step="0.01" name="discount" defaultValue={rule?.discount||0} className={field}/></label>
 <label className="text-xs font-bold">First billing month<input required type="month" name="start" defaultValue={rule?.start_month?.slice(0,7)} className={field}/></label>
 <label className="text-xs font-bold">Last month (optional)<input type="month" name="end" defaultValue={rule?.end_month?.slice(0,7)} className={field}/></label>
 <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={rule?.active??true}/>Generate future drafts</label><div className="flex gap-2"><button type="button" onClick={()=>setRule(undefined)} className="rounded-full border px-4 py-2 text-sm">Cancel</button><button disabled={busy} className={btn}>Save rule</button></div>
 </form>}</section>
 <section className="rounded-3xl bg-white p-5"><h3 className="font-bold">Monthly billing batches</h3>{!data.batches.length&&<p className="py-8 text-center text-sm text-[#888]">No batches yet. Eligible rules generate drafts from the 25th before their billing month.</p>}
 {data.batches.map((b)=>{const ds=data.drafts.filter((d)=>d.batch_id===b.id);return <div key={b.id} className="mt-4 border-t pt-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-bold">{b.billing_month.slice(0,7)} · {branchName(b.branch_id)}</p><p className="mt-1 text-xs text-[#888]">{b.status} · {ds.filter((d)=>!d.excluded).length} charges · {money(ds.filter((d)=>!d.excluded).reduce((sum,d)=>sum+Number(d.amount),0))} · Due {b.due_date}</p></div><button onClick={()=>setBatch(batch===b.id?null:b.id)} className="rounded-full border px-4 py-2 text-sm font-bold">{batch===b.id?'Close':'Review batch'}</button></div>{b.last_error&&<p className="mt-2 text-xs text-red-700">{b.last_error}</p>}
 {batch===b.id&&<div className="mt-4 space-y-3">{ds.map((d)=><form key={d.id} onSubmit={(event)=>{event.preventDefault();const f=new FormData(event.currentTarget);call('edit_billing_draft',{target:d.id,total:Number(f.get('amount')),skip:f.get('excluded')==='on',explanation:f.get('note')})}} className="rounded-xl bg-[#F8F8F4] p-3"><p className="text-sm font-bold">{studentName(d.student_id)} · {d.description}</p>{data.students.find((s)=>s.id===d.student_id)?.status!=='active'&&<p className="mt-1 text-xs text-red-700">Student is inactive or unavailable. Exclude this charge before review.</p>}{d.note&&<p className="mt-1 text-xs text-[#888]">Adjustment: {d.note}</p>}<fieldset disabled={busy||!['draft','reviewed'].includes(b.status)} className="mt-2 grid gap-2 sm:grid-cols-4"><label className="text-xs">Amount (RM)<input name="amount" type="number" min="0.01" step="0.01" required defaultValue={d.amount} className={field}/></label><label className="text-xs sm:col-span-2">Adjustment / exclusion reason<input name="note" required defaultValue={d.note} className={field}/></label><label className="flex items-center gap-2 text-xs"><input name="excluded" type="checkbox" defaultChecked={d.excluded}/>Exclude this charge</label>{['draft','reviewed'].includes(b.status)&&<button className={btn}>Save adjustment</button>}</fieldset></form>)}
 {['draft','reviewed'].includes(b.status)&&<form onSubmit={(event)=>{event.preventDefault();const f=new FormData(event.currentTarget);call('review_billing_batch',{target:b.id,approve:event.nativeEvent.submitter?.value==='approve',deadline:f.get('due')})}} className="rounded-xl border p-4"><label className="block text-xs font-bold">Payment due date<input required name="due" type="date" defaultValue={b.due_date} className={field}/></label><p className="my-3 text-xs text-[#888]">Confirm amounts, discounts, student status and parent links before marking reviewed. Only included drafts are published.</p><div className="flex flex-wrap gap-2"><button disabled={busy} name="decision" value="review" className={btn}>Mark reviewed</button>{[1,2].includes(role)&&b.status==='reviewed'&&<button disabled={busy} name="decision" value="approve" className={btn}>Approve batch</button>}</div></form>}
 {b.status==='approved'&&<p className="text-xs text-[#888]">Approved. The daily job publishes from the 27th; an administrator can also publish after that date.</p>}
 {[1,2].includes(role)&&b.status==='approved'&&<div className="flex gap-2"><button disabled={busy} onClick={()=>call('publish_approved_billing',{target:b.id})} className={btn}>Publish approved batch</button><button disabled={busy} onClick={()=>call('reopen_billing_batch',{target:b.id})} className="rounded-full border px-4 py-2 text-sm">Return to review</button></div>}
 {b.status==='published'&&<p className="text-sm text-green-700">Published invoices and parent notifications have been created. This batch is locked.</p>}
 </div>}</div>})}</section>
 </div>
}

async function readAll(table,columns='*') {
 const rows=[]
 for(let offset=0;;offset+=500){
 const result=await supabase.from(table).select(columns).order('id').range(offset,offset+499)
 if(result.error)return result
 rows.push(...result.data)
 if(result.data.length<500)return {data:rows}
 }
}
