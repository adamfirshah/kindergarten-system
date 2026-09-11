import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import DashboardPage from './pages/DashboardPage'
import { ROLES } from './constants/roles'

function AppRoutes() {
  const { session, userRole, isLoading, loadingRole, accountStatus, signOut } = useAuth()

  if (isLoading || (session && loadingRole)) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#F0F0EB]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-[#C3D3A4]" />
          <p className="text-sm font-semibold text-[#888]">Loading…</p>
        </div>
      </div>
    )
  }

  if (!session) return <Login />

  if (
    userRole === ROLES.superAdmin ||
    userRole === ROLES.admin ||
    userRole === ROLES.teacher ||
    userRole === ROLES.parent ||
    userRole === ROLES.accountant
  ) {
    return <DashboardPage />
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-[#F0F0EB] px-4">
      <p className="text-center text-sm font-semibold text-[#888]">
        {accountStatus && accountStatus !== 'active' ? 'Your account is disabled. Please contact your administrator.' : 'Unable to verify your account access. Please contact your administrator.'}
        <button type="button" onClick={signOut} className="mt-4 block w-full underline">Sign out</button>
      </p>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
