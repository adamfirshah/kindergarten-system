import RefreshButton from '../../components/ui/RefreshButton'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useMasterData } from '../../context/MasterDataContext'
const input = 'mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-[#174B2B] disabled:bg-gray-100'
const button = 'rounded-full bg-[#C3D3A4] px-5 py-2 font-bold text-[#174B2B] disabled:opacity-40'
const entities = { branches: ['branches', 'Branches'], students: ['students', 'Students'], children: ['students', 'My Children'], staff: ['branch_staff', 'Staff'], parents: ['parents', 'Parents'], classes: ['classes', 'Classes'] }
export default function MasterDataManagement({ moduleId }) {
  const { userRole, userBranchId } = useAuth()
  const { data, loading, errors, refresh, mutate } = useMasterData()
  const [search, setSearch] = useState('')
  const [selectedPage,setSelectedPage] = useState(0)
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const [notice, setNotice] = useState('')
  const [relationship, setRelationship] = useState(null)
  const [entity, title] = entities[moduleId]
  const error = errors[entity]
  const rows = data[entity] ?? []
  const branches = data.branches ?? []
  const canManage = userRole === 1 || userRole === 2
  const visible = rows.filter((row) => `${row.name ?? row.full_name ?? ''} ${row.email ?? ''}`.toLowerCase().includes(search.toLowerCase()))
  const page = Math.min(selectedPage, Math.max(0, Math.ceil(visible.length / 10) - 1))
  const branchName = (row) => branches.find((b) => b.id === (row.branch_id ?? row.primary_branch_id))?.name ?? 'Unassigned'
  const selfContact = userRole === 4 && entity === 'parents'
  const fields = selfContact ? ['email', 'phone', 'communication_preference'] : entity === 'branches' ? ['name', 'address', 'phone', 'capacity', 'status'] : entity === 'students' ? ['name', 'branch_id', 'age', 'status'] : entity === 'branch_staff' ? ['name', 'branch_id', 'staff_role', 'email', 'phone', 'status', ...(userRole === 1 ? ['user_id'] : [])] : entity === 'parents' ? ['name', 'primary_branch_id', 'email', 'phone', 'communication_preference', 'status', ...(userRole === 1 ? ['user_id'] : [])] : ['name', 'branch_id', 'room', 'capacity', 'schedule', 'academic_year_id', 'teacher_staff_id', 'status']
  const labels = { name: 'Name', branch_id: 'Branch', primary_branch_id: 'Primary branch', staff_role: 'Staff role', academic_year_id: 'Academic year', teacher_staff_id: 'Teacher', communication_preference: 'Preferred contact', user_id: 'Linked portal account', age: 'Age', capacity: 'Capacity' }
  function edit(row) {
    setFailure(''); setNotice('')
    setDraft({ id: row?.id ?? null, ...Object.fromEntries(fields.map((key) => [key, row?.[key] ?? (key === 'status' ? 'active' : key.includes('branch') ? userBranchId ?? '' : key === 'capacity' ? 20 : key === 'age' ? 4 : key === 'staff_role' ? 'teacher' : key === 'communication_preference' ? 'WhatsApp' : '')])) })
  }
  async function submit(event) {
    event.preventDefault()
    setBusy(true); setFailure('')
    try {
      const payload = Object.fromEntries(fields.map((key) => [key, ['age', 'capacity'].includes(key) ? Number(draft[key]) : ['user_id', 'teacher_staff_id'].includes(key) ? draft[key] || null : draft[key]]))
      if (['students', 'branch_staff'].includes(entity)) payload.full_name = payload.name
      if (selfContact) await mutate('save_master_parent_contact', { parent_key: String(draft.id), contact_email: payload.email, contact_phone: payload.phone, preference: payload.communication_preference })
      else await mutate('save_master_record', { entity, record_key: draft.id === null ? null : String(draft.id), payload })
      setDraft(null); setNotice('Record saved.')
    } catch (err) { setFailure(err.message) } finally { setBusy(false) }
  }
  async function link(event) {
    event.preventDefault(); setBusy(true); setFailure('')
    try {
      if (entity === 'parents') await mutate('link_master_child', { parent_key: String(relationship.id), student_key: relationship.student, relation: relationship.relation, primary_contact: relationship.primary })
      else await mutate('enrol_master_student', { class_key: String(relationship.id), student_key: relationship.student })
      setRelationship(null); setNotice('Relationship saved.')
    } catch (err) { setFailure(err.message) } finally { setBusy(false) }
  }
  return <div className="space-y-5 pb-5 text-[#174B2B]">
    <header className="flex flex-wrap justify-between gap-3"><div><h2 className="text-2xl font-extrabold">{title}</h2><p className="mt-2 text-sm text-gray-600">{userRole === 1 ? 'Manage records across your branches.' : 'Records available to your account.'}</p></div><div className="flex items-start gap-2"><RefreshButton loading={loading} className={button} onClick={refresh}>Refresh</RefreshButton>{canManage && (entity !== 'branches' || userRole === 1) && <button disabled={loading || Boolean(error)} className={button} onClick={() => edit(null)}>+ Add {title === 'Classes' ? 'class' : 'record'}</button>}</div></header>
    {Object.entries(errors).filter(([key]) => key !== entity).length > 0 && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Some related records could not be loaded. Linked records and form choices may be unavailable until the database is repaired.</p>}
    {notice && <p role="status" className="rounded-xl bg-green-50 p-3 text-green-800">{notice}</p>}
    <section className="rounded-[28px] bg-white p-6 shadow-sm">
      <label className="block max-w-md text-sm font-bold">Search<input className={input} value={search} onChange={(e) => { setSearch(e.target.value); setSelectedPage(0) }} placeholder="Name or email" /></label>
      {loading ? <p role="status" className="py-8">Loading records…</p> : error ? <p role="alert" className="py-8 text-red-700">Unable to load records: {error}</p> : <div className="mt-5 space-y-3">{visible.slice(page*10,page*10+10).map((row) => <article key={row.id} className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-gray-200 p-4">
        <div><h3 className="font-bold">{row.name ?? row.full_name}</h3><p className="mt-1 text-sm text-gray-600">{entity === 'branches' ? row.address : branchName(row)} · {row.status}</p>
          {row.email && <p className="text-sm text-gray-600">{row.email} {row.phone && `· ${row.phone}`}</p>}
          {entity === 'students' && <p className="mt-2 text-sm">Age {row.age ?? '—'} · {row.class_name || 'No class assigned'}</p>}
          {entity === 'classes' && <p className="mt-2 text-sm">{row.room || 'Room unassigned'} · Capacity {row.capacity} · {row.schedule || 'Schedule unassigned'}</p>}
          {entity === 'parents' && <p className="mt-2 text-sm">Children: {(data.student_parents ?? []).filter((l) => String(l.parent_id) === String(row.id)).map((l) => (data.students ?? []).find((s) => s.id === l.student_id)?.name).filter(Boolean).join(', ') || 'No visible child links'}</p>}
          {entity === 'classes' && <p className="mt-2 text-sm">Students: {(data.student_classes ?? []).filter((l) => l.class_id === row.id && l.status === 'active').map((l) => (data.students ?? []).find((s) => s.id === l.student_id)?.name).filter(Boolean).join(', ') || 'No visible enrolments'}</p>}
        </div>{(canManage || selfContact) && <div className="flex gap-2"><button className={button} onClick={() => edit(row)}>Edit</button>{canManage && ['parents', 'classes'].includes(entity) && <button className={button} onClick={() => { setFailure(''); setRelationship({ id: row.id, branch: row.branch_id ?? row.primary_branch_id, student: '', relation: 'Parent', primary: false }) }}>{entity === 'parents' ? 'Link child' : 'Enrol student'}</button>}</div>}
      </article>)}{!visible.length && <p className="py-8 text-center text-gray-600">No records found.</p>}</div>}
    </section>
    {!loading && !error && visible.length>10 && <nav aria-label="Records pagination" className="flex items-center justify-between text-sm"><span>Page {page+1} of {Math.ceil(visible.length/10)} · {visible.length} records</span><div className="flex gap-3"><button disabled={page===0} onClick={()=>setSelectedPage(page-1)} className={button}>Previous</button><button disabled={(page+1)*10>=visible.length} onClick={()=>setSelectedPage(page+1)} className={button}>Next</button></div></nav>}
    {draft && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><section role="dialog" aria-modal="true" aria-label="Edit record" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white p-6"><h3 className="text-xl font-bold">{draft.id === null ? 'Add' : 'Edit'} record</h3><form onSubmit={submit} className="mt-4 space-y-3">{fields.map((key) => {
      const options = key === 'user_id' ? (data.users ?? []).filter((u) => u.status === 'active' && (entity === 'parents' ? u.role_id === 4 : [2,3,5].includes(u.role_id) && u.branch_id === draft.branch_id)).map((u) => [u.id, `${u.full_name} (${u.email})`]) : key === 'communication_preference' ? [['WhatsApp','WhatsApp'],['Email','Email'],['SMS','SMS']] : key.includes('branch') ? branches.map((b) => [b.id, b.name]) : key === 'status' ? [['active','Active'],['inactive','Inactive']] : key === 'staff_role' ? [['teacher','Teacher'],['branch_admin','Branch admin'],['finance','Finance'],['assistant','Assistant']] : key === 'academic_year_id' ? (data.academic_years ?? []).filter((y) => y.status !== 'closed').map((y) => [y.id,y.name]) : key === 'teacher_staff_id' ? (data.branch_staff ?? []).filter((s) => s.branch_id === draft.branch_id && s.staff_role === 'teacher').map((s) => [s.id,s.name ?? s.full_name]) : null
      return <label key={key} className="block text-sm font-semibold">{labels[key] ?? key.charAt(0).toUpperCase() + key.slice(1)}{options ? <select disabled={busy} className={input} required={!['teacher_staff_id','user_id'].includes(key)} value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}><option value="">Select…</option>{options.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select> : <input className={input} disabled={busy} required={['name','age','capacity'].includes(key)} type={['age','capacity'].includes(key) ? 'number' : key === 'email' ? 'email' : 'text'} min="0" maxLength={200} value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />}</label>
    })}{fields.includes('user_id') && <p className="text-xs text-gray-600">Optional: choose an existing login for this person.</p>}{failure && <p role="alert" className="text-red-700">{failure}</p>}<div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={() => setDraft(null)}>Cancel</button><button disabled={busy} className={button}>{busy ? 'Saving…' : 'Save'}</button></div></form></section></div>}
    {relationship && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form onSubmit={link} role="dialog" aria-modal="true" aria-label="Link student" className="w-full max-w-lg space-y-4 rounded-[28px] bg-white p-6"><h3 className="text-xl font-bold">{entity === 'parents' ? 'Link child' : 'Enrol student'}</h3><label className="block">Student<select required className={input} value={relationship.student} onChange={(e) => setRelationship({ ...relationship, student: e.target.value })}><option value="">Choose student…</option>{(data.students ?? []).filter((s) => s.status === 'active' && (s.branch_id === relationship.branch || (entity === 'parents' && userRole === 1))).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>{entity === 'parents' && <><label className="block">Relationship<input required className={input} value={relationship.relation} onChange={(e) => setRelationship({ ...relationship, relation: e.target.value })} /></label><label className="flex gap-2"><input type="checkbox" checked={relationship.primary} onChange={(e) => setRelationship({ ...relationship, primary: e.target.checked })} />Primary contact</label></>}{failure && <p role="alert" className="text-red-700">{failure}</p>}<div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={() => setRelationship(null)}>Cancel</button><button className={button} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div></form></div>}
  </div>
}
