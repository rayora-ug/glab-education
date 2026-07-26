'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/* ── types ── */
type ArticleQ = { id: number; type: 'article'; word: string; answer: string }
type FillQ    = { id: number; type: 'fill';    question: string; answer: string; hint: string }
type WritingQ = {
  id: number
  type: 'writing'
  prompt: string
  uploadMode?: 'link' | 'native'
  driveLink?: string
  uploadButtonLabel?: string
  uploadInstructions?: string
}

const MAX_WRITING_FILE_BYTES = 5 * 1024 * 1024

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
type Question = ArticleQ | FillQ | WritingQ
type Screen   = 'login' | 'rules' | 'exam' | 'results'

export type ExamData = {
  examCode: string
  title: string
  subtitle?: string
  duration: number
  allowedIds?: string[]
  questions: Question[]
}

type PermissionMode = 'static' | 'live'

const ARTICLE_OPTIONS = ['der', 'die', 'das']

function fmt(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

function normalise(s: string) {
  return s.trim().toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
}

function correct(q: Question, ans: string): boolean {
  if (q.type === 'writing') return false
  return normalise(q.answer) === normalise(ans)
}

function storageAvailable() {
  try {
    const testKey = '__glab_storage_test__'
    localStorage.setItem(testKey, '1')
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
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

export default function ExamEngine({ examData, permissionMode }: { examData: ExamData; permissionMode: PermissionMode }) {
  const questions = examData.questions
  const TOTAL = questions.length
  const SCORABLE = questions.filter(q => q.type !== 'writing')
  const SCORABLE_TOTAL = SCORABLE.length
  const DURATION = examData.duration * 60
  const SAVE_KEY = `glab-exam-${examData.examCode}`
  const WRITING_Q = questions.find(q => q.type === 'writing') as WritingQ | undefined
  const hasArticle = questions.some(q => q.type === 'article')
  const hasFill = questions.some(q => q.type === 'fill')
  const hasWriting = questions.some(q => q.type === 'writing')

  const [screen, setScreen]         = useState<Screen>('login')
  const [name, setName]             = useState('')
  const [glabId, setGlabId]         = useState('')
  const [examCode, setExamCode]     = useState('')
  const [loginErr, setLoginErr]     = useState('')
  const [checkingPermission, setCheckingPermission] = useState(false)
  const [current, setCurrent]       = useState(0)
  const [answers, setAnswers]       = useState<Record<number, string>>({})
  const [timeLeft, setTimeLeft]     = useState(DURATION)
  const [warning, setWarning]       = useState('')
  const [submitted, setSubmitted]   = useState(false)
  const [resumed, setResumed]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [storageOk, setStorageOk]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [writingUploadStatus, setWritingUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [writingUploadError, setWritingUploadError] = useState('')
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const glabIdRef = useRef('')
  const submittingRef = useRef(false)
  const finaliseRef = useRef<() => void>(() => {})

  useEffect(() => { setStorageOk(storageAvailable()) }, [])

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
        if (t <= 1) { finaliseRef.current(); return 0 }
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
        glabId: glabIdRef.current,
        answers,
        timeLeft,
        current,
      }))
    } catch { setStorageOk(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, submitted, answers, timeLeft, current, glabId])

  async function login() {
    setLoginErr('')
    const idClean = glabId.trim().toUpperCase()
    const codeClean = examCode.trim()

    if (!name.trim()) { setLoginErr('Bitte gib deinen vollständigen Namen ein.'); return }
    if (!idClean)     { setLoginErr('Bitte gib deine GLAB-ID ein.'); return }
    if (!codeClean)   { setLoginErr('Bitte gib den Prüfungscode ein.'); return }
    if (codeClean !== examData.examCode) { setLoginErr('Falscher Prüfungscode. Frage deinen Kursleiter.'); return }

    if (permissionMode === 'static') {
      const allowed = (examData.allowedIds || []).map(s => s.toUpperCase())
      if (!allowed.includes(idClean)) { setLoginErr('Deine GLAB-ID ist nicht für diese Prüfung registriert. Kontaktiere deinen Kursleiter.'); return }
    } else {
      setCheckingPermission(true)
      try {
        const res = await fetch('/api/exam/check-permission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ examCode: examData.examCode, glabId: idClean }),
        })
        const data = await res.json()
        setCheckingPermission(false)
        if (!data.success) { setLoginErr('Verbindung fehlgeschlagen. Bitte überprüfe deine Internetverbindung und versuche es erneut.'); return }
        if (!data.allowed) { setLoginErr('Deine GLAB-ID ist nicht für diese Prüfung registriert. Kontaktiere deinen Kursleiter.'); return }
        if (data.alreadySubmitted) { setLoginErr('Diese GLAB-ID hat die Prüfung bereits abgeschlossen. Eine erneute Teilnahme ist nicht möglich.'); return }
      } catch {
        setCheckingPermission(false)
        setLoginErr('Verbindung fehlgeschlagen. Bitte überprüfe deine Internetverbindung und versuche es erneut.')
        return
      }
    }

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

  async function finalise() {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setSubmitError('')

    const scorableCorrect = SCORABLE.filter(q => correct(q, answers[q.id] ?? '')).length
    const percent = Math.round((scorableCorrect / SCORABLE_TOTAL) * 100)

    let ok = false
    try {
      const res = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          glabId: glabIdRef.current,
          examCode: examData.examCode,
          score: scorableCorrect,
          totalScorable: SCORABLE_TOTAL,
          percent,
          answers,
          writingUploaded: WRITING_Q ? !!answers[WRITING_Q.id] : false,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Einreichung fehlgeschlagen.')
      ok = true
    } catch (err: any) {
      setSubmitError(err.message || 'Einreichung fehlgeschlagen. Bitte überprüfe deine Internetverbindung und versuche es erneut.')
    }
    setSubmitting(false)
    submittingRef.current = false
    if (!ok) return

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
    setShowConfirm(false)
    setScreen('results')
  }

  // Keep the timer's auto-submit call pointed at the current closure of
  // finalise() (current answers, current submitting-guard state), not the
  // one captured when the timer's setInterval was first created — otherwise
  // time-out auto-submit sends whatever answers/name existed at the moment
  // the exam started (i.e. none), not what the student actually entered.
  useEffect(() => { finaliseRef.current = finalise })

  function confirmSubmit() { finalise() }
  function submit() { setSubmitError(''); setShowConfirm(true) }

  function setAns(qId: number, val: string) {
    setAnswers(a => ({ ...a, [qId]: val }))
  }

  async function handleWritingFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !WRITING_Q) return
    if (!/^image\//.test(file.type) && file.type !== 'application/pdf') {
      setWritingUploadStatus('error')
      setWritingUploadError('Bitte lade ein Foto (Bild) oder eine PDF-Datei hoch.')
      return
    }
    if (file.size > MAX_WRITING_FILE_BYTES) {
      setWritingUploadStatus('error')
      setWritingUploadError('Die Datei ist zu groß (max. 5MB).')
      return
    }
    setWritingUploadStatus('uploading')
    setWritingUploadError('')
    try {
      const fileBase64 = await fileToBase64(file)
      const res = await fetch('/api/exam/upload-writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examCode: examData.examCode,
          glabId: glabIdRef.current,
          fileBase64, fileName: file.name, fileMimeType: file.type,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Upload fehlgeschlagen.')
      setWritingUploadStatus('done')
      setAns(WRITING_Q.id, data.fileUrl || 'uploaded')
    } catch (err: any) {
      setWritingUploadStatus('error')
      setWritingUploadError(err.message || 'Upload fehlgeschlagen. Bitte überprüfe deine Internetverbindung und versuche es erneut.')
    }
  }

  const answered = Object.keys(answers).length
  const danger = timeLeft < 120

  const q = questions[current]

  const rules: string[] = [
    `⏱ Du hast ${examData.duration} Minuten für ${TOTAL} Fragen. Der Timer startet mit dem Klick auf "Prüfung starten".`,
    '🔄 Du kannst zwischen den Fragen frei hin- und herwechseln.',
  ]
  if (hasArticle && hasFill) rules.push('📝 Bei Artikel-Fragen wähle der / die / das. Bei Lückentext-Fragen tippe das fehlende deutsche Wort.')
  else if (hasArticle) rules.push('📝 Wähle bei jeder Frage der / die / das.')
  else if (hasFill) rules.push('📝 Tippe bei jeder Frage das fehlende deutsche Wort.')
  if (hasWriting) rules.push('✍️ Bei der Schreibaufgabe schreibst du deine Antwort von Hand und lädst ein Foto über den angegebenen Link hoch.')
  rules.push(
    '🚫 Tab wechseln, kopieren, einfügen und Screenshots sind verboten.',
    '✅ Deine Antworten werden nach der Abgabe übermittelt; die Ergebnisse werden separat veröffentlicht.',
    '⚡ Die Prüfung wird automatisch abgegeben, wenn die Zeit abläuft.',
  )

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
            <div style={{ fontSize: 13, color: '#DD0000', marginBottom: 16 }}>
              Nach der Abgabe kannst du die Prüfung nicht mehr ändern.
            </div>
            {submitError && (
              <div style={{ background: 'rgba(221,0,0,0.08)', border: '1px solid rgba(221,0,0,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#DD0000', textAlign: 'left' }}>
                {submitError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setShowConfirm(false); setSubmitError('') }} disabled={submitting}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #E5E3DC', background: '#F8F7F2', color: '#3A3A3A', fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.5 : 1 }}>
                Zurück
              </button>
              <button onClick={confirmSubmit} disabled={submitting}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#DD0000', color: 'white', fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Wird eingereicht…' : 'Ja, abgeben ✓'}
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

            <button onClick={login} disabled={checkingPermission}
              style={{ width: '100%', padding: '13px', background: '#DD0000', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: checkingPermission ? 'not-allowed' : 'pointer', marginTop: 4, opacity: checkingPermission ? 0.7 : 1 }}>
              {checkingPermission ? 'Wird geprüft…' : 'Zur Prüfung →'}
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
              {rules.map((rule, i) => (
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

          {/* persistent storage warning */}
          {!storageOk && (
            <div style={{ background: 'rgba(255,206,0,0.15)', borderBottom: '1px solid rgba(255,206,0,0.4)', padding: '8px 20px', textAlign: 'center', fontSize: 12.5, color: '#7A5C00', fontWeight: 600 }}>
              ⚠️ Dein Fortschritt kann in diesem Browser nicht automatisch gespeichert werden. Bitte schließe diesen Tab nicht und wechsle nicht die App, sonst gehen deine Antworten verloren.
            </div>
          )}

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
                  {q.type === 'article' ? 'Artikel' : q.type === 'fill' ? 'Lückentext' : 'Schreiben'} &nbsp;·&nbsp; F {current + 1} / {TOTAL}
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

              {/* WRITING question */}
              {q.type === 'writing' && (
                <>
                  <div style={{ fontSize: 17, fontWeight: 600, color: '#0A0A0A', lineHeight: 1.7, marginBottom: 24, whiteSpace: 'pre-wrap' }}>
                    {(q as WritingQ).prompt}
                  </div>
                  {(q as WritingQ).uploadMode === 'native' ? (
                    <>
                      <div style={{ background: 'rgba(255,206,0,0.12)', border: '1px solid rgba(255,206,0,0.4)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#3A3A3A', marginBottom: 20, lineHeight: 1.6 }}>
                        ✍️ Schreibe deine Antwort von Hand auf Papier, mache dann ein Foto (oder einen Scan) und lade es direkt hier hoch.
                      </div>
                      <label style={{ display: 'block', textAlign: 'center', padding: '14px', borderRadius: 12, border: '2px dashed #E5E3DC', background: '#F8F7F2', cursor: 'pointer', marginBottom: 12 }}>
                        <input type="file" accept="image/*,application/pdf" capture="environment"
                          onChange={handleWritingFileChange}
                          disabled={writingUploadStatus === 'uploading'}
                          style={{ display: 'none' }} />
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A' }}>
                          {answers[q.id] ? '📤 Andere Datei wählen' : '📤 Foto oder PDF auswählen'}
                        </span>
                      </label>
                      {writingUploadStatus === 'uploading' && (
                        <p style={{ textAlign: 'center', fontSize: 13, color: '#777' }}>⏳ Wird hochgeladen…</p>
                      )}
                      {writingUploadStatus === 'done' && (
                        <p style={{ textAlign: 'center', fontSize: 13, color: '#16a34a', fontWeight: 600 }}>✅ Erfolgreich hochgeladen.</p>
                      )}
                      {writingUploadStatus === 'error' && (
                        <p style={{ textAlign: 'center', fontSize: 13, color: '#DD0000' }}>{writingUploadError}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <div style={{ background: 'rgba(255,206,0,0.12)', border: '1px solid rgba(255,206,0,0.4)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#3A3A3A', marginBottom: 20, lineHeight: 1.6 }}>
                        {(q as WritingQ).uploadInstructions ? (
                          (q as WritingQ).uploadInstructions
                        ) : (
                          <>✍️ Schreibe deine Antwort von Hand auf Papier, mache ein Foto oder einen Scan, und lade es über den Link unten hoch. Bitte benenne die Datei mit deiner GLAB-ID (z. B. <b>{glabId.toUpperCase() || 'GLAB26F011'}.jpg</b>), damit wir sie zuordnen können.</>
                        )}
                      </div>
                      <a href={(q as WritingQ).driveLink} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'block', textAlign: 'center', padding: '14px', borderRadius: 12, background: '#0A0A0A', color: 'white', fontSize: 15, fontWeight: 700, textDecoration: 'none', marginBottom: 16 }}>
                        {(q as WritingQ).uploadButtonLabel || '📤 Zum Google Drive Upload-Ordner'}
                      </a>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', fontSize: 13, color: '#3A3A3A', cursor: 'pointer' }}>
                        <input type="checkbox" checked={!!answers[q.id]} onChange={e => setAns(q.id, e.target.checked ? 'uploaded' : '')}
                          style={{ width: 18, height: 18 }} />
                        Ich bestätige, dass ich meine Antwort hochgeladen habe.
                      </label>
                    </>
                  )}
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

            {/* submission confirmation card (no score shown — results are published separately) */}
            <div style={{ background: '#fff', border: '1px solid #E5E3DC', borderRadius: 20, padding: '36px', textAlign: 'center', marginBottom: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              <div style={{ height: 4, borderRadius: 4, background: 'linear-gradient(to right,#000 33%,#DD0000 33% 66%,#FFCE00 66%)', marginBottom: 28 }} />
              <div style={{ width: 80, height: 80, borderRadius: '50%', border: '4px solid #16a34a', background: '#16a34a15', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                ✅
              </div>
              <div style={{ fontFamily: 'serif', fontSize: 28, fontWeight: 900, color: '#0A0A0A', lineHeight: 1.3 }}>Prüfung eingereicht</div>
              <div style={{ fontSize: 14, color: '#777', marginTop: 12, lineHeight: 1.6 }}>
                Danke, {name.split(' ')[0]}! Deine Antworten wurden erfolgreich übermittelt.<br />
                Die Ergebnisse werden separat von GLAB veröffentlicht.
              </div>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 16 }}>{glabId.toUpperCase()} &nbsp;·&nbsp; {examData.title}</div>
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
