'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { User, Hash, BookOpen, Clock, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight, Send, RotateCcw, Trophy } from 'lucide-react'
import allTests from '../../data/vocab-tests.json'

type Question = {
  id: number
  type: 'mcq' | 'fill_blank' | 'translate'
  question: string
  options?: string[]
  answer: string
  topic: string
}

type Test = {
  id: string
  title: string
  batchId: string
  duration: number
  totalQuestions: number
  active: boolean
  createdBy: string
  questions: Question[]
}

type Screen = 'login' | 'no-test' | 'ready' | 'test' | 'results'

const availableBatches = (allTests as Test[]).map(t => t.batchId).sort()

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function normalise(s: string) {
  return s.trim().toLowerCase().replace(/[äöüß]/g, c => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c] ?? c))
}

function isCorrect(answer: string, userAnswer: string) {
  return normalise(answer) === normalise(userAnswer)
}

export default function VocabTestPage() {
  const [screen, setScreen] = useState<Screen>('login')
  const [studentName, setStudentName] = useState('')
  const [glabId, setGlabId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [activeTest, setActiveTest] = useState<Test | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [currentQ, setCurrentQ] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const questions = activeTest?.questions ?? []

  const handleLogin = () => {
    if (!studentName.trim() || !glabId.trim() || !batchId) return
    const test = (allTests as Test[]).find(t => t.batchId === batchId && t.active)
    if (!test) { setScreen('no-test'); return }
    setActiveTest(test)
    setScreen('ready')
  }

  const startTest = useCallback(() => {
    if (!activeTest) return
    setAnswers({})
    setCurrentQ(0)
    setSubmitted(false)
    setTimeLeft(activeTest.duration * 60)
    setScreen('test')
  }, [activeTest])

  const submitTest = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setSubmitted(true)
    setScreen('results')
  }, [])

  useEffect(() => {
    if (screen !== 'test' || submitted) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { submitTest(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [screen, submitted, submitTest])

  const setAnswer = (qId: number, val: string) => setAnswers(a => ({ ...a, [qId]: val }))

  const score = questions.filter(q => isCorrect(q.answer, answers[q.id] ?? '')).length
  const total = questions.length
  const pct = total ? Math.round((score / total) * 100) : 0
  const grade = pct >= 90 ? 'Distinction' : pct >= 75 ? 'Merit' : pct >= 50 ? 'Pass' : 'Needs Improvement'
  const gradeColor = pct >= 90 ? '#FFCE00' : pct >= 75 ? '#DD0000' : pct >= 50 ? '#16a34a' : '#888'

  const timerDanger = timeLeft < 120
  const answered = Object.keys(answers).length

  return (
    <>
      <section className="section pt-8" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="german-stripe mb-8 rounded-full" />
          <div className="section-label">Students Only</div>
          <h1 className="font-display font-black text-5xl md:text-6xl mb-4" style={{ color: 'var(--text-primary)' }}>
            German Vocabulary Test
          </h1>
          <p className="text-xl max-w-2xl" style={{ color: 'var(--text-muted)' }}>
            Timed assessments prepared by your instructor. Login with your GLAB ID and batch to access your active test.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-2xl">

          {/* ── LOGIN ── */}
          {screen === 'login' && (
            <div className="card p-8">
              <h2 className="font-display font-bold text-2xl mb-6" style={{ color: 'var(--text-primary)' }}>Student Login</h2>
              <div className="flex flex-col gap-5">
                {[
                  { label: 'Full Name', icon: User, value: studentName, set: setStudentName, placeholder: 'e.g. Fatima Akter' },
                  { label: 'GLAB ID',  icon: Hash, value: glabId,      set: setGlabId,      placeholder: 'e.g. GLAB-2025-0042' },
                ].map(({ label, icon: Icon, value, set, placeholder }) => (
                  <div key={label}>
                    <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>{label}</label>
                    <div className="relative">
                      <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        value={value}
                        onChange={e => set(e.target.value)}
                        placeholder={placeholder}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
                        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                ))}

                <div>
                  <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Course &amp; Batch
                  </label>
                  <div className="relative">
                    <BookOpen size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <select
                      value={batchId}
                      onChange={e => setBatchId(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border text-sm outline-none appearance-none"
                      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: batchId ? 'var(--text-primary)' : 'var(--text-muted)' }}
                    >
                      <option value="">Select your course &amp; batch…</option>
                      {availableBatches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                    Format: Level–BatchNo–TimeSlot &nbsp;(e.g. A1-5th-Morning)
                  </p>
                </div>

                <button
                  onClick={handleLogin}
                  disabled={!studentName.trim() || !glabId.trim() || !batchId}
                  className="btn-primary mt-2 justify-center disabled:opacity-40"
                >
                  Find My Test
                </button>
              </div>
            </div>
          )}

          {/* ── NO TEST ── */}
          {screen === 'no-test' && (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(221,0,0,0.08)' }}>
                <AlertCircle size={28} style={{ color: '#DD0000' }} />
              </div>
              <h2 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>No Active Test</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                There is no active test for <strong>{batchId}</strong> right now. Your instructor will notify you when a test is available.
              </p>
              <button onClick={() => setScreen('login')} className="btn-primary mx-auto">
                <RotateCcw size={14} /> Try Again
              </button>
            </div>
          )}

          {/* ── READY ── */}
          {screen === 'ready' && activeTest && (
            <div className="card p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(221,0,0,0.08)' }}>
                  <BookOpen size={22} style={{ color: '#DD0000' }} />
                </div>
                <div>
                  <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{activeTest.title}</div>
                  <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{activeTest.batchId}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { label: 'Questions',  value: `${activeTest.questions.length}` },
                  { label: 'Time Limit', value: `${activeTest.duration} minutes` },
                  { label: 'Student',    value: studentName },
                  { label: 'GLAB ID',   value: glabId },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
                    <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{value}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl p-4 mb-6 text-sm" style={{ background: 'rgba(255,206,0,0.1)', border: '1px solid rgba(255,206,0,0.3)', color: 'var(--text-secondary)' }}>
                <strong>Instructions:</strong> Once you start, the timer begins immediately. You can navigate between questions freely. MCQ questions — select the correct option. Fill-in-the-blank — type the missing word. Translation — write in German. Answers are auto-scored when you submit or time runs out.
              </div>

              <button onClick={startTest} className="btn-primary w-full justify-center text-base py-4">
                <Clock size={16} /> Start Test – {activeTest.duration} min
              </button>
            </div>
          )}

          {/* ── TEST ── */}
          {screen === 'test' && activeTest && !submitted && (
            <div>
              {/* Timer + progress bar */}
              <div className="card p-4 mb-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    <span>{answered} / {questions.length} answered</span>
                    <span>{questions.length - answered} remaining</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${(answered / questions.length) * 100}%`, background: '#DD0000' }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 font-mono font-bold text-lg flex-shrink-0"
                  style={{ color: timerDanger ? '#DD0000' : 'var(--text-primary)' }}>
                  <Clock size={16} style={{ color: timerDanger ? '#DD0000' : 'var(--text-muted)' }} />
                  {formatTime(timeLeft)}
                </div>
              </div>

              {/* Question */}
              {(() => {
                const q = questions[currentQ]
                const userAns = answers[q.id] ?? ''
                return (
                  <div className="card p-6 mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                        {q.topic}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        Q {currentQ + 1} / {questions.length}
                      </span>
                    </div>

                    <div className="font-display text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {q.question}
                    </div>

                    {q.type === 'mcq' && q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {q.options.map(opt => (
                          <button key={opt} onClick={() => setAnswer(q.id, opt)}
                            className="px-4 py-3 rounded-xl border text-left text-sm font-medium transition-all"
                            style={{
                              background: userAns === opt ? '#DD0000' : 'var(--bg-secondary)',
                              color: userAns === opt ? 'white' : 'var(--text-secondary)',
                              borderColor: userAns === opt ? '#DD0000' : 'var(--border)',
                            }}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}

                    {(q.type === 'fill_blank' || q.type === 'translate') && (
                      <div>
                        <input
                          type="text"
                          value={userAns}
                          onChange={e => setAnswer(q.id, e.target.value)}
                          placeholder={q.type === 'translate' ? 'Type your German translation…' : 'Type the missing word…'}
                          className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter' && currentQ < questions.length - 1) setCurrentQ(q => q + 1)
                          }}
                        />
                        {q.type === 'translate' && (
                          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Tip: Umlaut shortcuts — ae=ä, oe=ö, ue=ü, ss=ß (accepted)</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Navigation */}
              <div className="flex items-center justify-between gap-3">
                <button onClick={() => setCurrentQ(q => q - 1)} disabled={currentQ === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all disabled:opacity-40"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--card-bg)' }}>
                  <ChevronLeft size={16} /> Previous
                </button>

                <div className="flex items-center gap-1 overflow-x-auto max-w-xs">
                  {questions.map((q, i) => (
                    <button key={q.id} onClick={() => setCurrentQ(i)}
                      className="w-7 h-7 rounded text-xs flex-shrink-0 font-mono transition-all"
                      style={{
                        background: i === currentQ ? '#DD0000' : answers[q.id] ? '#16a34a' : 'var(--border)',
                        color: (i === currentQ || answers[q.id]) ? 'white' : 'var(--text-muted)',
                      }}>
                      {i + 1}
                    </button>
                  ))}
                </div>

                {currentQ < questions.length - 1 ? (
                  <button onClick={() => setCurrentQ(q => q + 1)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--card-bg)' }}>
                    Next <ChevronRight size={16} />
                  </button>
                ) : (
                  <button onClick={submitTest}
                    className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
                    <Send size={14} /> Submit
                  </button>
                )}
              </div>

              <button onClick={submitTest}
                className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all"
                style={{ borderColor: '#DD0000', color: '#DD0000', background: 'rgba(221,0,0,0.04)' }}>
                <Send size={14} /> Submit Test ({answered}/{questions.length} answered)
              </button>
            </div>
          )}

          {/* ── RESULTS ── */}
          {screen === 'results' && activeTest && (
            <div>
              {/* Score card */}
              <div className="card p-8 text-center mb-6">
                <div className="german-stripe mb-6 rounded-full" />
                <div className="w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-4"
                  style={{ background: `${gradeColor}18`, border: `3px solid ${gradeColor}` }}>
                  <Trophy size={36} style={{ color: gradeColor }} />
                </div>
                <div className="font-display font-black text-6xl mb-1" style={{ color: gradeColor }}>{pct}%</div>
                <div className="font-bold text-xl mb-1" style={{ color: 'var(--text-primary)' }}>{grade}</div>
                <div className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                  {score} correct out of {total} questions &nbsp;·&nbsp; {studentName}
                </div>
                <div className="inline-block text-xs font-mono px-3 py-1 rounded-lg" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  {activeTest.title} · {activeTest.batchId}
                </div>
                <div className="german-stripe mt-6 rounded-full" />
              </div>

              {/* Answer review */}
              <div className="card p-6">
                <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>Answer Review</h3>
                <div className="flex flex-col gap-3">
                  {questions.map((q, i) => {
                    const ua = answers[q.id] ?? ''
                    const correct = isCorrect(q.answer, ua)
                    return (
                      <div key={q.id} className="rounded-xl p-4 flex gap-4 items-start"
                        style={{ background: correct ? 'rgba(22,163,74,0.06)' : 'rgba(221,0,0,0.06)', border: `1px solid ${correct ? 'rgba(22,163,74,0.2)' : 'rgba(221,0,0,0.2)'}` }}>
                        <div className="flex-shrink-0 mt-0.5">
                          {correct
                            ? <CheckCircle size={18} style={{ color: '#16a34a' }} />
                            : <XCircle size={18} style={{ color: '#DD0000' }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                            Q{i + 1} · {q.topic}
                          </div>
                          <div className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{q.question}</div>
                          <div className="flex flex-wrap gap-3 text-xs">
                            <span style={{ color: correct ? '#16a34a' : '#DD0000' }}>
                              Your answer: <strong>{ua || '(blank)'}</strong>
                            </span>
                            {!correct && (
                              <span style={{ color: '#16a34a' }}>
                                Correct: <strong>{q.answer}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <button onClick={() => { setScreen('login'); setStudentName(''); setGlabId(''); setBatchId('') }}
                className="btn-primary w-full mt-6 justify-center">
                <RotateCcw size={14} /> Take Another Test
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
