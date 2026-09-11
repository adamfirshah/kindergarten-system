import { StrictMode, useState, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import portalLogo from './assets/logo-green.png'
import { HeroVideo } from './HeroVideo.jsx'
import { RevealFooter } from './RevealFooter.jsx'
import { InfoPage } from './InfoPages.jsx'

const translations = {
  "Pengurusan tadika": "Kindergarten management",
  "Navigasi utama": "Main navigation",
  "Ciri-ciri": "Features",
  "Pelan": "Plans",
  "Log masuk ↗": "Log in ↗",
  "Join Us": "Join Us",
  "← Kembali ke laman utama": "← Back to home",
  "MULA BERSAMA KAMI": "GET STARTED",
  "Ruang baharu untuk": "A fresh start for",
  "tadika anda.": "your kindergarten.",
  "Pilih pelan dan lengkapkan maklumat admin untuk menyemak pendaftaran tadika anda.": "Choose a plan and enter your admin details to review your kindergarten registration.",
  "01 Maklumat & pelan": "01 Details & plan",
  "02 Semakan": "02 Review",
  "SEMAKAN PENDAFTARAN": "REGISTRATION REVIEW",
  "Semak sebelum langkah seterusnya.": "Review your details before the next step.",
  "Nama tadika": "Kindergarten name",
  "Nama admin": "Admin name",
  "Email": "Email",
  "Nombor telefon": "Phone number",
  "Maklumat belum dihantar.": "Your details have not been submitted.",
  "Ini ialah pratonton pendaftaran. Pengaktifan akaun, email jemputan dan pembayaran belum tersedia. Tiada bayaran dikenakan dan maklumat ini belum disimpan.": "This is a registration preview. Account activation, invitation emails and payments are not available yet. You have not been charged and your details have not been saved.",
  "Edit maklumat": "Edit details",
  "1. Pilih pelan anda": "1. Choose your plan",
  "/bulan": "/month",
  "2. Maklumat tadika & admin": "2. Kindergarten & admin details",
  "Satu pelan untuk satu cawangan dan satu akaun admin.": "One plan covers one branch and one admin account.",
  "Nama tadika / cawangan": "Kindergarten / branch name",
  "Nama penuh admin": "Admin full name",
  "Email admin": "Admin email",
  "Gunakan email admin yang boleh diakses. Maklumat kekal dalam halaman ini sahaja sehingga anda menutup atau memuat semula halaman.": "Use an email address your admin can access. Your details stay on this page only until you close or reload it.",
  "Semak pendaftaran": "Review registration",
  "PELAN PILIHAN ANDA": "YOUR SELECTED PLAN",
  "1 cawangan tadika": "1 kindergarten branch",
  "1 akaun admin cawangan": "1 branch admin account",
  "Akses ibu bapa untuk murid berdaftar": "Parent access for registered students",
  "Adik-beradik boleh dihubungkan kepada akaun ibu bapa yang sama.": "Siblings can be linked to the same parent account.",
  "Anda boleh menukar pilihan pelan sebelum meneruskan.": "You can change your selected plan before continuing.",
  "PLATFORM UNTUK AKSES AKADEMIK & IBU BAPA.": "PLATFORM FOR ACADEMIC & PARENTAL ACCESS",
  "Urus tadika.": "Manage your school.",
  "Fokus pada ": "Focus on ",
  "si kecil.": "little learners.",
  "Dari rekod murid hingga urusan yuran, satukan kerja harian tadika dalam satu platform yang mudah digunakan.": "From student records to school fees, bring everyday kindergarten tasks together in one easy-to-use platform.",
  "Lihat pelan →": "Explore plans →",
  "Untuk admin, guru dan ibu bapa.": "For admins, teachers and parents.",
  "Satu platform menghubungkan warga tadika": "One platform connecting your kindergarten community",
  "RUANG UNTUK SEMUA": "A SPACE FOR EVERYONE",
  "Tadika": "Your",
  "anda.": "school.",
  "Admin": "Admin",
  "Operasi tersusun": "Organised operations",
  "Guru": "Teachers",
  "Pengajaran terurus": "Teaching made simpler",
  "Ibu bapa": "Parents",
  "Sentiasa terhubung": "Always connected",
  "Satu platform. Satu komuniti.": "One platform. One community.",
  "KEPERLUAN HARIAN ANDA": "YOUR EVERYDAY ESSENTIALS",
  "Kurangkan kerja pentadbiran.": "Spend less time on admin.",
  "Luangkan masa untuk pendidikan.": "Make more time for learning.",
  "PELAN UNTUK TADIKA ANDA": "PLANS FOR YOUR KINDERGARTEN",
  "Mula kecil. Berkembang bersama.": "Start small. Grow together.",
  "Pilih kapasiti yang sesuai. Setiap pelan merangkumi satu cawangan dan satu admin.": "Choose the capacity you need. Every plan includes one branch and one admin.",
  "RUANG UNTUK BERKEMBANG": "ROOM TO GROW",
  "SATU CAWANGAN": "ONE BRANCH",
  "1 akaun admin": "1 admin account",
  "Akses ibu bapa disertakan": "Parent access included",
  "Had murid mengikut konfigurasi pelan. Maksimum 10 guru bagi setiap cawangan.": "Student limits follow the plan configuration. A maximum of 10 teachers per branch.",
  "LANGKAH SETERUSNYA": "YOUR NEXT STEP",
  "Tadika lebih teratur,": "A more organised kindergarten,",
  "bermula di sini.": "starts here.",
  "Pengurusan tadika, dipermudah.": "Kindergarten management, simplified.",
  "100 murid": "100 students",
  "200 murid": "200 students",
  "Murid tanpa had": "Unlimited students",
  "Untuk tadika yang baru bermula.": "For kindergartens getting started.",
  "Lebih ruang untuk tadika berkembang.": "More room for your kindergarten to grow.",
  "Untuk operasi tadika yang lebih besar.": "For larger kindergarten operations.",
  "Rekod yang tersusun": "Organised records",
  "Urus murid, guru dan kelas tanpa perlu bertukar antara banyak fail.": "Manage students, teachers and classes without switching between scattered files.",
  "Urus rutin harian": "Simplify daily routines",
  "Kehadiran, tugasan dan pengumuman dalam satu ruang kerja.": "Attendance, homework and announcements in one workspace.",
  "Dekat dengan ibu bapa": "Keep parents connected",
  "Ibu bapa boleh mengikuti maklumat anak serta menyemak invois dan bayaran.": "Parents can follow their children’s updates and review invoices and payments."
}

const plans = [
  { code: 'basic', name: 'Basic', price: 400, students: '100 murid', teachers: 3, description: 'Untuk tadika yang baru bermula.' },
  { code: 'standard', name: 'Standard', price: 800, students: '200 murid', teachers: 5, description: 'Lebih ruang untuk tadika berkembang.' },
  { code: 'premium', name: 'Premium', price: 1200, students: 'Murid tanpa had', teachers: 10, description: 'Untuk operasi tadika yang lebih besar.' },
]
const features = [
  ['01', 'Rekod yang tersusun', 'Urus murid, guru dan kelas tanpa perlu bertukar antara banyak fail.'],
  ['02', 'Urus rutin harian', 'Kehadiran, tugasan dan pengumuman dalam satu ruang kerja.'],
  ['03', 'Dekat dengan ibu bapa', 'Ibu bapa boleh mengikuti maklumat anak serta menyemak invois dan bayaran.'],
]

export function LandingApp() {
  const sceneRef = useRef(null)
  const [rolesOpen, setRolesOpen] = useState(false)
  const [language, setLanguage] = useState('en')
  const t = text => language === 'en' ? (translations[text] ?? text) : text === 'Join Us' ? 'Daftar' : text
  const teacherCount = count => `${count} ${language === 'en' ? 'teachers' : 'guru'}`
  const teacherAccounts = count => language === 'en' ? `Up to ${count} teacher accounts` : `Sehingga ${count} akaun guru`
  useEffect(() => {
    document.documentElement.lang = language === 'en' ? 'en' : 'ms'
    document.title = language === 'en' ? 'PAPA — Kindergarten Management' : 'PAPA — Pengurusan Tadika'
  }, [language])
  const [route, setRoute] = useState(window.location.hash)
  const [selected, setSelected] = useState('basic')
  const [review, setReview] = useState(false)
  const [details, setDetails] = useState({ kindergarten: '', name: '', email: '', phone: '' })
  useEffect(() => {
    const navigate = () => { setRoute(window.location.hash); if (window.location.hash.startsWith('#/')) window.scrollTo(0, 0) }
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [])
  useEffect(() => {
    let frame
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const progress = Math.min(1, window.scrollY / (window.innerHeight * 0.65))
        sceneRef.current?.style.setProperty('--scroll-progress', progress)
      })
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', update) }
  }, [route])
  const joining = route.startsWith('#/join')
  const infoPage = route.startsWith('#/what-we-do') ? 'roles' : route === '#/faqs' ? 'faq' : null
  const plan = plans.find(item => item.code === selected)
  const join = (code = 'basic') => { setSelected(code); setReview(false); window.location.hash = '/join' }
  const portalUrl = import.meta.env.VITE_PORTAL_URL || 'http://localhost:5174'
  return <><div ref={sceneRef} className={`page-shell ${!joining && !infoPage ? 'home-scene' : 'inner-scene'}`}>
    {!joining && !infoPage && <HeroVideo language={language} />}
    <header className="header">
      <nav className="nav-left" aria-label={language === 'en' ? 'Explore' : 'Terokai'}>
        <a href="#/what-we-do">{language === 'en' ? 'What We Do' : 'Tentang Kami'}</a>
        <div className="roles-dropdown" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setRolesOpen(false) }} onKeyDown={event => { if (event.key === 'Escape') { setRolesOpen(false); event.currentTarget.querySelector('button').focus() } }}>
          <button type="button" aria-expanded={rolesOpen} aria-controls="roles-navigation" onClick={() => setRolesOpen(!rolesOpen)}>{language === 'en' ? 'Who It’s For' : 'Untuk Siapa'} <span aria-hidden="true">⌄</span></button>
          {rolesOpen && <div id="roles-navigation" className="roles-navigation">{[['admin', 'Branch Admin', 'Admin Cawangan'], ['teacher', 'Teacher', 'Guru'], ['finance', 'Finance', 'Kewangan'], ['parents', 'Parents', 'Ibu Bapa'], ['students', 'Students', 'Murid']].map(([id, en, bm]) => <a key={id} href={`#/what-we-do/${id}`} onClick={() => setRolesOpen(false)}>{language === 'en' ? en : bm}<span aria-hidden="true">↗</span></a>)}</div>}
        </div>
      </nav>
      <a className="brand" href="#/" aria-label="PAPA home"><img src={portalLogo} alt="PAPA" /></a>
      <nav className="nav-right" aria-label={t("Navigasi utama")}>
        <a href="#/faqs">{language === 'en' ? 'FAQs' : 'Soalan Lazim'}</a>
        <a href={portalUrl}>{t("Log masuk ↗")}</a>
        <button className="nav-join" onClick={() => join()}>{t("Join Us")}</button>
        <div className="language-switch" role="group" aria-label={language === 'en' ? 'Language' : 'Bahasa'}>
          <button type="button" lang="en" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button>
          <button type="button" lang="ms" aria-pressed={language === 'bm'} onClick={() => setLanguage('bm')}>BM</button>
        </div>
      </nav>
    </header>
    <main>{infoPage ? <InfoPage language={language} page={infoPage} roleId={route.split("/")[2]} onJoin={join} /> : joining ? <section className="registration">
      <a className="back" href="#/">{t("← Kembali ke laman utama")}</a>
      <p className="eyebrow">{t("MULA BERSAMA KAMI")}</p><h1>{t("Ruang baharu untuk")}<br />{t("tadika anda.")}</h1>
      <p className="intro">{t("Pilih pelan dan lengkapkan maklumat admin untuk menyemak pendaftaran tadika anda.")}</p>
      <div className="registration-layout"><div>
        <div className="steps"><span className={!review ? 'current' : ''}>{t("01 Maklumat & pelan")}</span><span className={review ? 'current' : ''}>{t("02 Semakan")}</span></div>
        {review ? <section className="form-card"><p className="eyebrow">{t("SEMAKAN PENDAFTARAN")}</p><h2>{t("Semak sebelum langkah seterusnya.")}</h2>
          <dl>{[[t("Nama tadika"), details.kindergarten], [t("Nama admin"), details.name], [t("Email"), details.email], [t("Nombor telefon"), details.phone], [t("Pelan"), plan.name]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          <div className="notice" role="status"><strong>{t("Maklumat belum dihantar.")}</strong><p>{t("Ini ialah pratonton pendaftaran. Pengaktifan akaun, email jemputan dan pembayaran belum tersedia. Tiada bayaran dikenakan dan maklumat ini belum disimpan.")}</p></div>
          <button className="button" onClick={() => setReview(false)}>{t("Edit maklumat")}</button>
        </section> : <form className="form-card" onSubmit={event => { event.preventDefault(); setReview(true); window.scrollTo(0, 0) }}>
          <fieldset><legend>{t("1. Pilih pelan anda")}</legend><div className="plan-options">{plans.map(item => <label className={`plan-option ${selected === item.code ? 'selected' : ''}`} key={item.code}><input type="radio" name="plan" value={item.code} checked={selected === item.code} onChange={() => setSelected(item.code)} /><span><strong>{item.name}</strong><small>{t(item.students)} · {teacherCount(item.teachers)}</small></span><b>RM{item.price.toLocaleString('en-MY')}<small>{t("/bulan")}</small></b></label>)}</div></fieldset>
          <fieldset><legend>{t("2. Maklumat tadika & admin")}</legend><p className="muted">{t("Satu pelan untuk satu cawangan dan satu akaun admin.")}</p><div className="fields">
            {[['kindergarten', t("Nama tadika / cawangan"), 'text', 'organization'], ['name', t("Nama penuh admin"), 'text', 'name'], ['email', t("Email admin"), 'email', 'email'], ['phone', t("Nombor telefon"), 'tel', 'tel']].map(([key, label, type, autocomplete]) => <label key={key}>{label}<input required maxLength={key === 'phone' ? 30 : 150} type={type} autoComplete={autocomplete} value={details[key]} onChange={event => setDetails({ ...details, [key]: event.target.value })} onBlur={() => setDetails(current => ({ ...current, [key]: current[key].trim() }))} /></label>)}
          </div></fieldset><p className="form-note">{t("Gunakan email admin yang boleh diakses. Maklumat kekal dalam halaman ini sahaja sehingga anda menutup atau memuat semula halaman.")}</p><button className="button" type="submit">{t("Semak pendaftaran")} <span>→</span></button>
        </form>}
      </div><aside className="summary"><p className="eyebrow">{t("PELAN PILIHAN ANDA")}</p><h2>{plan.name}</h2><p className="price">RM{plan.price.toLocaleString('en-MY')}<span>{t("/bulan")}</span></p><ul><li>{t("1 cawangan tadika")}</li><li>{t("1 akaun admin cawangan")}</li><li>{teacherAccounts(plan.teachers)}</li><li>{t(plan.students)}</li><li>{t("Akses ibu bapa untuk murid berdaftar")}</li></ul><p>{t("Adik-beradik boleh dihubungkan kepada akaun ibu bapa yang sama.")}</p><div className="summary-footer">{t("Anda boleh menukar pilihan pelan sebelum meneruskan.")}</div></aside></div>
    </section> : <>
      <section className="hero"><div className="hero-copy"><p className="eyebrow">{t("PLATFORM UNTUK AKSES AKADEMIK & IBU BAPA.")}</p><h1>{t("Urus tadika.")}<br />{t("Fokus pada ")}<em>{t("si kecil.")}</em></h1><p className="intro">{t("Dari rekod murid hingga urusan yuran, satukan kerja harian tadika dalam satu platform yang mudah digunakan.")}</p><div className="actions"><button className="button" onClick={() => join()}>{language === "en" ? "Join Us" : "Daftar"} <span>↗</span></button><a className="secondary" href="#pricing">{t("Lihat pelan →")}</a></div></div>
        <div className="hero-visual" aria-label={t("Satu platform menghubungkan warga tadika")}><div className="orbit orbit-one" /><div className="orbit orbit-two" /><span className="visual-label">{t("RUANG UNTUK SEMUA")}</span><div className="visual-core">{t("Tadika")}<br /><strong>{t("anda.")}</strong></div><div className="person person-admin"><span>▦</span>{t("Admin")}<small>{t("Operasi tersusun")}</small></div><div className="person person-teacher"><span>✎</span>{t("Guru")}<small>{t("Pengajaran terurus")}</small></div><div className="person person-parent"><span>♡</span>{t("Ibu bapa")}<small>{t("Sentiasa terhubung")}</small></div><span className="visual-bottom">{t("Satu platform. Satu komuniti.")}</span></div>
      </section>
      <div className="scroll-panel"><section className="story-intro"><h2>{language === "en" ? "Small learners.\nA whole community behind them." : "Anak didik kecil.\nKomuniti besar di belakang mereka."}</h2><div><p>{language === "en" ? "A great kindergarten day takes a team. Admins organise, teachers guide, and parents stay involved. PAPA brings their everyday tasks together, so everyone has a clearer picture." : "Hari yang baik di tadika memerlukan satu pasukan. Admin menyusun, guru membimbing dan ibu bapa turut serta. PAPA menyatukan urusan harian mereka supaya semua mendapat gambaran yang lebih jelas."}</p><a href="#/what-we-do">{language === "en" ? "What We Do ↗" : "Tentang Kami ↗"}</a></div></section><section id="features" className="features"><div className="section-heading"><p className="eyebrow">{t("KEPERLUAN HARIAN ANDA")}</p><h2>{t("Kurangkan kerja pentadbiran.")}<br />{t("Luangkan masa untuk pendidikan.")}</h2></div><div className="feature-grid">{features.map(([number, title, description]) => <article key={number}><span className="feature-number">{number}</span><h3>{t(title)}</h3><p>{t(description)}</p></article>)}</div></section>
      <section id="pricing" className="pricing"><div className="section-heading"><p className="eyebrow">{t("PELAN UNTUK TADIKA ANDA")}</p><h2>{t("Mula kecil. Berkembang bersama.")}</h2><p>{t("Pilih kapasiti yang sesuai. Setiap pelan merangkumi satu cawangan dan satu admin.")}</p></div><div className="pricing-grid">{plans.map(item => <article className={`pricing-card ${item.code === 'standard' ? 'featured' : ''}`} key={item.code}><p className="plan-kicker">{item.code === 'standard' ? t("RUANG UNTUK BERKEMBANG") : t("SATU CAWANGAN")}</p><h3>{item.name}</h3><p>{t(item.description)}</p><p className="price">RM{item.price.toLocaleString('en-MY')}<span>{t("/bulan")}</span></p><ul><li>{t(item.students)}</li><li>{teacherAccounts(item.teachers)}</li><li>{t("1 akaun admin")}</li><li>{t("Akses ibu bapa disertakan")}</li></ul><button className="button" onClick={() => join(item.code)}>{language === "en" ? "Choose" : "Pilih"} {item.name} <span>→</span></button></article>)}</div><p className="pricing-note">{t("Had murid mengikut konfigurasi pelan. Maksimum 10 guru bagi setiap cawangan.")}</p></section>
      <section className="closing"><div><p className="eyebrow">{t("LANGKAH SETERUSNYA")}</p><h2>{t("Tadika lebih teratur,")}<br />{t("bermula di sini.")}</h2></div><button className="button" onClick={() => join()}>{language === "en" ? "Join Us" : "Daftar"} →</button></section>
    </div></>}</main>
  </div><RevealFooter language={language} portalUrl={portalUrl} /></>

}

createRoot(document.getElementById('root')).render(<StrictMode><LandingApp /></StrictMode>)
