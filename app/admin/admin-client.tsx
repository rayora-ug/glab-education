'use client'

import { useEffect, useState } from 'react'
import {
  Lock, ShieldX, Search, Ban, CheckCircle, Power,
  ExternalLink, RefreshCw, LogOut, Loader2,
} from 'lucide-react'

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
      </div>
    </section>
  )
}
