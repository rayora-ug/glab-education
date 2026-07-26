'use client'

import { useState } from 'react'
import ExamEngine, { type ExamData } from '../exam/ExamEngine'
import { EXAM_REGISTRY } from '../../data/exams/registry'

export default function PruefungClient() {
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [examData, setExamData] = useState<ExamData | null>(null)

  function go() {
    const clean = code.trim()
    if (!clean) { setErr('Bitte gib deinen Prüfungscode ein.'); return }
    const found = EXAM_REGISTRY[clean]
    if (!found) { setErr('Unbekannter Prüfungscode. Bitte überprüfe den Code oder kontaktiere deinen Kursleiter.'); return }
    setErr('')
    setExamData(found)
  }

  if (examData) {
    return <ExamEngine examData={examData} permissionMode="live" initialExamCode={examData.examCode} />
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FEFDF9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#fff', border: '1px solid #E5E3DC', borderRadius: 20, padding: '40px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg,#000 33%,#DD0000 33% 66%,#FFCE00 66%)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 22 }}>🎓</span>
          </div>
          <div style={{ fontFamily: 'serif', fontWeight: 900, fontSize: 22, color: '#0A0A0A' }}>GLAB</div>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', color: '#777', marginTop: 2, textTransform: 'uppercase' }}>German Language Academy of Bangladesh</div>
          <div style={{ marginTop: 20, fontSize: 17, fontWeight: 700, color: '#0A0A0A' }}>Prüfung</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#3A3A3A', marginBottom: 6 }}>Prüfungscode</label>
          <input
            type="password"
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && go()}
            placeholder="Vom Kursleiter"
            autoFocus
            style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #E5E3DC', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#F8F7F2', color: '#0A0A0A' }}
          />
        </div>

        {err && (
          <div style={{ background: 'rgba(221,0,0,0.08)', border: '1px solid rgba(221,0,0,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#DD0000' }}>
            {err}
          </div>
        )}

        <button onClick={go}
          style={{ width: '100%', padding: '13px', background: '#DD0000', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
          Weiter →
        </button>
      </div>
    </div>
  )
}
