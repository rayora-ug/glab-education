'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ShieldX, LogIn, CheckCircle, Clock, AlertTriangle,
  MessageCircle, GraduationCap, Video, CalendarRange,
  ArrowRight, RotateCcw, Quote, ClipboardList,
} from 'lucide-react'
import coursesData from '../../data/courses.json'
import { COURSE_RULES, formatDate, useRegistrationOpen } from '../portal/shared'

type BatchInfo = {
  whatsappLink: string | null
  classroomLink: string | null
  meetLink: string | null
  startDate: string | null
  endDate: string | null
}

type Attendance = { present: number; missed: number; total: number }

type DashboardData = {
  name: string
  glabId: string
  eligibleCourses: string[]
  confirmed: boolean
  registration: { course: string; batchId: string; status: string } | null
  batchInfo?: BatchInfo
  attendance?: Attendance | null
  feedback?: string | null
}

function ClassLinks({ batchInfo }: { batchInfo: BatchInfo }) {
  const links = [
    { href: batchInfo.whatsappLink, label: 'Join WhatsApp Group', icon: MessageCircle },
    { href: batchInfo.classroomLink, label: 'Join Google Classroom', icon: GraduationCap },
    { href: batchInfo.meetLink, label: 'Join Google Meet', icon: Video },
  ].filter(l => l.href)

  if (links.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Your class links will be added shortly.</p>
  }

  return (
    <div className="flex flex-wrap gap-3">
      {links.map(({ href, label, icon: Icon }) => (
        <a key={label} href={href!} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-2 text-sm">
          <Icon size={15} /> {label}
        </a>
      ))}
    </div>
  )
}

function weekProgress(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return null
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  const now = Date.now()
  if (isNaN(start) || isNaN(end) || end <= start) return null
  const totalWeeks = Math.max(1, Math.ceil((end - start) / (7 * 86400000)))
  const elapsedWeeks = Math.min(totalWeeks, Math.max(0, Math.ceil((now - start) / (7 * 86400000))))
  return { current: Math.max(1, elapsedWeeks), total: totalWeeks }
}

export default function MyGlabPage() {
  const registrationOpen = useRegistrationOpen()
  const [glabId, setGlabId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<DashboardData | null>(null)

  const handleLogin = async () => {
    if (!glabId.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/myglab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ glabId }),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error || 'Something went wrong. Please try again.')
      if (!result.found) {
        setError("We couldn't find that GLAB ID. Double-check it and try again.")
        return
      }
      if (result.blocked) {
        setError('Your account access has been restricted. Please contact GLAB for help.')
        return
      }
      setData(result)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setData(null)
    setGlabId('')
    setError('')
  }

  const progress = data?.batchInfo ? weekProgress(data.batchInfo.startDate, data.batchInfo.endDate) : null

  // The CTA only ever suggests the level directly above the one a student
  // is currently enrolled in (A1 → A2, A2 → B1) and only checks whether
  // that level's registration is open — not individual eligibility. This is
  // just a "hey, registration is open" nudge; /portal itself already gates
  // on the student's actual Eligible A2/Eligible B1 flag once they click
  // through, so duplicating that check here would only ever hide the CTA
  // from someone /portal would in fact let register.
  //
  // Also checks the admin panel's global registration switch (registrationOpen
  // above, from useRegistrationOpen) alongside the per-course static flag —
  // the two are separate mechanisms (one build-time in courses.json, one live
  // via Script Property), and the CTA needs to respect both: no point telling
  // a student to go register somewhere the admin has just paused sitewide.
  const NEXT_LEVEL: Record<string, string> = { A1: 'A2', A2: 'B1' }
  const currentCourse = data ? coursesData.find(c => data.registration?.course.startsWith(c.title)) : null
  const nextLevel = currentCourse ? NEXT_LEVEL[currentCourse.level] : null
  const nextLevelCourses = data && nextLevel && registrationOpen
    ? coursesData.filter(c => c.level === nextLevel && c.registrationOpen)
    : []

  return (
    <>
      <section className="section pt-8" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="german-stripe mb-8 rounded-full" />
          <div className="section-label">Your Place at GLAB</div>
          <h1 className="font-display font-black text-5xl md:text-6xl mb-4" style={{ color: 'var(--text-primary)' }}>
            MyGLAB
          </h1>
          <p className="text-xl max-w-2xl" style={{ color: 'var(--text-muted)' }}>
            Log in with your GLAB ID to see your batch, attendance, class links, and more.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-2xl mx-auto">
          {!data && (
            <div className="card p-8 md:p-10">
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Your GLAB ID</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={glabId}
                  onChange={e => setGlabId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="e.g. GLAB26H001"
                  className="input flex-1"
                />
                <button
                  onClick={handleLogin}
                  disabled={loading || !glabId.trim()}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <LogIn size={16} />}
                  Log In
                </button>
              </div>

              {error && (
                <div className="mt-5 rounded-xl p-5 flex items-start gap-3"
                  style={{ background: 'rgba(221,0,0,0.1)', border: '1px solid rgba(221,0,0,0.3)', borderLeft: '4px solid #DD0000' }}>
                  <ShieldX size={22} style={{ color: '#DD0000', flexShrink: 0, marginTop: 2 }} />
                  <p className="text-base font-semibold" style={{ color: '#DD0000' }}>{error}</p>
                </div>
              )}
            </div>
          )}

          {data && !data.confirmed && (
            <div className="card p-10 text-center">
              <Clock size={32} style={{ color: '#B8920A', margin: '0 auto 16px' }} />
              <h2 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>
                Welcome, {data.name}
              </h2>
              <p className="mb-6" style={{ color: 'var(--text-muted)' }}>
                MyGLAB unlocks once your registration is confirmed. Check your registration status on the Registration Portal.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="/portal" className="btn-primary">Check Registration Status</Link>
                <button onClick={resetForm} className="text-sm underline inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <RotateCcw size={13} /> Back to Start
                </button>
              </div>
            </div>
          )}

          {data && data.confirmed && data.registration && (
            <div className="space-y-5">
              <div className="card p-6">
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Welcome back</div>
                <h2 className="font-display font-bold text-2xl mb-1" style={{ color: 'var(--text-primary)' }}>{data.name}</h2>
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{data.glabId}</p>
                <p className="text-sm mb-1">
                  <span style={{ color: 'var(--text-muted)' }}>Enrolled in: </span>
                  <strong style={{ color: 'var(--text-primary)' }}>{data.registration.course}</strong>
                </p>
                {data.batchInfo?.startDate && (
                  <p className="text-sm flex items-center gap-1.5 mt-1" style={{ color: 'var(--text-muted)' }}>
                    <CalendarRange size={14} />
                    {formatDate(data.batchInfo.startDate)}
                    {data.batchInfo.endDate ? ` – ${formatDate(data.batchInfo.endDate)}` : ''}
                    {progress && <span className="ml-2 badge badge-gold">Week {progress.current} of {progress.total}</span>}
                  </p>
                )}
              </div>

              {nextLevelCourses.length > 0 && (
                <div className="card p-6" style={{ background: 'rgba(221,0,0,0.05)', border: '1px solid rgba(221,0,0,0.2)' }}>
                  <div className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Ready for your next level?</div>
                  <div className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Registration is open for <strong style={{ color: '#DD0000' }}>{nextLevelCourses.map(c => c.title).join(' & ')}</strong>.
                  </div>
                  <Link href="/portal" className="btn-primary inline-flex items-center gap-2">
                    Register for {nextLevel} <ArrowRight size={14} />
                  </Link>
                </div>
              )}

              <div className="card p-6">
                <div className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Your Class Links</div>
                {data.batchInfo && <ClassLinks batchInfo={data.batchInfo} />}
              </div>

              <div className="card p-6">
                <div className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Attendance</div>
                {data.attendance && data.attendance.total > 0 ? (
                  <div className="flex items-center gap-6 flex-wrap">
                    <div>
                      <div className="text-3xl font-display font-black" style={{ color: 'var(--text-primary)' }}>
                        {data.attendance.present}<span className="text-lg" style={{ color: 'var(--text-muted)' }}>/{data.attendance.total}</span>
                      </div>
                      <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Classes Attended</div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg"
                      style={{ background: data.attendance.missed >= 5 ? 'rgba(221,0,0,0.1)' : 'rgba(22,163,74,0.1)' }}>
                      <AlertTriangle size={16} style={{ color: data.attendance.missed >= 5 ? '#DD0000' : '#16a34a' }} />
                      <span className="text-sm font-semibold" style={{ color: data.attendance.missed >= 5 ? '#DD0000' : '#16a34a' }}>
                        {data.attendance.missed} missed
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No attendance recorded yet for this batch.</p>
                )}
              </div>

              {data.feedback && (
                <div className="card p-6" style={{ background: 'rgba(255,206,0,0.08)', border: '1px solid rgba(255,206,0,0.3)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Quote size={16} style={{ color: '#B8920A' }} />
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Note from Your Instructor</span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{data.feedback}</p>
                </div>
              )}

              <div className="card p-6">
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList size={16} style={{ color: '#DD0000' }} />
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>GLAB Course Rules</span>
                </div>
                <ol className="text-sm space-y-1.5 pl-5" style={{ color: 'var(--text-muted)', listStyleType: 'decimal' }}>
                  {COURSE_RULES.map((rule, i) => <li key={i}>{rule}</li>)}
                </ol>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-3">
                <Link href="/verify" className="text-sm underline inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <CheckCircle size={13} /> Verify a Certificate
                </Link>
                <button onClick={resetForm} className="text-sm underline inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <RotateCcw size={13} /> Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
