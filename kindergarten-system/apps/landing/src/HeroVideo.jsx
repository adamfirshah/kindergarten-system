import { useEffect, useRef } from 'react'

export function HeroVideo() {
  const video = useRef(null)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const applyPreference = () => {
      if (preference.matches) video.current?.pause()
      else video.current?.play().catch(() => {})
    }
    applyPreference()
    preference.addEventListener('change', applyPreference)
    return () => preference.removeEventListener('change', applyPreference)
  }, [])
  useEffect(() => {
    const scene = video.current.closest('.home-scene')
    const hero = scene.querySelector('.hero')
    const header = scene.querySelector('.header')
    const measure = () => {
      const bottom = hero.getBoundingClientRect().bottom - scene.getBoundingClientRect().top
      scene.style.setProperty('--hero-bottom', `${bottom}px`)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(hero)
    observer.observe(header)
    measure()
    return () => observer.disconnect()
  }, [])
  return <div className="hero-backdrop">
    <video ref={video} className="hero-video" src={`${import.meta.env.BASE_URL}media/hero.mp4`} muted loop playsInline preload="metadata" aria-hidden="true" />
  </div>
}
