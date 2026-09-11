import RefreshButton from '../ui/RefreshButton'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { IconBell } from '../icons/DashboardIcons'
export default function PaymentNotifications(){
 const { session }=useAuth()
 return <Inbox key={session?.user?.id} />
}
function Inbox(){
 const [open,setOpen]=useState(false)
 const [page,setPage]=useState(0)
 const [revision,setRevision]=useState(0)
 const [state,setState]=useState(null)
 const [fetching,setFetching]=useState(false)
 const [error,setError]=useState('')
 useEffect(()=>{
  let active=true
  async function load(){setFetching(true);try{const {data,error}=await supabase.rpc('notification_inbox',{page_number:page});if(error)throw error;if(active){setState({page,data});setError('')}}catch(e){if(active){setState(null);setError(e.message)}}finally{if(active)setFetching(false)}}
  load();window.addEventListener('focus',load)
  const timer=setInterval(()=>{if(document.visibilityState==='visible')load()},60000)
  return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',load)}
 },[page,revision,open])
 const current=state?.page===page?state.data:null
 async function read(id){try{const {error}=await supabase.rpc('read_notification',{target:String(id)});if(error)throw error;setRevision(n=>n+1)}catch(e){setError(e.message)}}
 return <div className="relative"><button aria-label={`Notifications${current?`, ${current.unread} unread`:''}`} aria-expanded={open} onClick={()=>setOpen(!open)} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"><IconBell className="h-5 w-5"/>{current?.unread>0&&<span className="absolute -right-1 -top-1 rounded-full bg-[#C3D3A4] px-1.5 text-xs">{current.unread}</span>}</button>{open&&<section aria-label="Notifications" className="absolute right-0 top-12 z-50 max-h-[65vh] w-[min(360px,80vw)] overflow-y-auto rounded-2xl border bg-white p-4 shadow-xl"><div className="flex justify-between"><h3 className="font-bold">Notifications</h3><button aria-label="Close notifications" onClick={()=>setOpen(false)}>×</button></div><RefreshButton loading={fetching} className="my-2 text-xs underline" onClick={()=>setRevision(n=>n+1)}>Refresh</RefreshButton>{error?<p role="alert" className="text-sm text-red-700">{error}</p>:!current?<p role="status">Loading…</p>:<>{!current.total&&<p className="py-5 text-sm">No notifications yet.</p>}{current.rows.map(row=><article key={row.id} className="mt-3 border-t pt-3"><p className="text-sm font-bold">{row.title}</p><p className="mt-1 break-words text-sm text-gray-600">{row.message}</p><p className="mt-1 text-xs text-gray-500">{new Date(row.created_at).toLocaleString('en-MY',{timeZone:'Asia/Kuala_Lumpur'})}</p>{!row.is_read&&<button className="mt-2 text-xs underline" onClick={()=>read(row.id)}>Mark read</button>}</article>)}<div className="mt-4 flex justify-between text-xs"><button disabled={page===0} onClick={()=>setPage(n=>n-1)}>Previous</button><span>Page {page+1}</span><button disabled={(page+1)*10>=current.total} onClick={()=>setPage(n=>n+1)}>Next</button></div></>}</section>}</div>
}
