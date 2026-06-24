import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [userRole, setUserRole] = useState(null)
  const [loadingRole, setLoadingRole] = useState(false)

  async function fetchUserRole(userId) {
    setLoadingRole(true)
    const { data, error } = await supabase
      .from('users')
      .select('role_id')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching role:', error.message)
      setUserRole(null)
    } else {
      console.log('Fetched user row:', data)
      setUserRole(data.role_id)
    }
    setLoadingRole(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) fetchUserRole(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        fetchUserRole(session.user.id)
      } else {
        setUserRole(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value = {
    session,
    userRole,
    loadingRole,
    isLoading: session === undefined,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
