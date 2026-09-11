import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function PlatformIdentity() {
  const { session, userRole } = useAuth()
  const userId = session?.user?.id
  const [loaded, setLoaded] = useState(null)
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    let request = 0
    async function load() {
      const current = ++request
      try {
        const { data, error } = await supabase.rpc('get_platform_display_settings')
        if (!cancelled && current === request && !error) setLoaded({ userId, settings: data?.[0] ?? null })
      } catch { /* The existing platform stays usable if settings are unavailable. */ }
    }
    load()
    window.addEventListener('platform-settings-saved', load)
    window.addEventListener('focus', load)
    return () => { cancelled = true; window.removeEventListener('platform-settings-saved', load); window.removeEventListener('focus', load) }
  }, [userId, userRole])
  const settings = loaded?.userId === userId ? loaded.settings : null
  if (!settings || (!settings.support_email && !settings.support_phone && !settings.notice_enabled)) return null
  return <div className="mb-4">
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#888]"><span className="flex flex-wrap gap-3">{settings.support_email && <a href={`mailto:${settings.support_email}`} className="underline">Contact support</a>}{settings.support_phone && <span>Support: {settings.support_phone}</span>}</span></div>
    {settings.notice_enabled && <div role="status" className="mt-3 whitespace-pre-wrap break-words rounded-2xl bg-[#FFF5CE] p-4 text-sm leading-6 text-[#78621C]">{settings.notice_message}</div>}
  </div>
}
