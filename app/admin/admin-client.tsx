'use client'

import { useEffect, useState } from 'react'
import {
  Lock, ShieldX, Search, Ban, CheckCircle, Power,
  ExternalLink, RefreshCw, LogOut, Loader2, Star, PlusCircle,
  UserPlus, XCircle, Settings,
} from 'lucide-react'
import { REVIEW_LEVELS } from '../portal/shared'
import coursesData from '../../data/courses.json'

const a1Batches = (coursesData as any[])
  .filter(c => c.level === 'A1' && c.registrationOpen)
  .flatMap((c: any) => (c.batches || []).map((b: any) => ({
    id: b.id, label: `${c.title} — ${b.label}`,
  })))

type Student = {
  found: boolean
  glabId?: string
  name?: string
  eligibleCourses?: string[]
  blocked?: boolean
  registration?: { course: string; batchId: string; status: string } | null
}

type PendingRegistration = {
  timestamp: string
  glabId: string
  name: string
  course: string
  batchId: string
  paymentMethod: string
  paymentReference: string
  proofFileLink: string
  feedback: string
}

type InterestRequest = {
  timestamp: string
  glabId: string
  name: string
  level: string
  requestedBatch: string
  currentBatch: string
  email: string
}

type Application = {
  name: string
  email: string
  dob: string
  phone: string
  status: 'pending' | 'selected' | 'not_selected'
  glabId: string
  confirmedBatch: string
  timestamp: string | null
}

type PendingReview = {
  row: number
  name: string
  location: string
  rating: number | null
  date: string
  course: string
  text: string
}

export default function AdminPage() {
  const [checkingSession, setCheckingSession] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null)
  const [togglingRegistration, setTogglingRegistration] = useState(false)

  const [glabIdQuery, setGlabIdQuery] = useState('')
  const [studentResult, setStudentResult] = useState<Student | null>(null)
  const [studentError, setStudentError] = useState('')
  const [searchingStudent, setSearchingStudent] = useState(false)
  const [togglingBlock, setTogglingBlock] = useState(false)

  const [pending, setPending] = useState<PendingRegistration[] | null>(null)
  const [pendingError, setPendingError] = useState('')
  const [loadingPending, setLoadingPending] = useState(false)
  const [confirmingKey, setConfirmingKey] = useState('')

  const [reviewName, setReviewName] = useState('')
  const [reviewLocation, setReviewLocation] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewDate, setReviewDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [reviewLevel, setReviewLevel] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [reviewOutcome, setReviewOutcome] = useState('')
  const [reviewFeatured, setReviewFeatured] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')

  const [interest, setInterest] = useState<InterestRequest[] | null>(null)
  const [interestError, setInterestError] = useState('')
  const [loadingInterest, setLoadingInterest] = useState(false)
  const [approvingKey, setApprovingKey] = useState('')

  const [applications, setApplications] = useState<Application[] | null>(null)
  const [applicationsError, setApplicationsError] = useState('')
  const [loadingApplications, setLoadingApplications] = useState(false)
  const [applicationBatch, setApplicationBatch] = useState<Record<string, string>>({})
  const [applicationActionKey, setApplicationActionKey] = useState('')
  const [showDecidedApplications, setShowDecidedApplications] = useState(false)

  const [idPrefix, setIdPrefix] = useState('')
  const [idPrefixInput, setIdPrefixInput] = useState('')
  const [savingIdPrefix, setSavingIdPrefix] = useState(false)

  const [pendingReviews, setPendingReviews] = useState<PendingReview[] | null>(null)
  const [pendingReviewsError, setPendingReviewsError] = useState('')
  const [loadingPendingReviews, setLoadingPendingReviews] = useState(false)
  const [approvingReviewRow, setApprovingReviewRow] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/admin/session').then(r => r.json()).then(d => {
      setAuthenticated(!!d.authenticated)
      setCheckingSession(false)
    })
  }, [])

  useEffect(() => {
    if (!authenticated) return
    fetch('/api/registration-status').then(r => r.json()).then(d => {
      if (d.success) setRegistrationOpen(d.open)
    })
    loadPending()
    loadInterest()
    loadPendingReviews()
    loadApplications()
    loadIdPrefix()
  }, [authenticated])

  const handleLogin = async () => {
    if (!password) return
    setLoggingIn(true)
    setLoginError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Login failed.')
      setAuthenticated(true)
      setPassword('')
    } catch (err: any) {
      setLoginError(err.message || 'Login failed.')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    setAuthenticated(false)
    setStudentResult(null)
    setPending(null)
    setInterest(null)
    setPendingReviews(null)
    setApplications(null)
    setIdPrefix('')
  }

  const toggleRegistration = async () => {
    if (registrationOpen === null) return
    setTogglingRegistration(true)
    try {
      const res = await fetch('/api/admin/registration-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ open: !registrationOpen }),
      })
      const data = await res.json()
      if (data.success) setRegistrationOpen(data.open)
    } finally {
      setTogglingRegistration(false)
    }
  }

  const searchStudent = async () => {
    if (!glabIdQuery.trim()) return
    setSearchingStudent(true)
    setStudentError('')
    setStudentResult(null)
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ glabId: glabIdQuery }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Search failed.')
      if (!data.found) {
        setStudentError('No student found with that GLAB ID.')
        return
      }
      setStudentResult(data)
    } catch (err: any) {
      setStudentError(err.message || 'Search failed.')
    } finally {
      setSearchingStudent(false)
    }
  }

  const toggleBlock = async () => {
    if (!studentResult?.glabId) return
    setTogglingBlock(true)
    try {
      const res = await fetch('/api/admin/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ glabId: studentResult.glabId, blocked: !studentResult.blocked }),
      })
      const data = await res.json()
      if (data.success) setStudentResult({ ...studentResult, blocked: data.blocked })
    } finally {
      setTogglingBlock(false)
    }
  }

  const loadPending = async () => {
    setLoadingPending(true)
    setPendingError('')
    try {
      const res = await fetch('/api/admin/registrations/pending', { method: 'POST' })
      const data = await res.json()
      if (data.success) setPending(data.registrations)
      else setPendingError(data.error || 'Failed to load pending registrations.')
    } catch {
      setPendingError('Failed to load pending registrations.')
    } finally {
      setLoadingPending(false)
    }
  }

  const confirmRegistration = async (reg: PendingRegistration) => {
    const key = reg.glabId + reg.timestamp
    setConfirmingKey(key)
    try {
      const res = await fetch('/api/admin/registrations/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ glabId: reg.glabId, timestamp: reg.timestamp }),
      })
      const data = await res.json()
      if (data.success) {
        setPending(prev => (prev || []).filter(r => r.glabId + r.timestamp !== key))
      }
    } finally {
      setConfirmingKey('')
    }
  }

  const loadInterest = async () => {
    setLoadingInterest(true)
    setInterestError('')
    try {
      const res = await fetch('/api/admin/interest/pending', { method: 'POST' })
      const data = await res.json()
      if (data.success) setInterest(data.requests)
      else setInterestError(data.error || 'Failed to load interest requests.')
    } catch {
      setInterestError('Failed to load interest requests.')
    } finally {
      setLoadingInterest(false)
    }
  }

  const approveInterest = async (req: InterestRequest) => {
    const key = req.glabId + req.timestamp
    setApprovingKey(key)
    try {
      const res = await fetch('/api/admin/interest/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ glabId: req.glabId, timestamp: req.timestamp, level: req.level }),
      })
      const data = await res.json()
      if (data.success) {
        setInterest(prev => (prev || []).filter(r => r.glabId + r.timestamp !== key))
      }
    } finally {
      setApprovingKey('')
    }
  }

  const loadApplications = async () => {
    setLoadingApplications(true)
    setApplicationsError('')
    try {
      const res = await fetch('/api/admin/applications/pending', { method: 'POST' })
      const data = await res.json()
      if (data.success) setApplications(data.applications)
      else setApplicationsError(data.error || 'Failed to load applications.')
    } catch {
      setApplicationsError('Failed to load applications.')
    } finally {
      setLoadingApplications(false)
    }
  }

  const loadIdPrefix = async () => {
    try {
      const res = await fetch('/api/admin/applications/id-prefix')
      const data = await res.json()
      if (data.success) {
        setIdPrefix(data.prefix || '')
        setIdPrefixInput(data.prefix || '')
      }
    } catch {
      // Non-critical — Select will just surface the "set a prefix first" error.
    }
  }

  const saveIdPrefix = async () => {
    if (!idPrefixInput.trim()) return
    setSavingIdPrefix(true)
    try {
      const res = await fetch('/api/admin/applications/id-prefix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: idPrefixInput.trim() }),
      })
      const data = await res.json()
      if (data.success) setIdPrefix(idPrefixInput.trim().toUpperCase())
    } finally {
      setSavingIdPrefix(false)
    }
  }

  const applicationKey = (app: Application) => app.email + app.dob

  const selectApplicant = async (app: Application) => {
    const batchId = applicationBatch[applicationKey(app)]
    if (!batchId) return
    const batch = a1Batches.find(b => b.id === batchId)
    const key = applicationKey(app)
    setApplicationActionKey(key)
    try {
      const res = await fetch('/api/admin/applications/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: app.email, dob: app.dob, batchLabel: batch?.label || '', batchId }),
      })
      const data = await res.json()
      if (data.success) {
        setApplications(prev => (prev || []).map(a => a === app
          ? { ...a, status: 'selected', glabId: data.glabId || a.glabId, confirmedBatch: batch?.label || a.confirmedBatch }
          : a))
      } else {
        setApplicationsError(data.error || 'Failed to select applicant.')
      }
    } finally {
      setApplicationActionKey('')
    }
  }

  const rejectApplicant = async (app: Application) => {
    const key = applicationKey(app)
    setApplicationActionKey(key)
    try {
      const res = await fetch('/api/admin/applications/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: app.email, dob: app.dob }),
      })
      const data = await res.json()
      if (data.success) {
        setApplications(prev => (prev || []).map(a => a === app ? { ...a, status: 'not_selected' } : a))
      } else {
        setApplicationsError(data.error || 'Failed to reject applicant.')
      }
    } finally {
      setApplicationActionKey('')
    }
  }

  const loadPendingReviews = async () => {
    setLoadingPendingReviews(true)
    setPendingReviewsError('')
    try {
      const res = await fetch('/api/admin/reviews/pending', { method: 'POST' })
      const data = await res.json()
      if (data.success) setPendingReviews(data.reviews)
      else setPendingReviewsError(data.error || 'Failed to load pending reviews.')
    } catch {
      setPendingReviewsError('Failed to load pending reviews.')
    } finally {
      setLoadingPendingReviews(false)
    }
  }

  const approvePendingReview = async (row: number) => {
    setApprovingReviewRow(row)
    try {
      const res = await fetch('/api/admin/reviews/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row }),
      })
      const data = await res.json()
      if (data.success) {
        setPendingReviews(prev => (prev || []).filter(r => r.row !== row))
      }
    } finally {
      setApprovingReviewRow(null)
    }
  }

  const submitReview = async () => {
    if (!reviewName.trim() || !reviewText.trim()) return
    setSubmittingReview(true)
    setReviewError('')
    setReviewSuccess('')
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reviewName, location: reviewLocation, rating: reviewRating, date: reviewDate,
          level: reviewLevel, text: reviewText, outcome: reviewOutcome, featured: reviewFeatured,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to publish review.')
      setReviewSuccess('Published — it will appear on the site immediately.')
      setReviewName('')
      setReviewLocation('')
      setReviewRating(5)
      setReviewDate(new Date().toISOString().slice(0, 10))
      setReviewLevel('')
      setReviewText('')
      setReviewOutcome('')
      setReviewFeatured(false)
    } catch (err: any) {
      setReviewError(err.message || 'Failed to publish review.')
    } finally {
      setSubmittingReview(false)
    }
  }

  if (checkingSession) {
    return (
      <section className="section pt-20 text-center">
        <Loader2 size={24} className="animate-spin mx-auto" style={{ color: 'var(--text-muted)' }} />
      </section>
    )
  }

  if (!authenticated) {
    return (
      <section className="section pt-20">
        <div className="container max-w-sm mx-auto">
          <div className="card p-8 text-center">
            <Lock size={28} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <h1 className="font-display font-bold text-xl mb-4" style={{ color: 'var(--text-primary)' }}>Admin Login</h1>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Password"
              className="input w-full mb-3"
            />
            <button onClick={handleLogin} disabled={loggingIn || !password} className="btn-primary w-full justify-center disabled:opacity-50">
              {loggingIn ? 'Logging in...' : 'Log In'}
            </button>
            {loginError && (
              <p className="text-sm mt-3 flex items-center justify-center gap-1.5" style={{ color: '#DD0000' }}>
                <ShieldX size={14} /> {loginError}
              </p>
            )}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="section pt-10">
      <div className="container max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>Admin</h1>
          <button onClick={handleLogout} className="text-sm underline inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <LogOut size={13} /> Log Out
          </button>
        </div>

        {/* Registration switch */}
        <div className="card p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Power size={18} style={{ color: registrationOpen ? '#16a34a' : '#DD0000' }} />
              <div>
                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Registration</div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {registrationOpen === null ? 'Loading...' : registrationOpen ? 'Currently open — students can register.' : 'Currently closed — new registrations are blocked.'}
                </div>
              </div>
            </div>
            <button
              onClick={toggleRegistration}
              disabled={registrationOpen === null || togglingRegistration}
              className={registrationOpen ? 'btn-secondary' : 'btn-primary'}
            >
              {registrationOpen === null ? '...' : togglingRegistration ? '...' : registrationOpen ? 'Turn Off' : 'Turn On'}
            </button>
          </div>
        </div>

        {/* Block / unblock student */}
        <div className="card p-6">
          <div className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Block / Unblock Student</div>
          <div className="flex gap-3 mb-3">
            <input
              type="text"
              value={glabIdQuery}
              onChange={e => setGlabIdQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchStudent()}
              placeholder="GLAB ID"
              className="input flex-1"
            />
            <button onClick={searchStudent} disabled={searchingStudent || !glabIdQuery.trim()} className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50">
              <Search size={14} /> Search
            </button>
          </div>
          {studentError && <p className="text-sm" style={{ color: '#DD0000' }}>{studentError}</p>}
          {studentResult && (
            <div className="flex items-center justify-between gap-4 flex-wrap px-4 py-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
              <div>
                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{studentResult.name}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {studentResult.glabId} · {studentResult.blocked ? 'Blocked' : 'Active'}
                  {studentResult.registration ? ` · ${studentResult.registration.course} (${studentResult.registration.status})` : ''}
                </div>
              </div>
              <button
                onClick={toggleBlock}
                disabled={togglingBlock}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: studentResult.blocked ? 'rgba(22,163,74,0.1)' : 'rgba(221,0,0,0.1)', color: studentResult.blocked ? '#16a34a' : '#DD0000' }}
              >
                {studentResult.blocked ? <><CheckCircle size={14} /> Unblock</> : <><Ban size={14} /> Block</>}
              </button>
            </div>
          )}
        </div>

        {/* Pending payment verification */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Pending Payment Verification</div>
            <button onClick={loadPending} disabled={loadingPending} className="text-sm underline inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw size={13} className={loadingPending ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
          {pendingError ? (
            <p className="text-sm" style={{ color: '#DD0000' }}>{pendingError}</p>
          ) : pending === null || loadingPending ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
          ) : pending.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nothing pending — all caught up.</p>
          ) : (
            <div className="space-y-3">
              {pending.map(reg => {
                const key = reg.glabId + reg.timestamp
                return (
                  <div key={key} className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
                      <div>
                        <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{reg.name} · {reg.glabId}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{reg.course} — {reg.batchId}</div>
                      </div>
                      <button
                        onClick={() => confirmRegistration(reg)}
                        disabled={confirmingKey === key}
                        className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50"
                      >
                        {confirmingKey === key ? '...' : 'Confirm'}
                      </button>
                    </div>
                    <div className="text-xs flex flex-wrap gap-x-4 gap-y-1" style={{ color: 'var(--text-muted)' }}>
                      <span>{reg.paymentMethod}{reg.paymentReference ? ` · Ref: ${reg.paymentReference}` : ''}</span>
                      {reg.proofFileLink && (
                        <a href={reg.proofFileLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline" style={{ color: '#DD0000' }}>
                          View Proof <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* A1 applications */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>A1 Applications</div>
            <button onClick={loadApplications} disabled={loadingApplications} className="text-sm underline inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw size={13} className={loadingApplications ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
            <Settings size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Current GLAB ID prefix:</span>
            <input
              type="text"
              value={idPrefixInput}
              onChange={e => setIdPrefixInput(e.target.value)}
              placeholder="e.g. 26H"
              className="input text-sm py-1.5 px-2 w-24"
            />
            <button
              onClick={saveIdPrefix}
              disabled={savingIdPrefix || !idPrefixInput.trim() || idPrefixInput.trim().toUpperCase() === idPrefix}
              className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50"
            >
              {savingIdPrefix ? '...' : 'Save'}
            </button>
            {!idPrefix && <span className="text-xs" style={{ color: '#DD0000' }}>Set this before selecting anyone</span>}
          </div>

          {applicationsError ? (
            <p className="text-sm" style={{ color: '#DD0000' }}>{applicationsError}</p>
          ) : applications === null || loadingApplications ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
          ) : (
            <>
              {applications.filter(a => a.status === 'pending').length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nothing pending — all caught up.</p>
              ) : (
                <div className="space-y-3">
                  {applications.filter(a => a.status === 'pending').map(app => {
                    const key = applicationKey(app)
                    return (
                      <div key={key} className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                        <div className="mb-2">
                          <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{app.name}</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {app.email} · DOB {app.dob}{app.phone ? ` · ${app.phone}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={applicationBatch[key] || ''}
                            onChange={e => setApplicationBatch(prev => ({ ...prev, [key]: e.target.value }))}
                            className="input text-sm py-1.5 flex-1 min-w-[180px]"
                          >
                            <option value="" disabled>Select batch</option>
                            {a1Batches.map(b => (
                              <option key={b.id} value={b.id}>{b.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => selectApplicant(app)}
                            disabled={applicationActionKey === key || !applicationBatch[key] || !idPrefix}
                            className="btn-primary text-sm px-3 py-1.5 inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <UserPlus size={13} /> {applicationActionKey === key ? '...' : 'Select'}
                          </button>
                          <button
                            onClick={() => rejectApplicant(app)}
                            disabled={applicationActionKey === key}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                            style={{ background: 'rgba(221,0,0,0.1)', color: '#DD0000' }}
                          >
                            <XCircle size={13} /> {applicationActionKey === key ? '...' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <button
                onClick={() => setShowDecidedApplications(v => !v)}
                className="text-xs underline mt-4"
                style={{ color: 'var(--text-muted)' }}
              >
                {showDecidedApplications ? 'Hide' : 'Show'} decided applications
              </button>
              {showDecidedApplications && (
                <div className="space-y-2 mt-3">
                  {applications.filter(a => a.status !== 'pending').length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>None yet.</p>
                  ) : applications.filter(a => a.status !== 'pending').map(app => (
                    <div key={applicationKey(app)} className="flex items-center justify-between gap-4 flex-wrap px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-secondary)' }}>
                      <span style={{ color: 'var(--text-primary)' }}>{app.name} · {app.email}</span>
                      <span style={{ color: app.status === 'selected' ? '#16a34a' : '#DD0000' }}>
                        {app.status === 'selected' ? `Selected — ${app.glabId}${app.confirmedBatch ? ` — ${app.confirmedBatch}` : ''}` : 'Not Selected'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Next level interest */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Next Level Interest</div>
            <button onClick={loadInterest} disabled={loadingInterest} className="text-sm underline inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw size={13} className={loadingInterest ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
          {interestError ? (
            <p className="text-sm" style={{ color: '#DD0000' }}>{interestError}</p>
          ) : interest === null || loadingInterest ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
          ) : interest.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nothing pending — all caught up.</p>
          ) : (
            <div className="space-y-3">
              {interest.map(req => {
                const key = req.glabId + req.timestamp
                return (
                  <div key={key} className="flex items-center justify-between gap-4 flex-wrap p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                    <div>
                      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{req.name} · {req.glabId}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Interested in {req.level}{req.requestedBatch ? ` — wants ${req.requestedBatch}` : ''}
                      </div>
                      {req.currentBatch && (
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Currently in: {req.currentBatch}</div>
                      )}
                      {req.email && (
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{req.email}</div>
                      )}
                    </div>
                    <button
                      onClick={() => approveInterest(req)}
                      disabled={approvingKey === key}
                      className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50"
                    >
                      {approvingKey === key ? '...' : `Approve for ${req.level}`}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pending reviews (student self-submitted) */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>Pending Reviews</div>
            <button onClick={loadPendingReviews} disabled={loadingPendingReviews} className="text-sm underline inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw size={13} className={loadingPendingReviews ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
          {pendingReviewsError ? (
            <p className="text-sm" style={{ color: '#DD0000' }}>{pendingReviewsError}</p>
          ) : pendingReviews === null || loadingPendingReviews ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
          ) : pendingReviews.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nothing pending — all caught up.</p>
          ) : (
            <div className="space-y-3">
              {pendingReviews.map(rev => (
                <div key={rev.row} className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
                    <div>
                      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {rev.name} {rev.location ? `· ${rev.location}` : ''} {rev.course ? `· ${rev.course}` : ''}
                      </div>
                      <div className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                        {rev.rating ? Array.from({ length: rev.rating }).map((_, i) => <Star key={i} size={11} fill="#FFCE00" style={{ color: '#FFCE00' }} />) : null}
                      </div>
                    </div>
                    <button
                      onClick={() => approvePendingReview(rev.row)}
                      disabled={approvingReviewRow === rev.row}
                      className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50"
                    >
                      {approvingReviewRow === rev.row ? '...' : 'Publish'}
                    </button>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{rev.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add review */}
        <div className="card p-6">
          <div className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Star size={16} /> Add Review
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" value={reviewName} onChange={e => setReviewName(e.target.value)} placeholder="Name" className="input" />
              <input type="text" value={reviewLocation} onChange={e => setReviewLocation(e.target.value)} placeholder="Location (optional)" className="input" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select value={reviewRating} onChange={e => setReviewRating(Number(e.target.value))} className="input">
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} star{n === 1 ? '' : 's'}</option>)}
              </select>
              <input type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)} className="input" />
              <select value={reviewLevel} onChange={e => setReviewLevel(e.target.value)} className="input">
                <option value="" disabled>Select category</option>
                {REVIEW_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Review text" rows={4} className="input" />
            <input type="text" value={reviewOutcome} onChange={e => setReviewOutcome(e.target.value)} placeholder="Outcome badge, e.g. Passed Goethe B1 Exam (optional)" className="input" />
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={reviewFeatured} onChange={e => setReviewFeatured(e.target.checked)} />
              Feature this review (shows in the homepage spotlight)
            </label>
            {reviewError && <p className="text-sm" style={{ color: '#DD0000' }}>{reviewError}</p>}
            {reviewSuccess && <p className="text-sm flex items-center gap-1.5" style={{ color: '#16a34a' }}><CheckCircle size={14} /> {reviewSuccess}</p>}
            <button
              onClick={submitReview}
              disabled={submittingReview || !reviewName.trim() || !reviewText.trim()}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              <PlusCircle size={14} /> {submittingReview ? 'Publishing...' : 'Publish Review'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
