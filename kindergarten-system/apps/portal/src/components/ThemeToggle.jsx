import { useEffect, useState } from 'react'

const preferenceKey = 'papa-color-theme'
function readTheme() {
  try {
    const saved = localStorage.getItem(preferenceKey)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* Use the device preference when storage is unavailable. */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(readTheme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  useEffect(() => {
    const preference = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setTheme(readTheme())
    window.addEventListener('storage', sync)
    preference.addEventListener('change', sync)
    return () => {
      window.removeEventListener('storage', sync)
      preference.removeEventListener('change', sync)
    }
  }, [])
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem(preferenceKey, next) } catch { /* Still switch for this visit. */ }
    setTheme(next)
  }
  return <button type="button" className="theme-toggle" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {theme === 'dark' ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></> : <path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z" />}
    </svg><span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
  </button>
}
