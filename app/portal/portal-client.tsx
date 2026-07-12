'use client'

import { useState } from 'react'
import {
  Search, ShieldCheck, ShieldX, UserCheck, Upload, CheckCircle, Clock,
  MessageCircle, Paperclip, Landmark, RotateCcw
} from 'lucide-react'
import coursesData from '../../data/courses.json'

const paymentMethods = ['Bank (BD)', 'Bank (Germany/EU)', 'bKash']
const MAX_FILE_BYTES = 3 * 1024 * 1024
const WHATSAPP_CHANNEL = 'https://wa.me/message/72NY3RBASOPYI1'

const BANK_DETAILS = [
  { label: 'Account Name', value: 'Md Rayhanur Rahman' },
  { label: 'Account Number', value: '1311010265627' },
  { label: 'Bank', value: 'Mutual Trust Bank Ltd.' },
  { label: 'Branch', value: 'Joydebpur (Gazipur)' },
]

const STATUS_INFO: Record<string, string> = {
  Submitted: 'Your registration has been submitted successfully and is awaiting payment verification. The WhatsApp group link will become available after your registration has been confirmed.',
  Confirmed: 'Your payment has been verified and your registration has been confirmed successfully. You can now join your batch’s official WhatsApp group.',
}

type Registration = {
  batchId: string
  course: string
  status: string
  timestamp: string | null
  whatsappLink?: string | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const openCourses = (coursesData as any[]).filter(
  c => c.registrationOpen && c.level !== 'Pre-A1' && c.level !== 'A1'
)

const batchOptions = openCourses.flatMap((c: any) =>
  (c.batches || []).map((b: any) => ({
    id: b.id,
    courseTitle: c.title,
    label: `${c.title} — ${b.label}`,
    optionText: `${c.title} — ${b.label} · ${b.schedule} · Starts ${formatDate(b.startDate)} · ${c.fee}`,
  }))
)

// B1-eligible students are almost always registering for B1, not repeating A2 — list those batches first.
function orderBatchesForEligibility(batches: typeof batchOptions, eligible: string[]) {
  return batches
    .filter(b => eligible.includes(b.courseTitle))
    .sort((a, b) => (a.courseTitle === 'B1 Intensive' ? 0 : 1) - (b.courseTitle === 'B1 Intensive' ? 0 : 1))
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function PortalPage() {
  const [step, setStep] = useState<'id' | 'form' | 'status'>('id')

  const [glabId, setGlabId] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [studentName, setStudentName] = useState('')
  const [eligibleCourses, setEligibleCourses] = useState<string[]>([])
  const [registration, setRegistration] = useState<Registration | null>(null)

  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [feedback, setFeedback] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const studentBatchOptions = orderBatchesForEligibility(batchOptions, eligibleCourses)
  const registeredBatch = registration ? batchOptions.find(b => b.id === registration.batchId) : null

  const handleVerify = async () => {
    if (!glabId.trim()) return
    setVerifying(true)
    setVerifyError('')
    try {
      const res = await fetch('/api/portal/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ glabId }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Something went wrong. Please try again.')
      if (!data.found) {
        setVerifyError(`We couldn't find "${glabId}" in our records.`)
      } else if (data.registration) {
        setStudentName(data.name)
        setRegistration(data.registration)
        setStep('status')
      } else {
        const eligible: string[] = data.eligibleCourses || []
        const available = orderBatchesForEligibility(batchOptions, eligible)
        if (available.length === 0) {
          setVerifyError(`You're not marked as eligible to register for any course yet.`)
        } else {
          setStudentName(data.name)
          setEligibleCourses(eligible)
          setSelectedBatchId(available[0].id)
          setStep('form')
        }
      }
    } catch (err: any) {
      setVerifyError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setFileError('')
    if (f && !/^image\//.test(f.type) && f.type !== 'application/pdf') {
      setFileError('Please upload an image or a PDF.')
      setFile(null)
      return
    }
    if (f && f.size > MAX_FILE_BYTES) {
      setFileError('File is too large (max 3MB).')
      setFile(null)
      return
    }
    setFile(f)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setFileError('Please attach your payment proof.')
      return
    }
    const selectedBatch = batchOptions.find(b => b.id === selectedBatchId)
    if (!selectedBatch) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const fileBase64 = await fileToBase64(file)
      const res = await fetch('/api/portal/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          glabId, course: selectedBatch.label, batchId: selectedBatch.id, paymentMethod, paymentReference, feedback,
          fileBase64, fileName: file.name, fileMimeType: file.type,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Something went wrong. Please try again.')
      setRegistration({
        batchId: selectedBatch.id,
        course: selectedBatch.label,
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
    setStep('id')
    setGlabId('')
    setVerifyError('')
    setStudentName('')
    setEligibleCourses([])
    setRegistration(null)
    setSelectedBatchId('')
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
          <div className="section-label">Existing Students</div>
          <h1 className="font-display font-black text-5xl md:text-6xl mb-4" style={{ color: 'var(--text-primary)' }}>
            Student Portal
          </h1>
          <p className="text-xl max-w-2xl" style={{ color: 'var(--text-muted)' }}>
            Already a GLAB student? Register for your next course with just your GLAB ID — no need to fill out a new form.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-2xl mx-auto">
          {step === 'id' && (
            <div className="card p-8 md:p-10">
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Your GLAB ID
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={glabId}
                  onChange={e => setGlabId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleVerify()}
                  placeholder="e.g. GLAB26H057"
                  className="input flex-1"
                />
                <button
                  onClick={handleVerify}
                  disabled={verifying || !glabId.trim()}
                  className="btn-primary flex items-center gap-2 px-6 disabled:opacity-50"
                >
                  {verifying ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search size={16} />
                  )}
                  Verify
                </button>
              </div>

              {verifyError && (
                <div className="mt-5 rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(221,0,0,0.08)', border: '1px solid rgba(221,0,0,0.2)' }}>
                  <ShieldX size={18} style={{ color: '#DD0000', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#DD0000' }}>{verifyError}</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                      If you think this is a mistake,{' '}
                      <a href={WHATSAPP_CHANNEL} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#DD0000' }}>
                        reach us on WhatsApp
                      </a>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'id' && (
            <div className="card p-6 mt-6">
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Registration status guide</h3>
              <div className="space-y-4">
                {Object.entries(STATUS_INFO).map(([status, info]) => (
                  <div key={status}>
                    <div className="text-sm font-semibold" style={{ color: '#DD0000' }}>{status}</div>
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{info}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'form' && (
            <div className="card p-8 md:p-10">
              <div className="flex items-center gap-3 mb-8 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(22,163,74,0.1)' }}>
                  <UserCheck size={20} style={{ color: '#16a34a' }} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Welcome back</div>
                  <div className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>{studentName}</div>
                </div>
              </div>

              {studentBatchOptions.length === 0 ? (
                <div className="text-center py-6">
                  <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
                    Registration isn't open for any course you're eligible for right now. We'll announce it on WhatsApp as soon as it opens.
                  </p>
                  <a href={WHATSAPP_CHANNEL} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-2">
                    <MessageCircle size={16} /> Join WhatsApp Community
                  </a>
                </div>
              ) : (
                <>
                  <div className="rounded-xl p-5 mb-6" style={{ background: 'rgba(255,206,0,0.08)', border: '1px solid rgba(255,206,0,0.3)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Landmark size={16} style={{ color: '#B8920A' }} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Send Your Payment</span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mb-3">
                      {BANK_DETAILS.map(({ label, value }) => (
                        <div key={label} className="text-sm">
                          <span style={{ color: 'var(--text-muted)' }}>{label}: </span>
                          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Please send your payment to the account above first. Once done, fill in the payment source and upload your proof below to complete your registration.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Batch</label>
                      <select value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)} required className="input">
                        {studentBatchOptions.map(b => <option key={b.id} value={b.id}>{b.optionText}</option>)}
                      </select>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Paying From</label>
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} required className="input">
                          <option value="" disabled>Select payment source</option>
                          {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                          Payment Reference <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                        </label>
                        <input type="text" value={paymentReference} onChange={e => setPaymentReference(e.target.value)}
                          placeholder="Transaction ID" className="input" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Payment Proof</label>
                      <label className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors"
                        style={{ borderColor: 'var(--border)' }}>
                        <Upload size={18} style={{ color: 'var(--text-muted)' }} />
                        <span className="text-sm flex-1" style={{ color: file ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {file ? file.name : 'Upload a screenshot or PDF of your payment (max 3MB)'}
                        </span>
                        {file && <Paperclip size={14} style={{ color: 'var(--text-muted)' }} />}
                        <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" />
                      </label>
                      {fileError && <p className="text-sm mt-2" style={{ color: '#DD0000' }}>{fileError}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                        Feedback <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                      </label>
                      <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={3}
                        placeholder="Anything you'd like us to know?" className="input" style={{ resize: 'vertical' }} />
                    </div>

                    {submitError && (
                      <p className="text-sm" style={{ color: '#DD0000' }}>{submitError}</p>
                    )}

                    <button type="submit" disabled={submitting} className="btn-primary w-full justify-center text-base py-3.5 disabled:opacity-60">
                      {submitting ? 'Submitting...' : 'Submit Registration'}
                    </button>
                  </form>
                </>
              )}
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
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Welcome back, {studentName}</div>
              <h2 className="font-display font-bold text-2xl mb-3" style={{ color: 'var(--text-primary)' }}>
                {registration.status}
              </h2>
              <p className="mb-4 max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
                {STATUS_INFO[registration.status] || 'Contact us on WhatsApp for the latest update on your registration.'}
              </p>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                Registered for: <strong style={{ color: 'var(--text-primary)' }}>{registeredBatch?.label || registration.course}</strong>
              </p>

              {registration.status === 'Confirmed' && (
                registration.whatsappLink ? (
                  <a href={registration.whatsappLink} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-2">
                    <MessageCircle size={16} /> Join WhatsApp Group
                  </a>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Your WhatsApp group link will be added shortly — check back soon.
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
              Verified against GLAB's student records
            </p>
          )}
        </div>
      </section>
    </>
  )
}
