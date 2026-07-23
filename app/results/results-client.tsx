'use client'

import { useState } from 'react'
import {
  Search, ShieldCheck, ShieldX, PartyPopper, CheckCircle, Clock,
  MessageCircle, RotateCcw, Info,
} from 'lucide-react'
import {
  WHATSAPP_CHANNEL, STATUS_INFO, fileToBase64, validateProofFile,
  PaymentInfoCard, PaymentAndRulesFields, type Registration,
} from '../portal/shared'

export default function ResultsPage() {
  const [step, setStep] = useState<'lookup' | 'form' | 'status'>('lookup')

  const [email, setEmail] = useState('')
  const [dob, setDob] = useState('')
  const [checking, setChecking] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [resultMessage, setResultMessage] = useState<{ kind: 'pending' | 'not_selected'; text: string | string[] } | null>(null)

  const [applicantName, setApplicantName] = useState('')
  const [glabId, setGlabId] = useState('')
  const [confirmedBatch, setConfirmedBatch] = useState('')
  const [registration, setRegistration] = useState<Registration | null>(null)

  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [feedback, setFeedback] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const handleCheck = async () => {
    if (!email.trim() || !dob) return
    setChecking(true)
    setLookupError('')
    setResultMessage(null)
    try {
      const res = await fetch('/api/results/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, dob }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Something went wrong. Please try again.')

      if (!data.found) {
        setLookupError(`We couldn't find an application with these details.`)
        return
      }
      if (data.status === 'pending') {
        setResultMessage({ kind: 'pending', text: `Your application is still under review. We'll announce results on Facebook and WhatsApp, so check back soon.` })
        return
      }
      if (data.status === 'not_selected') {
        setResultMessage({
          kind: 'not_selected',
          text: [
            'Thank you for your interest in joining the GLAB Foundation + A1 Intensive course.',
            'After carefully reviewing all applications, we regret to inform you that you have not been selected for this session.',
            'Due to the limited number of seats, not all applicants can be accommodated.',
            'We sincerely appreciate your interest in GLAB and encourage you to apply again in a future session.',
            'Thank you for your understanding, and we wish you all the best in your German language learning journey.',
          ],
        })
        return
      }

      // Selected — check whether they've already registered before showing the form.
      setApplicantName(data.name)
      setGlabId(data.glabId)
      setConfirmedBatch(data.confirmedBatch)

      const lookupRes = await fetch('/api/portal/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ glabId: data.glabId }),
      })
      const lookupData = await lookupRes.json()
      if (lookupData.success && lookupData.registration) {
        setRegistration(lookupData.registration)
        setStep('status')
      } else {
        setStep('form')
      }
    } catch (err: any) {
      setLookupError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    const error = validateProofFile(f)
    setFileError(error)
    setFile(error ? null : f)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setFileError('Please attach your payment proof.')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const fileBase64 = await fileToBase64(file)
      const res = await fetch('/api/portal/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          glabId, course: confirmedBatch, batchId: confirmedBatch, paymentMethod, paymentReference, feedback,
          fileBase64, fileName: file.name, fileMimeType: file.type,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Something went wrong. Please try again.')
      setRegistration({
        batchId: confirmedBatch,
        course: confirmedBatch,
        status: 'Submitted',
        timestamp: new Date().toISOString(),
        whatsappLink: null,
      })
      setStep('status')
    } catch (err: any) {
      setSubmitError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setStep('lookup')
    setEmail('')
    setDob('')
    setLookupError('')
    setResultMessage(null)
    setApplicantName('')
    setGlabId('')
    setConfirmedBatch('')
    setRegistration(null)
    setPaymentMethod('')
    setPaymentReference('')
    setFeedback('')
    setFile(null)
    setFileError('')
    setSubmitError('')
  }

  return (
    <>
      <section className="section pt-8" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="german-stripe mb-8 rounded-full" />
          <div className="section-label">A1 Applicants</div>
          <h1 className="font-display font-black text-5xl md:text-6xl mb-4" style={{ color: 'var(--text-primary)' }}>
            Application Results
          </h1>
          <p className="text-xl max-w-2xl" style={{ color: 'var(--text-muted)' }}>
            Check whether you were selected using the email and date of birth from your application, and if you were, register right here.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-2xl mx-auto">
          {step === 'lookup' && (
            <div className="card p-8 md:p-10">
              <div className="space-y-4 mb-2">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    className="input"
                  />
                </div>
                <button
                  onClick={handleCheck}
                  disabled={checking || !email.trim() || !dob}
                  className="btn-primary w-full justify-center flex items-center gap-2 disabled:opacity-50"
                >
                  {checking ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search size={16} />
                  )}
                  Check My Result
                </button>
              </div>

              {lookupError && (
                <div className="mt-5 rounded-xl p-5 flex items-start gap-3"
                  style={{ background: 'rgba(221,0,0,0.1)', border: '1px solid rgba(221,0,0,0.3)', borderLeft: '4px solid #DD0000' }}>
                  <ShieldX size={22} style={{ color: '#DD0000', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p className="text-base font-semibold" style={{ color: '#DD0000' }}>{lookupError}</p>
                    <p className="text-base mt-1" style={{ color: 'var(--text-primary)' }}>
                      Double-check the email and date of birth you applied with, or{' '}
                      <a href={WHATSAPP_CHANNEL} target="_blank" rel="noopener noreferrer" className="underline font-semibold" style={{ color: '#DD0000' }}>
                        reach us on WhatsApp
                      </a>.
                    </p>
                  </div>
                </div>
              )}

              {resultMessage && (
                <div className="mt-5 rounded-xl p-5 flex items-start gap-3"
                  style={{ background: 'rgba(255,206,0,0.12)', border: '1px solid rgba(255,206,0,0.4)', borderLeft: '4px solid #B8920A' }}>
                  <Info size={22} style={{ color: '#B8920A', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                      {resultMessage.kind === 'pending' ? 'Still Under Review' : 'Not Selected This Round'}
                    </p>
                    {(Array.isArray(resultMessage.text) ? resultMessage.text : [resultMessage.text]).map((paragraph, i) => (
                      <p key={i} className="text-base mt-2 first:mt-0" style={{ color: 'var(--text-primary)' }}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              )}

              {(lookupError || resultMessage) && (
                <div className="mt-5">
                  <button onClick={resetForm} className="text-sm underline inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <RotateCcw size={13} /> Back to Start
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'form' && (
            <div className="card p-8 md:p-10">
              <div className="flex items-center justify-between gap-3 mb-8 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(22,163,74,0.1)' }}>
                    <PartyPopper size={20} style={{ color: '#16a34a' }} />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Congratulations</div>
                    <div className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>{applicantName}</div>
                  </div>
                </div>
                <button onClick={resetForm} className="text-sm underline inline-flex items-center gap-1.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                  <RotateCcw size={13} /> Back to Start
                </button>
              </div>

              <div className="rounded-xl p-5 mb-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div className="text-sm mb-1">
                  <span style={{ color: 'var(--text-muted)' }}>Your GLAB ID: </span>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{glabId}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>(save this: you'll use it to check status and register for future courses)</span>
                </div>
                <div className="text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Your Batch: </span>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{confirmedBatch}</span>
                </div>
              </div>

              <PaymentInfoCard />

              <form onSubmit={handleSubmit} className="space-y-5">
                <PaymentAndRulesFields
                  paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
                  paymentReference={paymentReference} setPaymentReference={setPaymentReference}
                  file={file} fileError={fileError} onFileChange={handleFileChange}
                  feedback={feedback} setFeedback={setFeedback}
                />

                {submitError && (
                  <p className="text-sm" style={{ color: '#DD0000' }}>{submitError}</p>
                )}

                <button type="submit" disabled={submitting} className="btn-primary w-full justify-center text-base py-3.5 disabled:opacity-60">
                  {submitting ? 'Submitting...' : 'Submit Registration'}
                </button>
              </form>
            </div>
          )}

          {step === 'status' && registration && (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
                style={{ background: registration.status === 'Confirmed' ? 'rgba(22,163,74,0.1)' : 'rgba(255,206,0,0.15)' }}>
                {registration.status === 'Confirmed' ? (
                  <CheckCircle size={32} style={{ color: '#16a34a' }} />
                ) : (
                  <Clock size={32} style={{ color: '#B8920A' }} />
                )}
              </div>
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Welcome back, {applicantName}</div>
              <h2 className="font-display font-bold text-2xl mb-3" style={{ color: 'var(--text-primary)' }}>
                {registration.status}
              </h2>
              <p className="mb-4 max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
                {STATUS_INFO[registration.status] || 'Contact us on WhatsApp for the latest update on your registration.'}
              </p>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                Registered for: <strong style={{ color: 'var(--text-primary)' }}>{registration.course}</strong>
              </p>

              {registration.status === 'Confirmed' && (
                registration.whatsappLink ? (
                  <a href={registration.whatsappLink} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-2">
                    <MessageCircle size={16} /> Join WhatsApp Group
                  </a>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Your WhatsApp group link will be added shortly. Check back soon.
                  </p>
                )
              )}

              <div className="mt-6">
                <button onClick={resetForm} className="text-sm underline inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <RotateCcw size={13} /> Back to Start
                </button>
              </div>
            </div>
          )}

          {(step === 'form' || step === 'status') && (
            <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
              <ShieldCheck size={14} className="inline mr-1" style={{ color: '#16a34a' }} />
              Verified against GLAB's application records
            </p>
          )}
        </div>
      </section>
    </>
  )
}
