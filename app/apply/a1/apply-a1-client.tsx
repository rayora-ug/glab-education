'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Send, CheckCircle, ClipboardCheck } from 'lucide-react'

export default function ApplyA1Page() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [dob, setDob] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !dob) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/apply/a1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, dob, phone }),
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
        <p className="text-xl mb-10" style={{ color: 'var(--text-muted)' }}>
          Fill in your details below. We'll review your application and email you once results are announced.
        </p>

        {submitted ? (
          <div className="card p-8 md:p-10 text-center">
            <CheckCircle size={40} style={{ color: '#16a34a' }} className="mx-auto mb-4" />
            <h2 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>
              Application received!
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              We'll review your application and email you at <strong>{email}</strong> once results are announced.
              You can also check your status anytime using the same email and date of birth.
            </p>
            <Link href="/results" className="btn-secondary inline-flex items-center gap-2">
              <ClipboardCheck size={16} /> Check Application Status
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card p-8 md:p-10 space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                You'll use this, along with your date of birth, to check your result later — so make sure it's correct.
              </p>
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
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Phone / WhatsApp (optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+880..."
                className="input"
              />
            </div>

            {error && <p className="text-sm" style={{ color: '#DD0000' }}>{error}</p>}

            <button
              type="submit"
              disabled={submitting || !name.trim() || !email.trim() || !dob}
              className="btn-primary w-full justify-center flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Submit Application
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
