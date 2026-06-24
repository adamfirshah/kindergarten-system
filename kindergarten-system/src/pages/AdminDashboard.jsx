import { useAuth } from '../context/AuthContext'

export default function AdminDashboard() {
  const { session, signOut } = useAuth()

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <span style={styles.badge}>Admin</span>
        <h1 style={styles.title}>Admin Dashboard</h1>
        <p style={styles.sub}>Full access — manage users, classes, attendance & payments.</p>
        <p style={styles.email}>{session?.user?.email}</p>
        <button style={styles.signout} onClick={signOut}>Sign Out</button>
      </div>
    </div>
  )
}

const styles = {
  wrapper: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' },
  card: { background: '#fff', borderRadius: '16px', padding: '2.5rem 2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: '420px', width: '100%', textAlign: 'center' },
  badge: { background: '#fce7f3', color: '#be185d', padding: '4px 14px', borderRadius: '99px', fontSize: '0.8rem', fontWeight: '700' },
  title: { margin: '1rem 0 0.25rem', fontSize: '1.6rem', fontWeight: '800' },
  sub: { color: '#666', fontSize: '0.95rem', margin: '0 0 1.25rem' },
  email: { fontSize: '0.85rem', color: '#888', marginBottom: '1.5rem' },
  signout: { padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: '600', cursor: 'pointer' },
}
