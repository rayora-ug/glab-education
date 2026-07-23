'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import examData from '../../data/exam-a2-vocab.json'

/* ── types ── */
type ArticleQ = { id: number; type: 'article'; word: string; answer: string }
type FillQ    = { id: number; type: 'fill';    question: string; answer: string; hint: string }
type Question = ArticleQ | FillQ
type Screen   = 'login' | 'rules' | 'exam' | 'results'

const ARTICLE_OPTIONS = ['der', 'die', 'das']
const questions = examData.questions as Question[]
const TOTAL = questions.length
const DURATION = examData.duration * 60
const SAVE_KEY = `glab-exam-${examData.examCode}`

function fmt(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

function normalise(s: string) {
  return s.trim().toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
}

function correct(q: Question, ans: string): boolean {
  return normalise(q.answer) === normalise(ans)
}

/* ── anti-cheat hook ── */
function useAntiCheat(active: boolean, onViolation: (msg: string) => void) {
  useEffect(() => {
    if (!active) return
    const block = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && ['c','v','a','p','s','u'].includes(e.key.toLowerCase())) { e.preventDefault(); onViolation('Copy/paste disabled during exam.') }
      if (e.key === 'F12' || (ctrl && e.shiftKey && e.key === 'I')) { e.preventDefault() }
      if (e.key === 'PrintScreen') onViolation('Screenshot erkannt!')
    }
    const blockRight = (e: MouseEvent) => e.preventDefault()
    const blockCopy  = (e: ClipboardEvent) => { e.preventDefault(); onViolation('Kopieren/Einfügen ist während der Prüfung nicht erlaubt.') }
    const onVis = () => { if (document.hidden) onViolation('Tab-Wechsel erkannt! Bitte bleib auf dieser Seite.') }

    document.addEventListener('keydown', block)
    document.addEventListener('contextmenu', blockRight)
    document.addEventListener('copy', blockCopy)
    document.addEventListener('paste', blockCopy)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('keydown', block)
      document.removeEventListener('contextmenu', blockRight)
      document.removeEventListener('copy', blockCopy)
      document.removeEventListener('paste', blockCopy)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [active, onViolation])
}

export default function ExamClient() {
  const [screen, setScreen]         = useState<Screen>('login')
  const [name, setName]             = useState('')
  const [glabId, setGlabId]         = useState('')
  const [examCode, setExamCode]     = useState('')
  const [loginErr, setLoginErr]     = useState('')
  const [current, setCurrent]       = useState(0)
  const [answers, setAnswers]       = useState<Record<number, string>>({})
  const [timeLeft, setTimeLeft]     = useState(DURATION)
  const [warning, setWarning]       = useState('')
  const [submitted, setSubmitted]   = useState(false)
  const [resumed, setResumed]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const glabIdRef = useRef('')

  const showWarning = useCallback((msg: string) => {
    setWarning(msg)
    setTimeout(() => setWarning(''), 3000)
  }, [])

  useAntiCheat(screen === 'exam' && !submitted, showWarning)

  /* timer */
  useEffect(() => {
    if (screen !== 'exam' || submitted) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { finalise(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, submitted])

  /* persist exam state to localStorage */
  useEffect(() => {
    if (screen !== 'exam' || submitted) return
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        glabId: glabId.toUpperCase(),
        answers,
        timeLeft,
        current,
      }))
    } catch { /* ignore */ }
  }, [screen, submitted, answers, timeLeft, current, glabId])

  function login() {
    setLoginErr('')
    const idClean = glabId.trim().toUpperCase()
    const codeClean = examCode.trim()

    if (!name.trim()) { setLoginErr('Bitte gib deinen vollständigen Namen ein.'); return }
    if (!idClean)     { setLoginErr('Bitte gib deine GLAB-ID ein.'); return }
    if (!codeClean)   { setLoginErr('Bitte gib den Prüfungscode ein.'); return }
    if (codeClean !== examData.examCode) { setLoginErr('Falscher Prüfungscode. Frage deinen Kursleiter.'); return }
    const allowed = (examData.allowedIds as string[]).map(s => s.toUpperCase())
    if (!allowed.includes(idClean)) { setLoginErr('Deine GLAB-ID ist nicht für diese Prüfung registriert. Kontaktiere deinen Kursleiter.'); return }

    glabIdRef.current = idClean

    try {
      // Block re-entry if this ID already submitted
      const doneRaw = localStorage.getItem(`${SAVE_KEY}-done`)
      const done: string[] = doneRaw ? JSON.parse(doneRaw) : []
      if (done.includes(idClean)) {
        setLoginErr('Diese GLAB-ID hat die Prüfung bereits abgeschlossen. Eine erneute Teilnahme ist nicht möglich.')
        return
      }

      // Resume in-progress session
      const raw = localStorage.getItem(SAVE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved.glabId === idClean && saved.timeLeft > 0) {
          setAnswers(saved.answers ?? {})
          setCurrent(saved.current ?? 0)
          setTimeLeft(saved.timeLeft)
          setResumed(true)
          setSubmitted(false)
          setScreen('exam')
          return
        }
      }
    } catch { /* ignore */ }

    setScreen('rules')
  }

  function startExam() {
    setAnswers({})
    setCurrent(0)
    setTimeLeft(DURATION)
    setSubmitted(false)
    setScreen('exam')
  }

  function finalise() {
    if (timerRef.current) clearInterval(timerRef.current)
    try {
      localStorage.removeItem(SAVE_KEY)
      const idClean = glabIdRef.current
      const doneRaw = localStorage.getItem(`${SAVE_KEY}-done`)
      const done: string[] = doneRaw ? JSON.parse(doneRaw) : []
      if (!done.includes(idClean)) done.push(idClean)
      localStorage.setItem(`${SAVE_KEY}-done`, JSON.stringify(done))
    } catch { /* ignore */ }
    setSubmitted(true)
    setScreen('results')
  }

  function confirmSubmit() { setShowConfirm(false); finalise() }
  function submit() { setShowConfirm(true) }

  function setAns(qId: number, val: string) {
    setAnswers(a => ({ ...a, [qId]: val }))
  }

  const score = questions.filter(q => correct(q, answers[q.id] ?? '')).length
  const pct   = Math.round((score / TOTAL) * 100)
  const grade = pct >= 90 ? 'Ausgezeichnet' : pct >= 75 ? 'Gut' : pct >= 50 ? 'Bestanden' : 'Nicht bestanden'
  const gradeColor = pct >= 90 ? '#FFCE00' : pct >= 75 ? '#2563eb' : pct >= 50 ? '#16a34a' : '#888'
  const answered = Object.keys(answers).length
  const danger = timeLeft < 120

  const q = questions[current]

  return (
    <div style={{ minHeight: '100vh', background: '#FEFDF9', userSelect: 'none', WebkitUserSelect: 'none' }}>

      {/* resumed session banner */}
      {resumed && screen === 'exam' && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: '#16a34a', color: 'white', padding: '10px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
          onClick={() => setResumed(false)}>
          ✅ Sitzung fortgesetzt – dein Fortschritt wurde wiederhergestellt.
        </div>
      )}

      {/* submission confirmation modal */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '36px', maxWidth: 420, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0A0A0A', marginBottom: 8 }}>Prüfung abgeben?</div>
            <div style={{ fontSize: 14, color: '#777', marginBottom: 8 }}>
              Du hast <b>{Object.keys(answers).length}</b> von <b>{TOTAL}</b> Fragen beantwortet.
            </div>
            <div style={{ fontSize: 13, color: '#DD0000', marginBottom: 28 }}>
              Nach der Abgabe kannst du die Prüfung nicht mehr ändern.
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowConfirm(false)}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #E5E3DC', background: '#F8F7F2', color: '#3A3A3A', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Zurück
              </button>
              <button onClick={confirmSubmit}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#DD0000', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Ja, abgeben ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* global warning toast */}
      {warning && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: '#DD0000', color: 'white', padding: '10px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          ⚠️ {warning}
        </div>
      )}

      {/* ── LOGIN ── */}
      {screen === 'login' && (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ width: '100%', maxWidth: 440, background: '#fff', border: '1px solid #E5E3DC', borderRadius: 20, padding: '40px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
            {/* header */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg,#000 33%,#DD0000 33% 66%,#FFCE00 66%)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 22 }}>🎓</span>
              </div>
              <div style={{ fontFamily: 'serif', fontWeight: 900, fontSize: 22, color: '#0A0A0A' }}>GLAB</div>
              <div style={{ fontSize: 11, letterSpacing: '0.12em', color: '#777', marginTop: 2, textTransform: 'uppercase' }}>German Language Academy of Bangladesh</div>
              <div style={{ marginTop: 20, fontSize: 17, fontWeight: 700, color: '#0A0A0A' }}>{examData.title}</div>
            </div>

            {/* form */}
            {[
              { label: 'Vollständiger Name', value: name,     set: setName,     placeholder: 'z.B. Fatima Akter', type: 'text' },
              { label: 'GLAB-ID',            value: glabId,   set: setGlabId,   placeholder: 'z.B. GLAB20W001',   type: 'text' },
              { label: 'Prüfungscode',       value: examCode, set: setExamCode, placeholder: 'Vom Kursleiter',     type: 'password' },
            ].map(({ label, value, set, placeholder, type }) => (
              <div key={label} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#3A3A3A', marginBottom: 6 }}>{label}</label>
                <input
                  type={type}
                  value={value}
                  onChange={e => set(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && login()}
                  placeholder={placeholder}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #E5E3DC', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#F8F7F2', color: '#0A0A0A' }}
                />
              </div>
            ))}

            {loginErr && (
              <div style={{ background: 'rgba(221,0,0,0.08)', border: '1px solid rgba(221,0,0,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#DD0000' }}>
                {loginErr}
              </div>
            )}

            <button onClick={login}
              style={{ width: '100%', padding: '13px', background: '#DD0000', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
              Zur Prüfung →
            </button>

            <p style={{ textAlign: 'center', fontSize: 12, color: '#aaa', marginTop: 16 }}>
              {TOTAL} Fragen · {examData.duration} Minuten · GLAB {new Date().getFullYear()}
            </p>
          </div>
        </div>
      )}

      {/* ── RULES ── */}
      {screen === 'rules' && (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ width: '100%', maxWidth: 520, background: '#fff', border: '1px solid #E5E3DC', borderRadius: 20, padding: '40px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
            <div style={{ fontFamily: 'serif', fontWeight: 900, fontSize: 22, color: '#0A0A0A', marginBottom: 4 }}>Bereit, {name.split(' ')[0]}?</div>
            <div style={{ fontSize: 13, color: '#777', marginBottom: 28 }}>GLAB-ID: {glabId.toUpperCase()}</div>

            <div style={{ fontSize: 14, color: '#3A3A3A', marginBottom: 20, lineHeight: 1.8 }}>
              <b>Bitte lies die Regeln sorgfältig:</b>
              {[
                `⏱ Du hast ${examData.duration} Minuten für ${TOTAL} Fragen. Der Timer startet mit dem Klick auf "Prüfung starten".`,
                '🔄 Du kannst zwischen den Fragen frei hin- und herwechseln.',
                '📝 Artikel (F1–30): wähle der / die / das. Lückentext (F31–50): tippe das fehlende deutsche Wort.',
                '🚫 Tab wechseln, kopieren, einfügen und Screenshots sind verboten.',
                '✅ Dein Ergebnis erscheint sofort nach der Abgabe.',
                '⚡ Die Prüfung wird automatisch abgegeben, wenn die Zeit abläuft.',
              ].map((rule, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0 }}>{i + 1}.</span>
                  <span>{rule}</span>
                </div>
              ))}
            </div>

            <div style={{ background: 'rgba(255,206,0,0.12)', border: '1px solid rgba(255,206,0,0.4)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#3A3A3A', marginBottom: 24 }}>
              💡 Tipp: Für Umlaute kannst du auch schreiben: <b>ae=ä, oe=ö, ue=ü, ss=ß</b>, beides wird akzeptiert.
            </div>

            <button onClick={startExam}
              style={{ width: '100%', padding: '14px', background: '#DD0000', color: 'white', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
              Prüfung starten – {examData.duration} Min. ⏱
            </button>
          </div>
        </div>
      )}

      {/* ── EXAM ── */}
      {screen === 'exam' && !submitted && (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F8F7F2' }}>

          {/* top bar */}
          <div style={{ background: '#fff', borderBottom: '1px solid #E5E3DC', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#3A3A3A' }}>
              GLAB &nbsp;·&nbsp; {name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 12, color: '#777' }}>{answered}/{TOTAL} beantwortet</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 17, fontFamily: 'monospace', color: danger ? '#DD0000' : '#0A0A0A', background: danger ? 'rgba(221,0,0,0.08)' : '#F8F7F2', padding: '4px 12px', borderRadius: 8, border: danger ? '1px solid #DD000044' : '1px solid #E5E3DC' }}>
                ⏱ {fmt(timeLeft)}
              </div>
            </div>
          </div>

          {/* progress dots */}
          <div style={{ background: '#fff', borderBottom: '1px solid #E5E3DC', padding: '10px 20px', overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: 4, minWidth: 'max-content' }}>
              {questions.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)}
                  style={{ width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, flexShrink: 0,
                    background: i === current ? '#DD0000' : answers[questions[i].id] ? '#16a34a' : '#E5E3DC',
                    color: (i === current || answers[questions[i].id]) ? 'white' : '#777' }}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* question card */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
            <div style={{ width: '100%', maxWidth: 560, background: '#fff', border: '1px solid #E5E3DC', borderRadius: 20, padding: '36px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

              {/* watermark */}
              <div style={{ position: 'absolute', opacity: 0.04, fontSize: 48, fontWeight: 900, color: '#DD0000', transform: 'rotate(-25deg)', pointerEvents: 'none', userSelect: 'none', top: '40%', left: '10%', whiteSpace: 'nowrap' }}>
                {glabId.toUpperCase()}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#777', textTransform: 'uppercase', letterSpacing: '0.08em', background: '#F8F7F2', padding: '4px 10px', borderRadius: 6 }}>
                  {q.type === 'article' ? 'Artikel' : 'Lückentext'} &nbsp;·&nbsp; F {current + 1} / {TOTAL}
                </span>
                {answers[q.id] && (
                  <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✓ Beantwortet</span>
                )}
              </div>

              {/* ARTICLE question */}
              {q.type === 'article' && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ fontSize: 14, color: '#777', marginBottom: 8 }}>Welcher Artikel passt?</div>
                    <div style={{ fontFamily: 'serif', fontSize: 52, fontWeight: 900, color: '#0A0A0A', lineHeight: 1 }}>
                      {(q as ArticleQ).word}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    {ARTICLE_OPTIONS.map(opt => (
                      <button key={opt} onClick={() => setAns(q.id, opt)}
                        style={{ flex: 1, padding: '18px 0', borderRadius: 14, border: '2px solid', fontSize: 22, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                          background: answers[q.id] === opt ? '#DD0000' : '#F8F7F2',
                          color:      answers[q.id] === opt ? 'white'    : '#0A0A0A',
                          borderColor: answers[q.id] === opt ? '#DD0000' : '#E5E3DC',
                          transform: answers[q.id] === opt ? 'scale(1.04)' : 'scale(1)' }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* FILL question */}
              {q.type === 'fill' && (
                <>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', lineHeight: 1.5, marginBottom: 10, textAlign: 'center' }}>
                    {(q as FillQ).question}
                  </div>
                  <input
                    type="text"
                    value={answers[q.id] ?? ''}
                    onChange={e => setAns(q.id, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && current < TOTAL - 1) setCurrent(c => c + 1)
                    }}
                    placeholder="Antwort eingeben..."
                    autoFocus
                    style={{ width: '100%', padding: '14px 18px', borderRadius: 12, border: '2px solid', borderColor: answers[q.id] ? '#16a34a' : '#E5E3DC', fontSize: 18, outline: 'none', textAlign: 'center', background: '#F8F7F2', color: '#0A0A0A', boxSizing: 'border-box' }}
                  />
                  <p style={{ textAlign: 'center', fontSize: 12, color: '#bbb', marginTop: 8 }}>Enter drücken für die nächste Frage</p>
                </>
              )}
            </div>
          </div>

          {/* bottom nav */}
          <div style={{ background: '#fff', borderTop: '1px solid #E5E3DC', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <button onClick={() => setCurrent(c => c - 1)} disabled={current === 0}
              style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #E5E3DC', background: '#fff', color: '#3A3A3A', fontSize: 14, fontWeight: 600, cursor: current === 0 ? 'not-allowed' : 'pointer', opacity: current === 0 ? 0.4 : 1 }}>
              ← Zurück
            </button>

            {current < TOTAL - 1 ? (
              <button onClick={() => setCurrent(c => c + 1)}
                style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #E5E3DC', background: '#fff', color: '#3A3A3A', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Weiter →
              </button>
            ) : (
              <button onClick={submit}
                style={{ padding: '10px 24px', borderRadius: 10, background: '#DD0000', color: 'white', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Abgeben ✓
              </button>
            )}
          </div>

          {/* floating submit */}
          {answered >= 5 && current < TOTAL - 1 && (
            <button onClick={submit}
              style={{ position: 'fixed', bottom: 80, right: 20, padding: '12px 20px', borderRadius: 12, background: '#DD0000', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(221,0,0,0.4)', zIndex: 20 }}>
              Abgeben ({answered}/{TOTAL}) ✓
            </button>
          )}
        </div>
      )}

      {/* ── RESULTS ── */}
      {screen === 'results' && (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '32px 16px', background: '#F8F7F2' }}>
          <div style={{ width: '100%', maxWidth: 600 }}>

            {/* score card */}
            <div style={{ background: '#fff', border: '1px solid #E5E3DC', borderRadius: 20, padding: '36px', textAlign: 'center', marginBottom: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              <div style={{ height: 4, borderRadius: 4, background: 'linear-gradient(to right,#000 33%,#DD0000 33% 66%,#FFCE00 66%)', marginBottom: 28 }} />
              <div style={{ width: 80, height: 80, borderRadius: '50%', border: `4px solid ${gradeColor}`, background: `${gradeColor}15`, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                {pct >= 90 ? '🏆' : pct >= 75 ? '🥈' : pct >= 50 ? '✅' : '📚'}
              </div>
              <div style={{ fontFamily: 'serif', fontSize: 64, fontWeight: 900, color: gradeColor, lineHeight: 1 }}>{pct}%</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0A0A0A', marginTop: 8 }}>{grade}</div>
              <div style={{ fontSize: 14, color: '#777', marginTop: 4 }}>{score} von {TOTAL} richtig &nbsp;·&nbsp; {name}</div>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{glabId.toUpperCase()} &nbsp;·&nbsp; {examData.title}</div>
              <div style={{ height: 4, borderRadius: 4, background: 'linear-gradient(to right,#000 33%,#DD0000 33% 66%,#FFCE00 66%)', marginTop: 28 }} />
            </div>

            <p style={{ textAlign: 'center', fontSize: 12, color: '#aaa', marginTop: 8 }}>
              GLAB – Deutsche Sprachakademie Bangladesch &nbsp;·&nbsp; glabeducation.com
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
