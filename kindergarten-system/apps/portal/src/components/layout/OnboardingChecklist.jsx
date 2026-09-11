import RefreshButton from '../ui/RefreshButton'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const actions = { branches: 'View branches', finance: 'Open Finance', users: 'Manage users', students: 'View students', classes: 'View classes', parents: 'View profile', children: 'View children' }

export default function OnboardingChecklist({ onNavigate }) {
  const [state, setState] = useState(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    supabase.rpc('onboarding_status').then(({ data, error }) => {
      if (active) setState({ revision, data: data ?? [], error: error?.message })
    }).catch(error => {
      if (active) setState({ revision, error: error.message })
    })
    return () => { active = false }
  }, [revision])
  const loading = !state || state.revision !== revision
  const steps = state?.data ?? []
  const completed = steps.filter(step => step.complete).length
  const allReady = steps.length > 0 && completed === steps.length
  return <section aria-labelledby="setup-title" className="mb-6 shrink-0 rounded-[28px] border border-[#242424] bg-[#174B2B] p-5 shadow-[0_3px_18px_rgba(0,0,0,0.025)] md:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#FAF4E7]">Getting started</p>
        <h2 id="setup-title" className="!text-xl font-extrabold !text-white">{allReady ? 'Your account is ready' : 'Let’s get you set up'}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">{allReady ? 'Your setup checks are complete. You can return here whenever you need to review them.' : 'Review these essentials to start using your account. Some steps need help from your administrator.'}</p>
      </div>
      <RefreshButton loading={loading} type="button" disabled={loading} onClick={() => setRevision(n => n + 1)} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-xs font-bold text-white/80 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B89400] disabled:opacity-50">

        {loading ? 'Checking…' : 'Refresh status'}
      </RefreshButton>
    </div>
    {loading ? <p role="status" className="mt-5 rounded-2xl bg-white/5 p-4 text-sm text-white/60">Checking your account setup…</p> : state.error ? <p role="alert" className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">Unable to check setup: {state.error}</p> : <>
      <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-5">
        <progress aria-label="Account setup progress" max={steps.length || 1} value={completed} className="h-2 w-28 overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-[#363636] [&::-webkit-progress-value]:bg-[#EAC900] [&::-moz-progress-bar]:bg-[#EAC900]" />
        <span className="text-xs font-semibold text-white/60">{completed} of {steps.length} ready</span>
      </div>
      <ol className={`mt-4 grid gap-3 ${steps.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>{steps.map((step, index) => <li key={step.label} className={`flex flex-col rounded-2xl border p-4 ${step.complete ? 'border-[#37583F] bg-[#1D3023]' : 'border-white/10 bg-[#202020]'}`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <span aria-hidden="true" className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${step.complete ? 'bg-[#E0F0E3] text-[#2C7043]' : 'bg-[#FFF3B0] text-[#796716]'}`}>{step.complete ? '✓' : String(index + 1).padStart(2, '0')}</span>
          <span className={`text-[10px] font-semibold ${step.complete ? 'text-[#9CD8AA]' : 'text-white/50'}`}>{step.complete ? 'Ready' : step.help ? 'Needs attention' : 'To complete'}</span>
        </div>
        <h3 className="!text-sm font-bold !text-white">{step.label}</h3>
        <p className="mt-2 flex-1 text-xs leading-5 text-white/60">{step.complete ? 'This requirement is in place.' : step.help || 'Open the module to review and complete this step.'}</p>
        {step.module && <button type="button" onClick={() => onNavigate(step.module)} className="mt-4 inline-flex items-center justify-between gap-3 self-start rounded-full bg-[#C3D3A4] px-4 py-2 text-xs font-semibold !text-[#174B2B] transition hover:bg-[#F0CB00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B89400]">{actions[step.module] || 'View details'}<span aria-hidden="true">→</span></button>}
      </li>)}</ol>
    </>}
  </section>
}
