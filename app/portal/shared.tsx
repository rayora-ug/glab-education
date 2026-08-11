// Shared between /portal (existing students) and /results (A1 applicants) —
// the payment/proof/rules step is identical for both once someone has a
// GLAB ID and a batch to register for. Keeping this in one place means a
// future tweak (copy, validation, styling) only has to land once.
'use client'

import { useEffect, useState } from 'react'
import { Upload, Paperclip, Landmark, AlertTriangle, PauseCircle } from 'lucide-react'

export const WHATSAPP_CHANNEL = 'https://wa.me/message/72NY3RBASOPYI1'
export const MAX_FILE_BYTES = 3 * 1024 * 1024

// Reflects the admin panel's global registration on/off switch. This is
// purely a UX signal — the real enforcement happens server-side in
// submitRegistration_, so even if this check is skipped or stale, no
// registration can actually go through while the switch is off.
export function useRegistrationOpen() {
  const [open, setOpen] = useState<boolean | null>(null)
  useEffect(() => {
    fetch('/api/registration-status').then(r => r.json()).then(d => {
      if (d.success) setOpen(d.open)
    }).catch(() => setOpen(true))
  }, [])
  return open
}

export function RegistrationClosedBanner() {
  return (
    <div className="rounded-xl p-5 mb-6 flex items-start gap-3"
      style={{ background: 'rgba(221,0,0,0.08)', border: '1px solid rgba(221,0,0,0.25)' }}>
      <PauseCircle size={20} style={{ color: '#DD0000', flexShrink: 0, marginTop: 2 }} />
      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
        Registration is currently closed. Please check back later or contact GLAB for more information.
      </p>
    </div>
  )
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const paymentMethods = ['Bank (BD)', 'Bank (Germany/EU)', 'bKash']

export const BANK_DETAILS = [
  { label: 'Account Name', value: 'Md Rayhanur Rahman' },
  { label: 'Account Number', value: '1311010265627' },
  { label: 'Bank', value: 'Mutual Trust Bank Ltd.' },
  { label: 'Branch', value: 'Joydebpur (Gazipur)' },
]

export const COURSE_RULES = [
  'Once you have joined a specific batch, you cannot switch to another batch for any reason.',
  'You may cancel your registration for a full refund only within 3 calendar days of the date you registered — regardless of whether classes have started. After this 3-day window, no cancellation or refund is possible, even if you have not attended any classes.',
  'Please register only if you are fully committed to completing the course.',
  'A change of mind, personal reasons, or a lack of time does not qualify for a refund or batch change once the 3-day window has closed.',
  'If you wish to join a different batch, you must complete a new registration and pay the full course fee again.',
  'Keeping your video camera on during every class is mandatory.',
  'If you miss a total of 5 classes and/or homework submissions, you will be removed from the course without further notice.',
]

export const STATUS_INFO: Record<string, string> = {
  Submitted: 'Your registration has been submitted successfully and is awaiting payment verification. Your class links will become available on MyGLAB once your registration has been confirmed.',
  Confirmed: 'Your payment has been verified and your registration has been confirmed successfully. You can now access your batch’s class links on MyGLAB.',
}

export type Registration = {
  batchId: string
  course: string
  status: string
  timestamp: string | null
  whatsappLink?: string | null
  classroomLink?: string | null
  meetLink?: string | null
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function validateProofFile(f: File | null): string {
  if (!f) return ''
  if (!/^image\//.test(f.type) && f.type !== 'application/pdf') return 'Please upload an image or a PDF.'
  if (f.size > MAX_FILE_BYTES) return 'File is too large (max 3MB).'
  return ''
}

export function PaymentInfoCard() {
  return (
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
  )
}

export function PaymentAndRulesFields({
  paymentMethod, setPaymentMethod,
  paymentReference, setPaymentReference,
  file, fileError, onFileChange,
  feedback, setFeedback,
}: {
  paymentMethod: string
  setPaymentMethod: (v: string) => void
  paymentReference: string
  setPaymentReference: (v: string) => void
  file: File | null
  fileError: string
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  feedback: string
  setFeedback: (v: string) => void
}) {
  return (
    <>
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
          <input type="file" accept="image/*,application/pdf" onChange={onFileChange} className="hidden" />
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

      <div className="rounded-xl p-5" style={{ background: 'rgba(221,0,0,0.05)', border: '1px solid rgba(221,0,0,0.2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} style={{ color: '#DD0000' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>GLAB Course Rules</span>
        </div>
        <ol className="text-sm space-y-1.5 mb-4 pl-5" style={{ color: 'var(--text-muted)', listStyleType: 'decimal' }}>
          {COURSE_RULES.map((rule, i) => <li key={i}>{rule}</li>)}
        </ol>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" required className="mt-0.5" style={{ width: 16, height: 16, flexShrink: 0 }} />
          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
            I understand that the course fee is refundable only if I cancel within 3 calendar days of registering, and that after this window, no exceptions will be made due to a change of mind, personal circumstances, or discontinuing the course.
          </span>
        </label>
      </div>
    </>
  )
}
