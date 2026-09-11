import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../constants/roles'
import { supabase } from '../../lib/supabase'
import { settingsForm, validateSettings } from '../../services/systemSettings'

const inputClass = 'mt-2 w-full rounded-2xl border border-[#E1E1E1] bg-white px-4 py-3 text-sm font-normal disabled:bg-[#F4F0E5]'

export default function SystemSettings() {
  const { session, userRole, loadingRole } = useAuth()
  const [reload, setReload] = useState(0)
  if (loadingRole || session === undefined) return <p className="p-8 text-sm text-[#888]">Checking access…</p>
  if (!session || userRole !== ROLES.superAdmin) return <p role="alert" className="rounded-3xl bg-white p-8 text-sm text-[#777]">System Settings is available to superadmin only.</p>
  return <SettingsEditor key={`${session.user.id}-${reload}`} onReload={() => setReload((value) => value + 1)} />
}

function SettingsEditor({ onReload }) {
  const [saved, setSaved] = useState(null)
  const [form, setForm] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState(false)
  const dirty = saved && form && JSON.stringify(settingsForm(saved)) !== JSON.stringify(form)
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data, error: failure } = await supabase.from('system_settings').select('*').eq('id', 1).single()
        if (failure) throw failure
        if (!cancelled) { setSaved(data); setForm(settingsForm(data)) }
      } catch (failure) {
        if (!cancelled) setLoadError(['42P01', 'PGRST205'].includes(failure.code)
          ? 'System Settings is not installed yet. Run migration 014_system_settings.sql after 013_audit_logs.sql in Supabase, then reload.'
          : 'Unable to load settings. Check your connection and superadmin access, then retry.')
      }
    }
    load()
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    if (!dirty) return
    function warn(event) { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  function change(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }))
    setSuccess('')
    setError('')
  }
  async function save(event) {
    event.preventDefault()
    if (saving || !dirty || conflict) return
    const validation = validateSettings(form)
    if (validation) { setError(validation); return }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const { data, error: failure } = await supabase.rpc('save_system_settings', { settings: form, expected_version: saved.version })
      if (failure) throw failure
      const row = Array.isArray(data) ? data[0] : data
      if (!row) throw new Error('Missing saved settings')
      setSaved(row)
      setForm(settingsForm(row))
      setSuccess('Settings saved. The portal display has been updated.')
      window.dispatchEvent(new Event('platform-settings-saved'))
    } catch (failure) {
      if (failure.code === '40001') {
        setConflict(true)
        setError('Another administrator has changed these settings. Reload the latest version before making your changes again.')
      } else setError('Settings could not be saved. Check your connection, migration and superadmin access, then try again. Your edits are still here.')
    } finally { setSaving(false) }
  }
  return <div className="pb-4">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-extrabold text-[#174B2B]">System Settings</h2><p className="mt-1 text-sm text-[#888]">Manage the platform identity, support contacts and notices across all branches.</p></div><span className="rounded-full bg-[#174B2B] px-4 py-2 text-xs font-bold text-[#FAF4E7]">Superadmin only</span></div>
    {loadError ? <div role="alert" className="mt-6 rounded-3xl bg-white p-6"><p className="text-sm text-[#A33]">{loadError}</p><button type="button" onClick={onReload} className="mt-4 rounded-full bg-[#C3D3A4] px-5 py-2 text-sm font-bold">Reload settings</button></div> : !form ? <p role="status" className="py-12 text-center text-sm text-[#888]">Loading platform settings…</p> : <form onSubmit={save} className="mt-6">
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <fieldset disabled={saving} className="min-w-0 space-y-5">
          <SettingsSection number="01" title="Platform profile" description="Displayed at the top of the signed-in portal for all roles.">
            <label className="block text-sm font-bold text-[#555]">Platform name<input required maxLength={80} value={form.platform_name} onChange={(event) => change('platform_name', event.target.value)} className={inputClass} /></label>
            <label className="mt-4 block text-sm font-bold text-[#555]">Organisation name <span className="font-normal text-[#999]">(optional)</span><input maxLength={160} value={form.organisation_name} onChange={(event) => change('organisation_name', event.target.value)} className={inputClass} placeholder="Organisation operating this platform" /></label>
          </SettingsSection>
          <SettingsSection number="02" title="Support contacts" description="Give branch staff and parents a way to reach your platform support team. Leave blank to hide a contact.">
            <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold text-[#555]">Support email<input type="email" value={form.support_email} onChange={(event) => change('support_email', event.target.value)} className={inputClass} placeholder="support@example.com" /></label><label className="block text-sm font-bold text-[#555]">Support phone<input type="tel" maxLength={40} value={form.support_phone} onChange={(event) => change('support_phone', event.target.value)} className={inputClass} placeholder="+60 …" /></label></div>
          </SettingsSection>
          <SettingsSection number="03" title="Platform notice" description="Publish a short message across all branches, such as a scheduled maintenance announcement. This does not block access to the platform.">
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-[#F7F7F4] p-4"><span><span className="block text-sm font-bold">Show notice in the portal</span><span className="mt-1 block text-xs text-[#888]">Visible to every signed-in role after saving.</span></span><input type="checkbox" checked={form.notice_enabled} onChange={(event) => change('notice_enabled', event.target.checked)} className="h-5 w-5 shrink-0 accent-[#174B2B]" /></label>
            <label className="mt-4 block text-sm font-bold text-[#555]">Notice message<textarea rows={4} required={form.notice_enabled} maxLength={500} value={form.notice_message} onChange={(event) => change('notice_message', event.target.value)} className={`${inputClass} resize-y`} placeholder="Enter a message for your users…" /></label><p className="mt-1 text-right text-xs text-[#999]">{form.notice_message.length}/500</p>
            {form.notice_enabled && form.notice_message.trim() && <div className="mt-3"><p className="mb-2 text-xs font-bold text-[#888]">Preview · not published until saved</p><div className="whitespace-pre-wrap break-words rounded-2xl bg-[#FFF5CE] p-4 text-sm leading-6 text-[#78621C]">{form.notice_message}</div></div>}
          </SettingsSection>
        </fieldset>
        <aside className="space-y-4">
          <div className="rounded-[24px] bg-[#F2F0DF] p-5"><h3 className="text-sm font-extrabold">Applies to every branch</h3><p className="mt-2 text-xs leading-6 text-[#48634B]">Only superadmins can change these settings. Branch admins, teachers, parents and finance users can see the published platform details.</p><p className="mt-3 text-xs leading-6 text-[#48634B]">Saved changes are recorded in Audit Logs. Existing invoices and branch subscriptions are unaffected.</p></div>
          <div className="rounded-[24px] bg-white p-5"><h3 className="text-sm font-extrabold">System information</h3><dl className="mt-4 space-y-3 text-xs"><div><dt className="text-[#999]">Timezone</dt><dd className="mt-1 font-semibold">Asia/Kuala_Lumpur (UTC+8)</dd></div><div><dt className="text-[#999]">Currency</dt><dd className="mt-1 font-semibold">MYR · Malaysian Ringgit</dd></div><div><dt className="text-[#999]">Access control</dt><dd className="mt-1 font-semibold">Role and branch permissions</dd></div><div><dt className="text-[#999]">Settings version</dt><dd className="mt-1 font-semibold">{saved.version}</dd></div></dl><p className="mt-4 text-xs leading-5 text-[#999]">Regional settings and permissions are managed by the application.</p></div>
        </aside>
      </div>
      <div className="sticky bottom-0 mt-5 rounded-[22px] border border-[#EEEDE8] bg-white p-4 shadow-sm">
        {error && <p role="alert" className="mb-3 text-sm text-[#B63838]">{error}</p>}{success && <p role="status" className="mb-3 text-sm text-[#267A48]">{success}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#888]">{dirty ? 'You have unsaved changes' : `Last saved: ${new Intl.DateTimeFormat('en-MY', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(saved.updated_at))} MYT`}</p><div className="flex gap-2">{conflict ? <button type="button" disabled={saving} onClick={() => { if (window.confirm('Reload the latest settings? Your unsaved edits will be discarded.')) onReload() }} className="rounded-full border border-[#DDD] px-5 py-2.5 text-sm font-bold">Reload latest</button> : <button type="button" disabled={!dirty || saving} onClick={() => { setForm(settingsForm(saved)); setError(''); setSuccess('') }} className="rounded-full border border-[#DDD] px-5 py-2.5 text-sm font-bold disabled:opacity-40">Discard changes</button>}<button type="submit" disabled={!dirty || saving || conflict} className="rounded-full bg-[#C3D3A4] px-5 py-2.5 text-sm font-bold disabled:opacity-40">{saving ? 'Saving…' : 'Save settings'}</button></div></div>
      </div>
    </form>}
  </div>
}

function SettingsSection({ number, title, description, children }) {
  return <section className="rounded-[26px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]"><div className="mb-5 flex items-start gap-3"><span className="rounded-xl bg-[#F4F0E5] px-3 py-2 text-xs font-bold text-[#888]">{number}</span><div><h3 className="font-extrabold">{title}</h3><p className="mt-1 text-xs leading-5 text-[#888]">{description}</p></div></div>{children}</section>
}
