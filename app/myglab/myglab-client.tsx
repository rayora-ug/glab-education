'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ShieldX, LogIn, CheckCircle, AlertTriangle,
  MessageCircle, GraduationCap, Video, CalendarRange,
  ArrowRight, RotateCcw, Quote, ClipboardList, Star, History,
} from 'lucide-react'
import coursesData from '../../data/courses.json'
import { COURSE_RULES, REVIEW_LEVELS, formatDate, useRegistrationOpen } from '../portal/shared'

type BatchInfo = {
  whatsappLink: string | null
  classroomLink: string | null
  meetLink: string | null
  startDate: string | null
  endDate: string | null
}

type Attendance = { present: number; missed: number; total: number }

type HistoryEntry = { course: string; batchId: string; timestamp: string | null }

type DashboardData = {
  name: string
  glabId: string
  eligibleCourses: string[]
  confirmed: boolean
  registration: { course: string; batchId: string; status: string } | null
  batchInfo?: BatchInfo
  attendance?: Attendance | null
  feedback?: string | null
  history?: HistoryEntry[]
  pendingInterestLevels?: string[]
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

type CourseEntry = (typeof coursesData)[number]

// One "next step" opportunity — either repeating the student's current
// level or advancing to the next one. Both behave identically (eligible →
// registration link, already-requested → thank-you, otherwise → batch +
// email form), just parameterized by which level/courses they're about,
// so this is shared between the two rather than duplicated.
function NextStepCard({
  glabId, level, heading, courses, isEligible, isPending,
}: {
  glabId: string
  level: string
  heading: string
  courses: CourseEntry[]
  isEligible: boolean
  isPending: boolean
}) {
  const [batch, setBatch] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const batchOptions = courses.flatMap(c => (c.batches || []).map(b => ({ label: b.label, schedule: b.schedule, level: c.level, fee: c.fee })))

  const submit = async () => {
    if (!batch || !email.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/myglab/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ glabId, level, batch, email }),
      })
      const result = await res.json()
      if (result.success) setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card p-6" style={{ background: 'rgba(221,0,0,0.05)', border: '1px solid rgba(221,0,0,0.2)' }}>
      <div className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{heading}</div>
      <div className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        Registration is open for <strong style={{ color: '#DD0000' }}>{courses.map(c => c.title).join(' & ')}</strong>.
      </div>
      {isEligible ? (
        <Link href="/portal" className="btn-primary inline-flex items-center gap-2">
          Register for {level} <ArrowRight size={14} />
        </Link>
      ) : (submitted || isPending) ? (
        <p className="text-sm flex items-center gap-1.5" style={{ color: '#16a34a' }}>
          <CheckCircle size={14} /> Thanks! We'll let you know once you're eligible to register.
        </p>
      ) : (
        <div className="space-y-3">
          <select value={batch} onChange={e => setBatch(e.target.value)} className="input">
            <option value="" disabled>Which batch would you prefer?</option>
            {batchOptions.map(b => (
              <option key={b.label} value={b.label}>
                {[b.level, b.label, b.schedule, b.fee].filter(Boolean).join(' — ')}
              </option>
            ))}
          </select>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address" className="input" />
          <button
            onClick={submit}
            disabled={submitting || !batch || !email.trim()}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : `I'm Interested in ${level}`} <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

export default function MyGlabPage() {
  const registrationOpen = useRegistrationOpen()
  const [glabId, setGlabId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<DashboardData | null>(null)

  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [reviewLocation, setReviewLocation] = useState('')
  const [reviewLevel, setReviewLevel] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)

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
    setReviewSubmitted(false)
    setReviewText('')
    setReviewLocation('')
    setReviewLevel('')
    setReviewRating(5)
  }

  const submitReview = async () => {
    if (!data || !reviewText.trim() || !reviewLevel) return
    setSubmittingReview(true)
    try {
      const res = await fetch('/api/myglab/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          glabId: data.glabId,
          rating: reviewRating,
          text: reviewText,
          location: reviewLocation,
          level: reviewLevel,
        }),
      })
      const result = await res.json()
      if (result.success) setReviewSubmitted(true)
    } finally {
      setSubmittingReview(false)
    }
  }

  const progress = data?.batchInfo ? weekProgress(data.batchInfo.startDate, data.batchInfo.endDate) : null

  // Two independent "next step" opportunities: repeating the level a
  // student is currently on, or advancing to the one above it (A1 → A2,
  // A2 → B1). Both only check whether that level's registration is open —
  // not individual eligibility, which /portal itself already gates on, so
  // duplicating that check here would only ever hide a real opportunity.
  // Also respects the admin panel's global registration switch
  // (registrationOpen, from useRegistrationOpen) alongside the per-course
  // static flag — the two are separate mechanisms, and neither opportunity
  // should be offered while the admin has paused registration sitewide.
  const NEXT_LEVEL: Record<string, string> = { A1: 'A2', A2: 'B1' }
  const currentCourse = data ? coursesData.find(c => data.registration?.course.startsWith(c.title)) : null
  const nextLevel = currentCourse ? NEXT_LEVEL[currentCourse.level] : null

  // Repeating A1 isn't offered here — unlike A2/B1, A1 was never
  // self-service via /portal in the first place (it's always been the
  // application/Oral-Test path through /results), so there's no
  // registration flow for this request to ever lead into. A repeat-A1
  // request should just come to admin directly, same as any other A1
  // admissions decision.
  const repeatCourses = data && registrationOpen && currentCourse && currentCourse.level !== 'A1'
    ? coursesData.filter(c => c.level === currentCourse.level && c.registrationOpen)
    : []
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
            Log in with your GLAB ID to see your batch, attendance, class links, and share your feedback.
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

          {data && (
            <div className="space-y-5">
              <div className="card p-6">
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Welcome back</div>
                <h2 className="font-display font-bold text-2xl mb-1" style={{ color: 'var(--text-primary)' }}>{data.name}</h2>
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{data.glabId}</p>
                {data.confirmed && data.registration ? (
                  <>
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
                  </>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    You don't have an active course with GLAB right now. <Link href="/portal" className="underline" style={{ color: 'var(--text-primary)' }}>Check Registration Status</Link>
                  </p>
                )}
              </div>

              {data.history && data.history.length > 0 && (
                <div className="card p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <History size={16} style={{ color: '#DD0000' }} />
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Your Course History</span>
                  </div>
                  <ol className="space-y-2">
                    {data.history.map((h, i) => (
                      <li key={h.batchId + h.timestamp} className="text-sm flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <span className="badge badge-gold text-xs" style={{ flexShrink: 0 }}>
                          {i === 0 ? 'Started with' : `Step ${i + 1}`}
                        </span>
                        <strong style={{ color: 'var(--text-primary)' }}>{h.course}</strong>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {data.confirmed && data.registration && repeatCourses.length > 0 && (
                <NextStepCard
                  glabId={data.glabId}
                  level={currentCourse!.level}
                  heading={`Want to repeat ${currentCourse!.level}?`}
                  courses={repeatCourses}
                  isEligible={repeatCourses.some(c => data.eligibleCourses.includes(c.title))}
                  isPending={!!data.pendingInterestLevels?.includes(currentCourse!.level)}
                />
              )}

              {data.confirmed && data.registration && nextLevelCourses.length > 0 && (
                <NextStepCard
                  glabId={data.glabId}
                  level={nextLevel!}
                  heading="Ready for your next level?"
                  courses={nextLevelCourses}
                  isEligible={nextLevelCourses.some(c => data.eligibleCourses.includes(c.title))}
                  isPending={!!data.pendingInterestLevels?.includes(nextLevel!)}
                />
              )}

              {data.confirmed && data.registration && (
                <>
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
                </>
              )}

              <div className="card p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Quote size={16} style={{ color: '#DD0000' }} />
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Share Your Feedback</span>
                </div>
                {reviewSubmitted ? (
                  <p className="text-sm flex items-center gap-1.5" style={{ color: '#16a34a' }}>
                    <CheckCircle size={14} /> Thanks for sharing! It'll appear on our Reviews page once approved.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} type="button" onClick={() => setReviewRating(n)} aria-label={`${n} star${n === 1 ? '' : 's'}`}>
                          <Star size={22} fill={n <= reviewRating ? '#FFCE00' : 'none'} style={{ color: n <= reviewRating ? '#FFCE00' : 'var(--border)' }} />
                        </button>
                      ))}
                    </div>
                    <select value={reviewLevel} onChange={e => setReviewLevel(e.target.value)} className="input">
                      <option value="" disabled>What's this feedback about?</option>
                      {REVIEW_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <textarea
                      value={reviewText}
                      onChange={e => setReviewText(e.target.value)}
                      placeholder="Tell us about your experience at GLAB..."
                      rows={4}
                      className="input"
                      style={{ resize: 'vertical' }}
                    />
                    <input
                      type="text"
                      value={reviewLocation}
                      onChange={e => setReviewLocation(e.target.value)}
                      placeholder="Your city (optional)"
                      className="input"
                    />
                    <button
                      onClick={submitReview}
                      disabled={submittingReview || !reviewText.trim() || !reviewLevel}
                      className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      {submittingReview ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                  </div>
                )}
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
