import { useEffect, useRef } from 'react'
import logo from './assets/logo-white.png'

export function RevealFooter({ language, portalUrl }) {
  const shell = useRef(null)
  const content = useRef(null)
  const en = language === 'en'
  useEffect(() => {
    const measure = () => shell.current?.style.setProperty('--footer-height', `${content.current.offsetHeight}px`)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(content.current)
    return () => observer.disconnect()
  }, [])
  return <div className="footer-reveal" ref={shell}>
    <footer className="reveal-footer" ref={content} onFocusCapture={() => {
      // Reveal keyboard-focused links that would otherwise remain behind the clip.
      const bounds = shell.current.getBoundingClientRect()
      if (bounds.bottom > window.innerHeight) shell.current.scrollIntoView({ block: 'end', behavior: 'instant' })
    }}>
      <div className="footer-top">
        <div><a className="footer-logo" href="#/" aria-label="PAPA home"><img src={logo} alt="PAPA" /></a><h2>{en ? 'Better school days,\ntogether.' : 'Hari persekolahan lebih baik,\nbersama.'}</h2></div>
        <nav aria-label={en ? 'Footer navigation' : 'Navigasi pengaki'}>
          <a href="#/what-we-do">{en ? 'What We Do' : 'Tentang Kami'} ↗</a>
          <a href="#/faqs">{en ? 'FAQs' : 'Soalan Lazim'} ↗</a>
          <a href="#/join">{en ? 'Join Us' : 'Daftar'} ↗</a>
          <a href={portalUrl}>{en ? 'Log in' : 'Log masuk'} ↗</a>
        </nav>
      </div>
      <div className="footer-bottom"><p>{en ? 'Kindergarten management, simplified.' : 'Pengurusan tadika, dipermudah.'}</p><a href="#/" onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}>{en ? 'Back to top' : 'Kembali ke atas'} ↑</a></div>
    </footer>
  </div>
}
