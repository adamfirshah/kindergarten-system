import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function AccountMenu({ userName, roleLabel, onProfile }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const root = useRef(null)
  const trigger = useRef(null)
  const { signOut } = useAuth()
  useEffect(() => {
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [])
  async function logout() {
    setBusy(true); setError('')
    try {
      const result = await signOut()
      if (result?.error) throw result.error
    } catch { setError('Unable to log out. Please try again.') }
    finally { setBusy(false) }
  }
  return <div className="account-menu" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }} onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); trigger.current.focus() } }}>
    <button className="account-trigger" ref={trigger} type="button" aria-expanded={open} aria-controls="account-dropdown" onClick={() => setOpen(!open)}>
      <span className="account-avatar">{userName.charAt(0).toUpperCase()}</span><span className="account-name"><strong>{userName}</strong><small>{roleLabel}</small></span><span aria-hidden="true">⌄</span><span className="sr-only">Account options</span>
    </button>
    {open && <div id="account-dropdown" className="account-dropdown">
      <button type="button" onClick={() => { onProfile(); setOpen(false) }}>My Profile</button>
      <button type="button" disabled={busy} onClick={logout}>{busy ? 'Logging out…' : 'Logout'}</button>
      {error && <p role="alert">{error}</p>}
    </div>}
  </div>
}
