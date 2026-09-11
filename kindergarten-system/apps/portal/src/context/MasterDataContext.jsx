import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
const Context = createContext(null)
const tables = ['branches', 'students', 'branch_staff', 'parents', 'classes', 'student_parents', 'student_classes', 'academic_years', 'academic_terms', 'users']
export function MasterDataProvider({ children }) {
  const { session, userRole, userBranchId } = useAuth()
  const scope = `${session?.user?.id}:${userRole}:${userBranchId}`
  const [state, setState] = useState(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const entries = await Promise.allSettled(tables.map(async (table) => {
          const rows = []
          for (let offset = 0; ; offset += 500) {
            const { data, error } = await supabase.from(table).select(table === 'users' ? 'id,full_name,email,role_id,branch_id,status' : '*').order('id').range(offset, offset + 499)
            if (error) throw new Error(`${table}: ${error.message}`)
            rows.push(...data)
            if (data.length < 500) break
          }
          return [table, rows]
        }))
        const successes = entries.filter(entry => entry.status === 'fulfilled').map(entry => entry.value)
        const errors = Object.fromEntries(entries.flatMap((entry,index) => entry.status === 'rejected' ? [[tables[index],entry.reason.message]] : []))
        if (active) setState({ scope, revision, data: Object.fromEntries(successes), errors, error: Object.values(errors).join(' · ') || null })
      } catch (error) { if (active) setState({ scope, revision, error: error.message }) }
    }
    load()
    return () => { active = false }
  }, [scope, revision])
  const current = state?.scope === scope && state?.revision === revision ? state : null
  const refresh = () => setRevision((value) => value + 1)
  async function mutate(name, args) {
    const { data, error } = await supabase.rpc(name, args)
    if (error) throw error
    refresh()
    return data
  }
  return <Context.Provider value={{ data: current?.data ?? {}, loading: !current, error: current?.error, errors: current?.errors ?? {}, refresh, mutate }}>{children}</Context.Provider>
}
// eslint-disable-next-line react-refresh/only-export-components
export function useMasterData() { return useContext(Context) }
