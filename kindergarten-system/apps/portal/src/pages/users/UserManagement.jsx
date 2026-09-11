import RefreshButton from '../../components/ui/RefreshButton'
import PaginatedBody from '../../components/ui/PaginatedBody'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { ROLE_LABELS } from '../../constants/roles'

const field = 'w-full rounded-xl border border-[#DDD] bg-white px-3 py-2 text-[#174B2B] disabled:bg-gray-100'
const button = 'rounded-full bg-[#C3D3A4] px-5 py-2 font-bold text-[#174B2B] disabled:opacity-50'

export default function UserManagement() {
  const { session, userRole, userBranchId } = useAuth()
  const scope = `${session?.user?.id}:${userRole}:${userBranchId}`
  const [result, setResult] = useState(null)
  const [revision, setRevision] = useState(0)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [message, setMessage] = useState('')
  const permitted = userRole === 1 || userRole === 2
  useEffect(() => {
    if (!permitted) return
    let active = true
    async function load() {
      try {
        // Read all visible rows in bounded pages; RLS determines the scope.
        async function readAll(table, columns) {
          const rows = []
          for (let offset = 0; ; offset += 500) {
            const { data, error } = await supabase.from(table).select(columns).order('id').range(offset, offset + 499)
            if (error) throw error
            rows.push(...data)
            if (data.length < 500) return rows
          }
        }
        const [users, branches] = await Promise.all([
          readAll('users', 'id,full_name,email,role_id,branch_id,status'),
          readAll('branches', 'id,name'),
        ])
        if (active) setResult({ scope, revision, users, branches })
      } catch (error) {
        if (active) setResult({ scope, revision, error: error.message })
      }
    }
    load()
    return () => { active = false }
  }, [scope, revision, permitted])

  if (!permitted) return <p>You do not have access to user management.</p>
  const current = result?.scope === scope && result?.revision === revision ? result : null
  const users = current?.users ?? []
  const branches = current?.branches ?? []
  const visible = users.filter((user) => `${user.full_name ?? ''} ${user.email ?? ''}`.toLowerCase().includes(search.toLowerCase()))
  const draft = editing?.scope === scope ? editing : null
  const self = draft?.id === session.user.id

  async function save(event) {
    event.preventDefault()
    if (!draft || saving) return
    setSaving(true)
    setSaveError('')
    try {
      const { error } = await supabase.rpc('update_managed_user', {
        target: draft.id, display_name: draft.full_name,
        new_role: Number(draft.role_id), new_branch: draft.branch_id || null, new_status: draft.status,
      })
      if (error) throw error
      setEditing(null)
      setMessage('User access saved.')
      setRevision((value) => value + 1)
      window.dispatchEvent(new Event('user-access-updated'))
    } catch (error) { setSaveError(error.message) }
    finally { setSaving(false) }
  }

  return <div className="space-y-6 pb-4 text-[#174B2B]">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="text-2xl font-extrabold">User Management</h2>
        <p className="mt-2 text-sm text-[#666]">{userRole === 1 ? 'Manage account roles, branch assignments and access across all branches.' : 'Manage the names and account status of teachers, parents and finance staff in your branch. Contact superadmin for role or branch changes.'}</p></div>
      <RefreshButton loading={!current} className={button} onClick={() => setRevision((value) => value + 1)}>Refresh</RefreshButton>
    </header>
    {message && <p role="status" className="rounded-xl bg-green-50 p-3 text-green-800">{message}</p>}
    <section className="rounded-[28px] bg-white p-6 shadow-sm">
      <label className="block max-w-md text-sm font-semibold">Search users<input type="search" className={`${field} mt-2`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or email" /></label>
      {!current ? <p role="status" className="py-8">Loading users…</p> : current.error ? <p role="alert" className="py-8 text-red-700">Unable to load users: {current.error}</p> : <>
        <p className="my-4 text-sm text-[#666]">{visible.length} users in your accessible branches</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead><tr className="border-b text-[#666]">{['User', 'Role', 'Branch', 'Status', 'Access'].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead>
          <PaginatedBody>{visible.map((user) => <tr key={user.id} className="border-b border-gray-100">
            <td className="p-3"><p className="font-bold">{user.full_name}</p><p className="text-[#666]">{user.email}</p></td>
            <td className="p-3">{ROLE_LABELS[user.role_id] ?? 'Unknown'}</td>
            <td className="p-3">{user.role_id === 1 ? 'All branches' : branches.find((branch) => branch.id === user.branch_id)?.name ?? 'Unassigned'}</td>
            <td className="p-3"><span className={user.status === 'active' ? 'text-green-700' : 'text-red-700'}>{user.status}</span></td>
            <td className="p-3">{userRole === 1 || ([3, 4, 5].includes(user.role_id) && user.branch_id === userBranchId) ? <button className={button} onClick={() => { setEditing({ ...user, scope }); setSaveError(''); setMessage('') }}>Edit</button> : 'View only'}</td>
          </tr>)}</PaginatedBody>
        </table></div>
        {!visible.length && <p className="py-8 text-center text-[#666]">No users found.</p>}
      </>}
    </section>
    {draft && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="edit-user-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white p-6">
      <h3 id="edit-user-title" className="text-xl font-bold">Edit user access</h3>
      <p className="mt-2 text-sm text-[#666]">{draft.email}</p>
      <form onSubmit={save} className="mt-5 space-y-4">
        <label className="block">Full name<input required maxLength={160} disabled={saving} className={field} value={draft.full_name ?? ''} onChange={(event) => setEditing({ ...draft, full_name: event.target.value })} /></label>
        <label className="block">Role<select className={field} disabled={saving || userRole !== 1 || self} value={draft.role_id} onChange={(event) => setEditing({ ...draft, role_id: Number(event.target.value), branch_id: Number(event.target.value) === 1 ? null : draft.branch_id })}>{Object.entries(ROLE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="block">Branch<select className={field} required={[2, 3, 5].includes(draft.role_id)} disabled={saving || userRole !== 1 || self || draft.role_id === 1} value={draft.branch_id ?? ''} onChange={(event) => setEditing({ ...draft, branch_id: event.target.value || null })}><option value="">{draft.role_id === 1 ? 'All branches' : 'Unassigned'}</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <label className="block">Account status<select className={field} disabled={saving || self} value={draft.status} onChange={(event) => setEditing({ ...draft, status: event.target.value })}><option value="active">Active</option><option value="disabled">Disabled</option></select></label>
        {self && <p className="text-sm text-[#666]">Your own role, branch and account status cannot be changed here.</p>}
        {saveError && <p role="alert" className="text-sm text-red-700">Unable to save: {saveError}</p>}
        <div className="flex justify-end gap-3"><button type="button" disabled={saving} className="px-4 py-2" onClick={() => setEditing(null)}>Cancel</button><button className={button} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div>
      </form>
    </section></div>}
  </div>
}
