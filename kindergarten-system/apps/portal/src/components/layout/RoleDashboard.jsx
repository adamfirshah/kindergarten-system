import RefreshButton from '../ui/RefreshButton'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useMasterData } from '../../context/MasterDataContext'
import { supabase } from '../../lib/supabase'
import { canAccessModule } from '../../config/permissions'

const roleContent = {
  1: ['Your school, at a glance', 'Keep your branches, people and collections on track.', [['branches','Branches','Manage your locations'],['users','User access','Review roles and assignments'],['finance','Finance','Review invoices and collections'],['audit-logs','Audit logs','Review system changes']]],
  2: ['A clear view of your branch', 'Start with your students, classes and school fees.', [['students','Students','Keep student records current'],['classes','Classes','Manage enrolment and teachers'],['finance','Finance','Review invoices and verification'],['parents','Parent contacts','Review family links']]],
  3: ['Ready for your teaching day', 'Your classes, your students and upcoming homework in one place.', [['classes','My classes','View your assigned classes'],['students','My students','Review your class roster'],['parents','Parent contacts','Find linked family contacts']]],
  4: ['Stay close to their school day', 'Follow your children’s classes and keep school fees up to date.', [['children','My children','View your linked children'],['payments','Payments','View invoices and receipts'],['parents','My profile','Keep contact details up to date']]],
  5: ['Make every payment count', 'Focus on school fees, verification and financial reporting.', [['finance','Finance','Review proofs and outstanding fees'],['reports','Financial reports','View collections and expenses'],['students','Students','Find student records']]],
}
const money = value => new Intl.NumberFormat('en-MY',{style:'currency',currency:'MYR'}).format(value)
export default function RoleDashboard({ onNavigate }) {
  const { userRole } = useAuth()
  const { data, loading, error, errors, refresh } = useMasterData()
  const [extra,setExtra] = useState(null)
  const [revision,setRevision] = useState(0)
  const classes=data.classes??[]
  const classKey=classes.map(c=>c.id).join(',')
  const learning=[3,4].includes(userRole)
  useEffect(()=>{
    let active=true
    async function load(){
      try {
        let result
        if(learning){
          const ids=classKey?classKey.split(','):[]
          if(!ids.length)result={data:[],error:null}
          else result=await supabase.from('assignments').select('id,title,subject,due_date,class_id').in('class_id',ids).eq('status','published').gte('due_date',new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur'}).format(new Date())).order('due_date').order('id').limit(5)
        }else result=await supabase.rpc('fee_payment_summary')
        if(result.error)throw result.error
        if(active)setExtra({key:`${userRole}:${classKey}:${revision}`,data:result.data})
      }catch(e){if(active)setExtra({key:`${userRole}:${classKey}:${revision}`,error:e.message})}
    }
    if(!loading && (!learning || !errors.classes))load()
    return()=>{active=false}
  },[userRole,classKey,learning,loading,error,errors.classes,revision])
  const current=extra?.key===`${userRole}:${classKey}:${revision}`?extra:null
  const [title,description,actions]=roleContent[userRole]??roleContent[3]
  const count=table=>loading||errors[table]?'—':(data[table]??[]).filter(r=>!r.status||r.status==='active').length
  const stats=learning?[[userRole===4?'My children':'My students',count('students')],['Active classes',count('classes')]]:[['Active students',count('students')],['Unpaid school fees',!current||current.error||loading?'—':money(current.data.unpaid)],['Proofs awaiting verification',!current||current.error||loading?'—':current.data.awaiting]]
  return <section className="space-y-6 pb-6 text-[#174B2B]">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold text-[#888]">{new Date().toLocaleDateString('en-MY',{timeZone:'Asia/Kuala_Lumpur',weekday:'long',day:'numeric',month:'long'})}</p><h2 className="mt-2 !text-2xl font-extrabold">{title}</h2><p className="mt-2 text-sm text-[#777]">{description}</p></div><RefreshButton loading={loading || (!current && !(learning && errors.classes))} className="rounded-full border border-[#DDD] bg-white px-4 py-2 text-xs font-bold" onClick={()=>{refresh();setRevision(n=>n+1)}}>Refresh dashboard</RefreshButton></header>
    {(error||current?.error)&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Some dashboard information could not be loaded. Refresh to retry. {error||current.error}</p>}
    <div className={`grid gap-4 sm:grid-cols-2 ${stats.length===3?'lg:grid-cols-3':''}`}>{stats.map(([label,value],i)=><article key={label} className={`rounded-[24px] p-5 ${i===0?'bg-[#C3D3A4]':'border border-[#EAEAE3] bg-white'}`}><p className="text-xs font-semibold text-[#68624C]">{label}</p><p className="mt-3 !text-3xl font-extrabold !text-[#174B2B]">{value}</p><p className="mt-2 text-xs text-[#777]">{loading?'Loading records…':'Within your account access'}</p></article>)}</div>
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]"><section className="rounded-[24px] border border-[#EAEAE3] bg-white p-5"><h3 className="!text-base font-bold">{learning?'Upcoming homework':'What needs your attention'}</h3>{learning?<><p className="mt-2 text-xs leading-5 text-[#888]">Next five published assignments for your accessible classes, from today onwards.</p>{loading||!current?<p role="status" className="py-8 text-sm text-[#888]">{error?'Class information unavailable.':'Loading homework…'}</p>:current.error?<p className="py-8 text-sm text-[#888]">Homework could not be loaded.</p>:!current.data.length?<div className="my-4 rounded-2xl bg-[#F7F7F2] p-5"><p className="text-sm font-semibold">{classes.length?'No upcoming homework':'No classes linked yet'}</p><p className="mt-2 text-xs leading-5 text-[#888]">{classes.length?'Published homework will appear here with its due date.':'Complete the setup steps above to see information for your classes.'}</p></div>:<ul className="mt-4 divide-y divide-[#EEE]">{current.data.map(a=><li key={a.id} className="py-4"><p className="text-sm font-bold">{a.title}</p><p className="mt-1 text-xs text-[#888]">{a.subject} · {classes.find(c=>String(c.id)===String(a.class_id))?.name}</p><p className="mt-2 inline-block rounded-full bg-[#FFF5BE] px-3 py-1 text-xs font-semibold">Due {a.due_date}</p></li>)}</ul>}</>:<div className="mt-4 space-y-3"><p className="text-sm leading-6 text-[#777]">Review payment proofs against the HQ bank transactions, then use Finance to follow up overdue invoices.</p>{current?.data?.partial>0&&<p className="rounded-xl bg-[#FFF5BE] p-3 text-xs">{current.data.partial} partial invoice(s) need a balance check. They are excluded from the unpaid total.</p>}<button className="rounded-full bg-[#174B2B] px-4 py-2 text-xs font-bold !text-white" onClick={()=>onNavigate('finance')}>Open Finance →</button></div>}</section>
    <section className="rounded-[24px] border border-[#EAEAE3] bg-white p-5"><h3 className="!text-base font-bold">Your workspace</h3><div className="mt-3 divide-y divide-[#EEE]">{actions.filter(([id])=>canAccessModule(userRole,id)).map(([id,label,note])=><button key={id} onClick={()=>onNavigate(id)} className="flex w-full items-center justify-between gap-4 py-4 text-left transition hover:opacity-70"><span><span className="block text-sm font-bold">{label}</span><span className="mt-1 block text-xs text-[#888]">{note}</span></span><span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4F4ED]">↗</span></button>)}</div></section></div>
  </section>
}
