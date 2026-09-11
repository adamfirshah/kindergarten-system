import { useAuth } from '../context/AuthContext'

export default function MyProfile({ roleLabel }) {
  const { session, accountStatus, userBranchId } = useAuth()
  const user = session?.user
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '—'
  return <main className="min-h-0 flex-1"><h2 className="text-2xl font-bold">My Profile</h2><p className="mt-2 text-sm text-[#888]">Your account details and access information.</p><section className="profile-details"><dl>{[
    ['Name', name], ['Email', user?.email || '—'], ['Role', roleLabel], ['Account status', accountStatus || '—'], ['Branch assignment', userBranchId ? 'Assigned to a branch' : 'No branch assigned'], ['Email verified', user?.email_confirmed_at ? 'Verified' : 'Not verified'],
  ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>Contact your administrator to update your account or branch assignment.</p></section></main>
}
