'use client'

import Link from 'next/link'
import { UserPlus, RotateCcw, ClipboardCheck, LogIn } from 'lucide-react'

export default function ApplyPage() {
  return (
    <section className="section pt-8">
      <div className="container">
        <div className="german-stripe mb-8 rounded-full" />
        <div className="section-label">Get Started</div>
        <h1 className="font-display font-black text-5xl md:text-6xl mb-4" style={{ color: 'var(--text-primary)' }}>
          Apply to GLAB
        </h1>
        <p className="text-xl max-w-2xl mb-12" style={{ color: 'var(--text-muted)' }}>
          Choose the path that matches where you are — whether you're applying for the first time or continuing to your next level.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="card p-8 flex flex-col">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: 'rgba(221,0,0,0.1)', color: '#DD0000' }}>
              <UserPlus size={22} />
            </div>
            <h2 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>
              New Applicant (A1)
            </h2>
            <p className="text-sm mb-6 flex-1" style={{ color: 'var(--text-muted)' }}>
              Applying for the first time? Submit your A1 application from the Courses page, then come back here to check your result and complete registration once selected.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/results" className="btn-primary w-full justify-center">
                <ClipboardCheck size={16} /> Check Application Status
              </Link>
            </div>
          </div>

          <div className="card p-8 flex flex-col">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: 'rgba(255,206,0,0.12)', color: '#B8920A' }}>
              <RotateCcw size={22} />
            </div>
            <h2 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>
              A2 / B1 Registration
            </h2>
            <p className="text-sm mb-6 flex-1" style={{ color: 'var(--text-muted)' }}>
              Already have a GLAB ID? Access the Student Portal to choose your batch and complete your registration.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/portal" className="btn-primary w-full justify-center">
                <LogIn size={16} /> Go to Student Portal
              </Link>
            </div>
          </div>
        </div>

        <p className="text-xs max-w-2xl" style={{ color: 'var(--text-muted)' }}>
          We're building the full application process directly into the website — soon you'll be able to apply for A1 right here as well.
        </p>
      </div>
    </section>
  )
}
