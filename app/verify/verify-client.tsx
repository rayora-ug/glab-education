'use client'

import { useState } from 'react'
import { Search, ShieldCheck, ShieldX, Award, Calendar, User, BookOpen, Star, Download } from 'lucide-react'
import certificates from '../../data/certificates.json'

type Certificate = typeof certificates[0]

const gradeColors: Record<string, string> = {
  Distinction: '#FFCE00',
  Merit: '#DD0000',
  Pass: '#16a34a',
}

const gradeLabels: Record<string, string> = {
  Distinction: '⭐ Distinction',
  Merit: '🥈 Merit',
  Pass: '✓ Pass',
}

export default function VerifyPage() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<Certificate | null | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  const handleVerify = () => {
    if (!query.trim()) return
    setLoading(true)
    setTimeout(() => {
      const found = (certificates as Certificate[]).find(
        c => c.certificateId.toLowerCase() === query.trim().toLowerCase()
      )
      setResult(found ?? null)
      setLoading(false)
    }, 800)
  }

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
            Enter the certificate ID printed on any GLAB course certificate to verify its authenticity instantly.
          </p>

          <div className="max-w-xl flex gap-3">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
              placeholder="e.g. GLAB-2024-A1-002"
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
            Try: <span
              className="cursor-pointer underline"
              style={{ color: '#DD0000' }}
              onClick={() => setQuery('GLAB-2024-A1-002')}
            >GLAB-2024-A1-002</span>
            {' '}or{' '}
            <span
              className="cursor-pointer underline"
              style={{ color: '#DD0000' }}
              onClick={() => setQuery('GLAB-2024-B1-004')}
            >GLAB-2024-B1-004</span>
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-3xl">
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
                No certificate matched <strong>"{query}"</strong>. Please check the ID and try again. IDs are case-insensitive.
              </p>
            </div>
          )}

          {result && (
            <div className="card overflow-hidden">
              {/* Status banner */}
              <div className="flex items-center gap-3 px-8 py-4" style={{ background: result.valid ? '#16a34a' : '#DD0000' }}>
                <ShieldCheck size={20} color="white" />
                <span className="font-semibold text-white text-sm tracking-wide uppercase">
                  {result.valid ? 'Verified – Authentic Certificate' : 'Invalid Certificate'}
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
                    Certificate of {result.type === 'completion' ? 'Completion' : 'Participation'}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-muted)' }}>This is to certify that</div>
                </div>

                <div className="text-center mb-8 py-4 border-t border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="font-display font-black text-4xl md:text-5xl mb-2" style={{ color: '#DD0000' }}>
                    {result.studentName}
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    has successfully {result.type === 'completion' ? 'completed' : 'participated in'} the course
                  </p>
                  <div className="font-display font-bold text-2xl mt-2" style={{ color: 'var(--text-primary)' }}>
                    {result.course} <span className="text-lg font-mono">({result.level})</span>
                  </div>
                  <div className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                    {result.batch} &nbsp;·&nbsp; Score: <strong style={{ color: 'var(--text-primary)' }}>{result.score}%</strong>
                  </div>
                </div>

                <div className="text-center mb-6">
                  <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold" style={{ background: `${gradeColors[result.grade]}22`, color: gradeColors[result.grade], border: `1px solid ${gradeColors[result.grade]}44` }}>
                    <Star size={14} fill={gradeColors[result.grade]} />
                    {gradeLabels[result.grade]}
                  </span>
                </div>

                <div className="german-stripe mt-8 rounded-full" />
              </div>

              {/* Details grid */}
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { icon: User,     label: 'Student',          value: result.studentName },
                  { icon: BookOpen, label: 'Course',           value: `${result.course} (${result.level})` },
                  { icon: Calendar, label: 'Completion Date',  value: new Date(result.completionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
                  { icon: Calendar, label: 'Issue Date',       value: new Date(result.issuedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
                  { icon: Award,    label: 'Certificate ID',   value: result.certificateId },
                  { icon: Star,     label: 'Grade',            value: result.grade },
                ].map(({ icon: Icon, label, value }) => (
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
