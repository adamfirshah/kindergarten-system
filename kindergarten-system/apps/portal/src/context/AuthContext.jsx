import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const id = session?.user?.id

  useEffect(() => {
    let active = true
    let eventReceived = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      eventReceived = true
      if (active) {
        setSession(next)
        if (!next) setProfile(null)
        setRefresh((value) => value + 1)
      }
    })
    supabase.auth.getSession().then(({ data, error }) => {
      if (active && !eventReceived) setSession(error ? null : data.session)
    }).catch(() => {
      if (active && !eventReceived) setSession(null)
    })
    const reload = () => setRefresh((value) => value + 1)
    window.addEventListener('focus', reload)
    window.addEventListener('user-access-updated', reload)
    return () => {
      active = false
      subscription.unsubscribe()
      window.removeEventListener('focus', reload)
      window.removeEventListener('user-access-updated', reload)
    }
  }, [])

  useEffect(() => {
    if (!id) return
    let active = true
    async function load() {
      try {
        const { data, error } = await supabase.from('users')
          .select('role_id,branch_id,status').eq('id', id).single()
        if (active) setProfile({ id, data: error ? null : data })
      } catch {
        if (active) setProfile({ id, data: null })
      }
    }
    load()
    return () => { active = false }
  }, [id, refresh])

  // A background refresh keeps forms mounted. A different user never inherits this profile.
  const current = id && profile?.id === id ? profile.data : null
  const value = {
    session,
    userRole: current?.status === 'active' ? current.role_id : null,
    userBranchId: current?.status === 'active' ? current.branch_id : null,
    accountStatus: current?.status ?? null,
    loadingRole: Boolean(id && profile?.id !== id),
    isLoading: session === undefined,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
