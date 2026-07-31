'use client'

import { useState } from 'react'
import { Search, ShieldCheck, ShieldX, Award, Calendar, User, BookOpen, Activity } from 'lucide-react'

type Certificate = {
  certificateId: string
  studentName: string
  course: string
  startingDate: string
  completionDate: string
  issuedDate: string
  status: string
}

const statusColors: Record<string, string> = {
  Completed: '#16a34a',
  Running: '#B8920A',
  Enrolled: '#2563eb',
}

function fmtDate(d: string) {
  if (!d || d.trim() === '-') return ''
  const parsed = new Date(d)
  if (isNaN(parsed.getTime())) return d
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function VerifyPage() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<Certificate | null | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')

  const handleVerify = async () => {
    if (!query.trim()) return
    setLoading(true)
    setLookupError('')
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificateId: query }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Verification failed. Please try again.')
      setResult(data.found ? data.certificate : null)
    } catch (err: any) {
      setResult(undefined)
      setLookupError(err.message || 'Verification failed. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const completed = result?.status === 'Completed'
  const statusColor = result ? (statusColors[result.status] || '#16a34a') : '#16a34a'

  return (
    <>
      <section className="section pt-8" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="german-stripe mb-8 rounded-full" />
          <div className="section-label">Authenticity Check</div>
          <h1 className="font-display font-black text-5xl md:text-6xl mb-4" style={{ color: 'var(--text-primary)' }}>
            Certificate Verification
          </h1>
          <p className="text-xl max-w-2xl mb-10" style={{ color: 'var(--text-muted)' }}>
            Enter the certificate ID printed on any GLAB course certificate to verify its authenticity — or to confirm a student's current enrollment.
          </p>

          <div className="max-w-xl flex gap-3">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
              placeholder="e.g. GLAB-2026-B1-001"
              className="flex-1 px-5 py-4 rounded-xl border text-sm outline-none transition-all"
              style={{
                background: 'var(--card-bg)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              onClick={handleVerify}
              disabled={loading || !query.trim()}
              className="btn-primary flex items-center gap-2 px-6 py-4 disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search size={16} />
              )}
              Verify
            </button>
          </div>

          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            The certificate ID is printed at the bottom of every GLAB certificate.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-3xl">
          {lookupError && (
            <div className="card p-6 mb-6 text-center" style={{ borderColor: '#DD0000' }}>
              <p className="text-sm" style={{ color: '#DD0000' }}>{lookupError}</p>
            </div>
          )}

          {result === undefined && (
            <div className="card p-12 text-center">
              <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: 'rgba(221,0,0,0.08)' }}>
                <Award size={36} style={{ color: '#DD0000' }} />
              </div>
              <h2 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>
                Enter a Certificate ID
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                The certificate ID is printed at the bottom of every GLAB certificate, in the format GLAB-YYYY-LEVEL-NNN.
              </p>
            </div>
          )}

          {result === null && (
            <div className="card p-12 text-center" style={{ borderColor: '#DD0000' }}>
              <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: 'rgba(221,0,0,0.1)' }}>
                <ShieldX size={36} style={{ color: '#DD0000' }} />
              </div>
              <h2 className="font-display font-bold text-2xl mb-2" style={{ color: '#DD0000' }}>
                Certificate Not Found
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No record matched <strong>"{query}"</strong>. Please check the ID and try again. IDs are case-insensitive.
              </p>
            </div>
          )}

          {result && (
            <div className="card overflow-hidden">
              {/* Status banner */}
              <div className="flex items-center gap-3 px-8 py-4" style={{ background: statusColor }}>
                <ShieldCheck size={20} color="white" />
                <span className="font-semibold text-white text-sm tracking-wide uppercase">
                  {completed ? 'Verified – Authentic Certificate' : 'Verified – GLAB Student Record'}
                </span>
              </div>

              {/* Certificate visual */}
              <div className="relative p-8 md:p-12" style={{ background: 'var(--bg-secondary)' }}>
                <div className="german-stripe mb-8 rounded-full" />

                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg,#000 33%,#DD0000 33% 66%,#FFCE00 66%)' }}>
                    <Award size={28} color="white" />
                  </div>
                  <div className="font-mono text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                    German Language Academy of Bangladesh
                  </div>
                  <div className="font-display font-black text-3xl md:text-4xl mb-2" style={{ color: 'var(--text-primary)' }}>
                    {completed ? 'Certificate of Completion' : 'Student Verification'}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-muted)' }}>This is to certify that</div>
                </div>

                <div className="text-center mb-8 py-4 border-t border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="font-display font-black text-4xl md:text-5xl mb-2" style={{ color: '#DD0000' }}>
                    {result.studentName}
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {completed ? 'has successfully completed the course' : result.status === 'Running' ? 'is currently attending the course' : 'is enrolled in the course'}
                  </p>
                  <div className="font-display font-bold text-2xl mt-2" style={{ color: 'var(--text-primary)' }}>
                    {result.course}
                  </div>
                </div>

                {result.status && (
                  <div className="text-center mb-6">
                    <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold" style={{ background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}44` }}>
                      <Activity size={14} />
                      {result.status}
                    </span>
                  </div>
                )}

                <div className="german-stripe mt-8 rounded-full" />
              </div>

              {/* Details grid */}
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { icon: User,     label: 'Student',         value: result.studentName },
                  { icon: BookOpen, label: 'Course',          value: result.course },
                  { icon: Calendar, label: 'Starting Date',   value: fmtDate(result.startingDate) },
                  { icon: Calendar, label: 'Completion Date', value: fmtDate(result.completionDate) },
                  { icon: Calendar, label: 'Issue Date',      value: fmtDate(result.issuedDate) },
                  { icon: Award,    label: 'Certificate ID',  value: result.certificateId },
                  { icon: Activity, label: 'Status',          value: result.status },
                ].filter(({ value }) => value).map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(221,0,0,0.08)' }}>
                      <Icon size={16} style={{ color: '#DD0000' }} />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
