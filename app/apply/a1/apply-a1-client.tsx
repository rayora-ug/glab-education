'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Send, CheckCircle, ClipboardCheck, AlertTriangle, CalendarClock } from 'lucide-react'
import coursesData from '../../../data/courses.json'
import { formatDate, useA1ApplicationOpen, A1ApplicationClosedBanner } from '../../portal/shared'

// Students kept asking about course details/dates after already applying —
// they'd either missed the announcement or forgotten it by the time they
// filled the form. This mirrors the announcement's info directly on the
// form itself so it can't be missed.
const APPLICATION_DEADLINE = '2026-09-10'

const a1Course = (coursesData as any[]).find(c => c.level === 'A1')
const batchOptions = [
  { value: 'Flexible (Morning or Evening)', label: 'Flexible (Morning or Evening)' },
  ...((a1Course?.batches || []).map((b: any) => ({ value: `${a1Course.title} — ${b.label}`, label: `${b.label} — ${b.schedule}` }))),
]

const HOW_HEARD_OPTIONS = ['Facebook Page', 'Facebook Group', 'Friend / Family', 'Previous GLAB Student', 'YouTube', 'Google Search', 'Other']
const PRIMARY_GOAL_OPTIONS = ['Phd in Germany', 'Masters in Germany', 'Bachelor in Germany', 'Ausbildung', 'Spouse Visa', 'Career in Germany', 'NOT for German Visa']

const APPLICATION_RULES = [
  "This application doesn't guarantee you a slot for this course. Only if you are selected, you will see your name on the published selected list and receive the registration form via WhatsApp.",
  'Submitting multiple applications for the same person may result in your application not being considered.',
  'In case you are not selected, you have to wait for the next session to apply again.',
  'This course is interactive. Not only attending the classes is mandatory, but also the homework in every class.',
  'Once you have joined a specific batch, you cannot switch the batch for any reason.',
  'If you are selected, no cancellation or switching the batch is possible after you have done the registration, even if you have not attended any class.',
  'Keeping your video camera on during every class is mandatory.',
  'If you miss more than 4 classes and/or homework submissions in total, you will be eliminated from the course without further notice.',
  'All communication regarding your application, selection result, and registration will be sent via WhatsApp — please make sure your WhatsApp number is active.',
]

export default function ApplyA1Page() {
  const applicationOpen = useA1ApplicationOpen()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [facebookLink, setFacebookLink] = useState('')
  const [dob, setDob] = useState('')
  const [occupation, setOccupation] = useState('')
  const [city, setCity] = useState('')
  const [batchChoice, setBatchChoice] = useState('')

  const [previousExperience, setPreviousExperience] = useState('')
  const [previousCourseDetails, setPreviousCourseDetails] = useState('')
  const [previousCourseCompleted, setPreviousCourseCompleted] = useState('')

  const [motivation, setMotivation] = useState('')
  const [whyGlab, setWhyGlab] = useState('')
  const [howHeard, setHowHeard] = useState('')
  const [primaryGoal, setPrimaryGoal] = useState('')
  const [comment, setComment] = useState('')

  const [agreedToRules, setAgreedToRules] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const canSubmit = applicationOpen !== false && name.trim() && email.trim() && whatsappNumber.trim() && dob && occupation.trim()
    && city.trim() && batchChoice && motivation.trim() && whyGlab.trim() && howHeard && primaryGoal
    && (previousExperience !== 'yes' || previousCourseDetails.trim()) && agreedToRules

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/apply/a1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, whatsappNumber, facebookLink, dob, occupation, city, batchChoice,
          previousExperience, previousCourseDetails, previousCourseCompleted,
          motivation, whyGlab, howHeard, primaryGoal, comment, agreedToRules,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Something went wrong. Please try again.')
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="section pt-8">
      <div className="container max-w-2xl mx-auto">
        <div className="german-stripe mb-8 rounded-full" />
        <div className="section-label">New Applicant</div>
        <h1 className="font-display font-black text-5xl md:text-6xl mb-4" style={{ color: 'var(--text-primary)' }}>
          Apply for A1 Intensive
        </h1>
        <p className="text-xl mb-6" style={{ color: 'var(--text-muted)' }}>
          Fill in your details below. We'll review your application and email you once results are announced.
        </p>

        <div className="card p-5 mb-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
          <div>
            <div className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              {a1Course?.title} — {a1Course?.duration}, {a1Course?.fee}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5 mt-1">
              {(a1Course?.batches || []).map((b: any) => (
                <div key={b.id} className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {b.label} — Starts {formatDate(b.startDate)}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:flex-col sm:items-end shrink-0 rounded-lg px-4 py-2 sm:py-3"
            style={{ background: 'rgba(221,0,0,0.08)', border: '1px solid rgba(221,0,0,0.25)' }}>
            <div className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: '#DD0000' }}>
              <CalendarClock size={13} /> Application Deadline
            </div>
            <div className="font-display font-black text-2xl leading-none" style={{ color: '#DD0000' }}>
              {formatDate(APPLICATION_DEADLINE)}
            </div>
          </div>
        </div>

        {submitted ? (
          <div className="card p-8 md:p-10 text-center">
            <CheckCircle size={40} style={{ color: '#16a34a' }} className="mx-auto mb-4" />
            <h2 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>
              Application received!
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              We'll review your application and email you at <strong>{email}</strong> once results are announced.
              You can also check your status anytime using the same email and WhatsApp number.
            </p>
            <Link href="/results" className="btn-secondary inline-flex items-center gap-2">
              <ClipboardCheck size={16} /> Check Application Status
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {applicationOpen === false && <A1ApplicationClosedBanner />}
            <div className="card p-8 md:p-10 space-y-4">
              <h2 className="font-display font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Which batch would you like to join?</h2>
              <select value={batchChoice} onChange={e => setBatchChoice(e.target.value)} className="input">
                <option value="" disabled>Select a batch</option>
                {batchOptions.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Choosing "Flexible" increases your chances of getting a slot.
              </p>
            </div>

            <div className="card p-8 md:p-10 space-y-4">
              <h2 className="font-display font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Personal Information</h2>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" className="input" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>WhatsApp Number (including country code)</label>
                <input type="tel" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="+880..." className="input" />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  This is how we'll reach you about your application — and, along with your email, how you'll check your result later.
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="input" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Facebook Profile Link (optional)</label>
                <input type="text" value={facebookLink} onChange={e => setFacebookLink(e.target.value)} placeholder="facebook.com/..." className="input" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Date of Birth</label>
                <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="input" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Current Occupation</label>
                <input type="text" value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="Student, Software Engineer, ..." className="input" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Current City</label>
                <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Dhaka" className="input" />
              </div>
            </div>

            <div className="card p-8 md:p-10 space-y-4">
              <h2 className="font-display font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Previous Experience with GLAB</h2>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Have you previously attended a course at GLAB?</label>
                <div className="flex gap-4">
                  {['No', 'Yes'].map(opt => (
                    <label key={opt} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                      <input
                        type="radio"
                        name="previousExperience"
                        checked={previousExperience === opt.toLowerCase()}
                        onChange={() => setPreviousExperience(opt.toLowerCase())}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
              {previousExperience === 'yes' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Which course (level & batch) was it?</label>
                    <input type="text" value={previousCourseDetails} onChange={e => setPreviousCourseDetails(e.target.value)} placeholder="e.g. A1 Intensive, 35th Batch" className="input" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Did you complete the course?</label>
                    <div className="flex gap-4">
                      {['Yes', 'No'].map(opt => (
                        <label key={opt} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                          <input
                            type="radio"
                            name="previousCourseCompleted"
                            checked={previousCourseCompleted === opt.toLowerCase()}
                            onChange={() => setPreviousCourseCompleted(opt.toLowerCase())}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="card p-8 md:p-10 space-y-4">
              <h2 className="font-display font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Motivation</h2>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>What motivates you to learn German?</label>
                <textarea value={motivation} onChange={e => setMotivation(e.target.value)} rows={3} className="input" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Why do you want to learn from GLAB?</label>
                <textarea value={whyGlab} onChange={e => setWhyGlab(e.target.value)} rows={3} className="input" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>How do you know about GLAB?</label>
                <select value={howHeard} onChange={e => setHowHeard(e.target.value)} className="input">
                  <option value="" disabled>Select one</option>
                  {HOW_HEARD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>What is your primary goal?</label>
                <select value={primaryGoal} onChange={e => setPrimaryGoal(e.target.value)} className="input">
                  <option value="" disabled>Select one</option>
                  {PRIMARY_GOAL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Comment (optional)</label>
                <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} className="input" />
              </div>
            </div>

            <div className="rounded-xl p-6" style={{ background: 'rgba(221,0,0,0.05)', border: '1px solid rgba(221,0,0,0.2)' }}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} style={{ color: '#DD0000' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Course Rules</span>
              </div>
              <ul className="space-y-1.5 mb-4">
                {APPLICATION_RULES.map((rule, i) => (
                  <li key={i} className="text-xs flex gap-2" style={{ color: 'var(--text-muted)' }}>
                    <span>•</span><span>{rule}</span>
                  </li>
                ))}
              </ul>
              <label className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                <input type="checkbox" checked={agreedToRules} onChange={e => setAgreedToRules(e.target.checked)} className="mt-1" />
                I read the course rules carefully and agree with all the terms and conditions.
              </label>
            </div>

            {error && <p className="text-sm" style={{ color: '#DD0000' }}>{error}</p>}

            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="btn-primary w-full justify-center flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={16} />
              )}
              {applicationOpen === false ? 'Applications Closed' : 'Submit Application'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
