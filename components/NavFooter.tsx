'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Moon, Sun, Menu, X, GraduationCap,
  Facebook, MessageCircle, Mail, MapPin, Users,
  ArrowRight, Globe, ShieldCheck, LogIn, ChevronDown
} from 'lucide-react'

const LOCKDOWN = process.env.NEXT_PUBLIC_LOCKDOWN_MODE === 'true'

const FACEBOOK_PAGE = 'https://www.facebook.com/share/18sKb3EnVh/?mibextid=wwXIfr'
const FACEBOOK_GROUP = 'https://www.facebook.com/share/g/1DQJXE4QrQ/?mibextid=wwXIfr'
const WHATSAPP_CHANNEL = 'https://wa.me/message/72NY3RBASOPYI1'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/courses', label: 'Courses' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

const resourceLinks = [
  { href: '/books', label: 'Books' },
  { href: '/announcements', label: 'Announcements' },
  { href: '/verify', label: 'Verify Certificate' },
]

function Navbar() {
  const [dark, setDark] = useState(false)
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [mobileResourcesOpen, setMobileResourcesOpen] = useState(false)
  const resourcesRef = useRef<HTMLDivElement>(null)
  const pathnameHook = usePathname()
  const [pathname, setPathname] = useState(pathnameHook || '/')
  const normalize = (p: string) => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p)
  const isActive = (href: string) => normalize(pathname) === normalize(href)
  const isResourceActive = resourceLinks.some(l => isActive(l.href))

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (resourcesRef.current && !resourcesRef.current.contains(e.target as Node)) {
        setResourcesOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    setPathname(window.location.pathname)
    const onNav = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', onNav)
    const origPush = history.pushState.bind(history)
    const origReplace = history.replaceState.bind(history)
    history.pushState = (...args) => { origPush(...args); onNav() }
    history.replaceState = (...args) => { origReplace(...args); onNav() }
    return () => {
      window.removeEventListener('popstate', onNav)
      history.pushState = origPush
      history.replaceState = origReplace
    }
  }, [])

  useEffect(() => {
    if (pathnameHook) setPathname(pathnameHook)
  }, [pathnameHook])

  useEffect(() => {
    const saved = localStorage.getItem('glab-theme')
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDark(true)
      document.documentElement.classList.add('dark')
    }
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('glab-theme', next ? 'dark' : 'light')
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'glass shadow-lg' : 'bg-transparent'}`}
      style={{ borderBottom: scrolled ? '1px solid var(--border)' : 'none' }}>
      <div className="container">
        <nav className="flex items-center justify-between h-16 md:h-18">
          <Link href="/" className="flex items-center gap-3 group" onClick={() => setOpen(false)}>
            <div className="relative w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
              <div className="absolute inset-0" style={{background:'linear-gradient(135deg,#000 33%,#DD0000 33% 66%,#FFCE00 66%)'}} />
              <div className="absolute inset-0 flex items-center justify-center">
                <GraduationCap size={18} color="white" />
              </div>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display font-bold text-lg" style={{color:'var(--text-primary)',lineHeight:1}}>GLAB</span>
              <span className="font-mono hidden sm:block" style={{color:'var(--text-muted)',fontSize:'9px',letterSpacing:'0.1em',marginTop:'2px'}}>GERMAN LANGUAGE ACADEMY OF BANGLADESH</span>
            </div>
          </Link>

          {!LOCKDOWN && (
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.slice(0, 2).map(l => (
                <Link key={l.href} href={l.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive(l.href) ? 'bg-red-50 dark:bg-red-950/30' : 'text-[color:var(--text-secondary)] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-[#DD0000]'}`}
                  style={{
                    color: isActive(l.href) ? '#DD0000' : undefined,
                    fontWeight: isActive(l.href) ? 700 : undefined,
                    borderBottom: isActive(l.href) ? '2px solid #DD0000' : '2px solid transparent',
                  }}>
                  {l.label}
                </Link>
              ))}

              <div className="relative" ref={resourcesRef}>
                <button onClick={() => setResourcesOpen(v => !v)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isResourceActive ? 'bg-red-50 dark:bg-red-950/30' : 'text-[color:var(--text-secondary)] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-[#DD0000]'}`}
                  style={{
                    color: isResourceActive ? '#DD0000' : undefined,
                    fontWeight: isResourceActive ? 700 : undefined,
                    borderBottom: isResourceActive ? '2px solid #DD0000' : '2px solid transparent',
                  }}>
                  Resources <ChevronDown size={14} className={`transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} />
                </button>
                {resourcesOpen && (
                  <div className="absolute top-full left-0 mt-1 py-2 rounded-xl shadow-lg border min-w-[200px]"
                    style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
                    {resourceLinks.map(l => (
                      <Link key={l.href} href={l.href} onClick={() => setResourcesOpen(false)}
                        className={`block px-4 py-2.5 text-sm font-medium transition-colors rounded-lg mx-2 ${isActive(l.href) ? 'bg-red-50 dark:bg-red-950/30' : 'text-[color:var(--text-secondary)] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-[#DD0000]'}`}
                        style={{ color: isActive(l.href) ? '#DD0000' : undefined, fontWeight: isActive(l.href) ? 700 : undefined }}>
                        {l.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {navLinks.slice(2).map(l => (
                <Link key={l.href} href={l.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive(l.href) ? 'bg-red-50 dark:bg-red-950/30' : 'text-[color:var(--text-secondary)] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-[#DD0000]'}`}
                  style={{
                    color: isActive(l.href) ? '#DD0000' : undefined,
                    fontWeight: isActive(l.href) ? 700 : undefined,
                    borderBottom: isActive(l.href) ? '2px solid #DD0000' : '2px solid transparent',
                  }}>
                  {l.label}
                </Link>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button onClick={toggleDark} className="p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5" aria-label="Toggle theme">
              {dark ? <Sun size={18} style={{color:'var(--text-secondary)'}} /> : <Moon size={18} style={{color:'var(--text-secondary)'}} />}
            </button>
            {LOCKDOWN && (
              <Link href="/apply" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border"
                style={{borderColor:'var(--border)', color:'var(--text-secondary)', background:'var(--card-bg)'}}>
                <LogIn size={14} /> <span className="hidden sm:inline">Apply</span>
              </Link>
            )}
            {!LOCKDOWN && (
              <>
                <Link href="/apply" className="hidden md:flex btn-primary text-sm px-4 py-2">
                  Apply Now <ArrowRight size={14} />
                </Link>
                <button onClick={() => setOpen(!open)} className="lg:hidden p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5" aria-label="Menu">
                  {open ? <X size={20} /> : <Menu size={20} />}
                </button>
              </>
            )}
          </div>
        </nav>
      </div>

      {!LOCKDOWN && open && (
        <div className="lg:hidden glass border-t" style={{borderColor:'var(--border)'}}>
          <div className="container py-4 flex flex-col gap-1">
            {navLinks.slice(0, 2).map(l => (
              <Link key={l.href} href={l.href}
                onClick={() => setOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive(l.href) ? 'bg-red-50 dark:bg-red-950/30' : 'text-[color:var(--text-primary)] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-[#DD0000]'}`}
                style={{color: isActive(l.href) ? '#DD0000' : undefined, fontWeight: isActive(l.href) ? 700 : undefined, borderLeft: isActive(l.href) ? '3px solid #DD0000' : '3px solid transparent'}}>
                {l.label}
              </Link>
            ))}

            <button onClick={() => setMobileResourcesOpen(v => !v)}
              className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all ${isResourceActive ? 'bg-red-50 dark:bg-red-950/30' : 'text-[color:var(--text-primary)] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-[#DD0000]'}`}
              style={{color: isResourceActive ? '#DD0000' : undefined, fontWeight: isResourceActive ? 700 : undefined, borderLeft: isResourceActive ? '3px solid #DD0000' : '3px solid transparent'}}>
              Resources <ChevronDown size={14} className={`transition-transform ${mobileResourcesOpen ? 'rotate-180' : ''}`} />
            </button>
            {mobileResourcesOpen && (
              <div className="flex flex-col gap-1 pl-4">
                {resourceLinks.map(l => (
                  <Link key={l.href} href={l.href}
                    onClick={() => { setOpen(false); setMobileResourcesOpen(false) }}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive(l.href) ? 'bg-red-50 dark:bg-red-950/30' : 'text-[color:var(--text-secondary)] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-[#DD0000]'}`}
                    style={{color: isActive(l.href) ? '#DD0000' : undefined, fontWeight: isActive(l.href) ? 700 : undefined}}>
                    {l.label}
                  </Link>
                ))}
              </div>
            )}

            {navLinks.slice(2).map(l => (
              <Link key={l.href} href={l.href}
                onClick={() => setOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive(l.href) ? 'bg-red-50 dark:bg-red-950/30' : 'text-[color:var(--text-primary)] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-[#DD0000]'}`}
                style={{color: isActive(l.href) ? '#DD0000' : undefined, fontWeight: isActive(l.href) ? 700 : undefined, borderLeft: isActive(l.href) ? '3px solid #DD0000' : '3px solid transparent'}}>
                {l.label}
              </Link>
            ))}
            <Link href="/apply" onClick={() => setOpen(false)} className="btn-primary mt-2 text-sm justify-center">
              Apply Now <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

function Footer() {
  return (
    <footer style={{background:'var(--bg-secondary)', borderTop:'1px solid var(--border)'}}>
      <div className="german-stripe" />
      <div className="container py-16">
        {LOCKDOWN ? (
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                <div className="absolute inset-0" style={{background:'linear-gradient(135deg,#000 33%,#DD0000 33% 66%,#FFCE00 66%)'}} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <GraduationCap size={20} color="white" />
                </div>
              </div>
              <div className="text-left">
                <div className="font-display font-bold text-xl" style={{color:'var(--text-primary)'}}>GLAB</div>
                <div className="font-mono" style={{color:'var(--text-muted)',fontSize:'9px',letterSpacing:'0.1em'}}>GERMAN LANGUAGE ACADEMY OF BANGLADESH</div>
              </div>
            </div>
            <div className="flex gap-3 mb-6">
              <a href={FACEBOOK_PAGE} target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-blue-600 bg-blue-600/10 text-blue-600 hover:text-white" aria-label="Facebook Page">
                <Facebook size={16} />
              </a>
              <a href={FACEBOOK_GROUP} target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-blue-600 bg-blue-600/10 text-blue-600 hover:text-white" aria-label="Facebook Group">
                <Users size={16} />
              </a>
              <a href={WHATSAPP_CHANNEL} target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-green-600 bg-green-600/10 text-green-600 hover:text-white" aria-label="WhatsApp Channel">
                <MessageCircle size={16} />
              </a>
            </div>
            <p className="text-xs" style={{color:'var(--text-muted)'}}>
              (c) {new Date().getFullYear()} German Language Academy of Bangladesh (GLAB). All rights reserved.
            </p>
            <div className="flex items-center gap-3 text-xs mt-2" style={{color:'var(--text-muted)'}}>
              <Link href="/apply" className="hover:underline">Apply</Link>
              <Link href="/impressum" className="hover:underline">Impressum</Link>
              <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
              <Link href="/terms" className="hover:underline">Terms</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
              <div className="lg:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                    <div className="absolute inset-0" style={{background:'linear-gradient(135deg,#000 33%,#DD0000 33% 66%,#FFCE00 66%)'}} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <GraduationCap size={20} color="white" />
                    </div>
                  </div>
                  <div>
                    <div className="font-display font-bold text-xl" style={{color:'var(--text-primary)'}}>GLAB</div>
                    <div className="font-mono" style={{color:'var(--text-muted)',fontSize:'9px',letterSpacing:'0.1em'}}>GERMAN LANGUAGE ACADEMY OF BANGLADESH</div>
                  </div>
                </div>
                <p className="text-sm mb-6 leading-relaxed max-w-sm" style={{color:'var(--text-muted)'}}>
                  Helping Bangladeshi students learn German and build their future in Germany through structured online courses and digital learning tools.
                </p>
                <div className="flex gap-3">
                  <a href="https://facebook.com/glab.bd" target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-blue-600 bg-blue-600/10 text-blue-600 hover:text-white">
                    <Facebook size={16} />
                  </a>
                  <a href="https://chat.whatsapp.com/glab" target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-green-600 bg-green-600/10 text-green-600 hover:text-white">
                    <MessageCircle size={16} />
                  </a>
                  <a href="mailto:info@glabeducation.com"
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors" style={{background:'rgba(221,0,0,0.1)',color:'#DD0000'}}>
                    <Mail size={16} />
                  </a>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider" style={{color:'var(--text-primary)'}}>Quick Links</h3>
                <ul className="space-y-2">
                  {[['Courses', '/courses'], ['Apply', '/apply'], ['Announcements', '/announcements'], ['Reviews', '/reviews'], ['Books', '/books'], ['Verify Certificate', '/verify']].map(([l, h]) => (
                    <li key={h}><Link href={h} className="text-sm transition-colors hover:text-red-600" style={{color:'var(--text-muted)'}}>{l}</Link></li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider" style={{color:'var(--text-primary)'}}>Contact</h3>
                <ul className="space-y-3">
                  <li className="flex gap-2 text-sm" style={{color:'var(--text-muted)'}}>
                    <Mail size={14} className="flex-shrink-0 mt-0.5" style={{color:'#DD0000'}} />
                    <span>info@glabeducation.com</span>
                  </li>
                  <li className="flex gap-2 text-sm" style={{color:'var(--text-muted)'}}>
                    <MessageCircle size={14} className="flex-shrink-0 mt-0.5" style={{color:'#16a34a'}} />
                    <span>WhatsApp Community</span>
                  </li>
                  <li className="flex gap-2 text-sm" style={{color:'var(--text-muted)'}}>
                    <Globe size={14} className="flex-shrink-0 mt-0.5" style={{color:'#2563eb'}} />
                    <span>glabeducation.com</span>
                  </li>
                  <li className="flex gap-2 text-sm" style={{color:'var(--text-muted)'}}>
                    <MapPin size={14} className="flex-shrink-0 mt-0.5" style={{color:'#DD0000'}} />
                    <span>Online – Bangladesh</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4" style={{borderTop:'1px solid var(--border)'}}>
              <p className="text-xs text-center md:text-left" style={{color:'var(--text-muted)'}}>
                (c) {new Date().getFullYear()} German Language Academy of Bangladesh (GLAB). All rights reserved.
              </p>
              <div className="flex items-center gap-4 text-xs" style={{color:'var(--text-muted)'}}>
                <Link href="/impressum" className="hover:underline">Impressum</Link>
                <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
                <Link href="/terms" className="hover:underline">Terms</Link>
              </div>
              <div className="flex items-center gap-1 text-xs" style={{color:'var(--text-muted)'}}>
                <span>Made with care for the Bangladesh–Germany bridge</span>
              </div>
            </div>
          </>
        )}
      </div>
    </footer>
  )
}

function NavFooterInner({ children }: { children: React.ReactNode }) {
  const p = usePathname()
  if (p?.startsWith('/exam') || p?.startsWith('/pruefung')) return <>{children}</>
  return (
    <>
      <Navbar />
      <main style={{paddingTop:'64px'}}>
        {children}
      </main>
      <Footer />
    </>
  )
}

export default function NavFooter({ children }: { children: React.ReactNode }) {
  return <NavFooterInner>{children}</NavFooterInner>
}
