import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import ParentPortal from './pages/ParentPortal'

// Role IDs — matches public.roles table
const ROLES = {
  superAdmin: 1,
  admin: 2,
  teacher: 3,
  parent: 4,
  accountant: 5,
}

function AppRoutes() {
  const { session, userRole, isLoading, loadingRole } = useAuth()

  if (isLoading || (session && loadingRole)) {
    return (
      <div style={loadingStyle}>
        <p>Loading…</p>
      </div>
    )
  }

  if (!session) return <Login />

  if (userRole === ROLES.superAdmin) return <AdminDashboard />
  if (userRole === ROLES.admin) return <AdminDashboard />
  if (userRole === ROLES.teacher) return <TeacherDashboard />
  if (userRole === ROLES.parent) return <ParentPortal />
  if (userRole === ROLES.accountant) return <AdminDashboard />

  return (
    <div style={loadingStyle}>
      <p>Unknown role. Please contact your administrator.</p>
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

const loadingStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'system-ui, sans-serif',
  color: '#666',
}
