'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Clock, CheckCircle, ExternalLink, Bell, MessageCircle } from 'lucide-react'
import registrationData from '../../data/registration.json'

function Countdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now()
      if (diff <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [targetDate])

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 my-10">
      {[['Days', timeLeft.days], ['Hours', timeLeft.hours], ['Minutes', timeLeft.minutes], ['Seconds', timeLeft.seconds]].map(([label, val]) => (
        <div key={label as string} className="text-center">
          <div className="card p-6 mb-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1" style={{background:'linear-gradient(to right,#000,#DD0000,#FFCE00)'}} />
            <div className="font-display font-black text-center" style={{fontSize:'clamp(2.5rem,8vw,5rem)',lineHeight:1,background:'linear-gradient(135deg,var(--text-primary),#DD0000)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>
              {String(val).padStart(2, '0')}
            </div>
          </div>
          <div className="font-mono text-sm uppercase tracking-widest" style={{color:'var(--text-muted)'}}>{label}</div>
        </div>
      ))}
    </div>
  )
}

export default function RegistrationPage() {
  const reg = registrationData as any
  const isOpen = reg.registrationOpen

  return (
    <>
      <section className="section pt-8" style={{background:'var(--bg-secondary)'}}>
        <div className="container">
          <div className="german-stripe mb-8 rounded-full" />
          <div className="section-label">Enrollment</div>
          <h1 className="font-display font-black text-5xl md:text-6xl mb-4" style={{color:'var(--text-primary)'}}>
            {isOpen ? 'Registration Open' : 'Registration'}
          </h1>
          <p className="text-xl" style={{color:'var(--text-muted)'}}>
            {isOpen ? `Enroll now for the ${reg.currentBatch} batch.` : `Next batch: ${reg.nextBatch}`}
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-4xl mx-auto">
          {isOpen ? (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-sm font-semibold" style={{background:'rgba(34,197,94,0.1)',color:'#16a34a',border:'1px solid rgba(34,197,94,0.2)'}}>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Registration is Currently OPEN
              </div>
              <h2 className="font-display font-bold text-4xl md:text-5xl mb-4" style={{color:'var(--text-primary)'}}>
                {reg.openMessage}
              </h2>
              <p className="text-lg mb-10 max-w-2xl mx-auto" style={{color:'var(--text-muted)'}}>
                Click the button below to access the registration form. After submitting, you'll receive payment instructions via WhatsApp.
              </p>
              <a href={reg.googleFormLink} target="_blank" rel="noopener noreferrer" className="btn-primary text-xl px-10 py-5 inline-flex">
                Open Registration Form <ExternalLink size={20} />
              </a>

              <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-4">
                {reg.courses.map((c: any) => (
                  <div key={c.name} className="card p-5 text-left">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold" style={{color:'var(--text-primary)'}}>{c.name}</h3>
                      <span className={`badge ${c.available < 10 ? 'badge-red' : 'badge-gold'}`}>
                        {c.available} seats left
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{width:`${((c.seats - c.available) / c.seats) * 100}%`}} />
                    </div>
                    <div className="flex justify-between text-xs mt-1" style={{color:'var(--text-muted)'}}>
                      <span>{c.seats - c.available} enrolled</span>
                      <span>{c.seats} total seats</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-sm font-semibold" style={{background:'rgba(221,0,0,0.1)',color:'#DD0000',border:'1px solid rgba(221,0,0,0.2)'}}>
                <Clock size={14} />
                Registration Closed – Opens Soon
              </div>

              <h2 className="font-display font-bold text-4xl md:text-5xl mb-4" style={{color:'var(--text-primary)'}}>
                {reg.message}
              </h2>

              <Countdown targetDate={reg.nextRegistrationDate} />

              <div className="rounded-2xl p-6 mb-10" style={{background:'var(--bg-secondary)',border:'1px solid var(--border)'}}>
                <p className="text-base" style={{color:'var(--text-secondary)'}}>
                  Registration for the <strong>{reg.nextBatch}</strong> batch will open on{' '}
                  <strong>{new Date(reg.nextRegistrationDate).toLocaleDateString('en-GB', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                <a href={reg.whatsappLink} target="_blank" rel="noopener noreferrer"
                  className="card p-6 flex items-center gap-4 hover:border-green-500 transition-colors text-left">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-100 text-green-600">
                    <MessageCircle size={24} />
                  </div>
                  <div>
                    <div className="font-semibold" style={{color:'var(--text-primary)'}}>Join WhatsApp Community</div>
                    <div className="text-sm" style={{color:'var(--text-muted)'}}>Get instant notification when registration opens</div>
                  </div>
                </a>
                <Link href="/contact"
                  className="card p-6 flex items-center gap-4 hover:border-yellow-400 transition-colors text-left">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background:'rgba(255,206,0,0.1)',color:'#B8920A'}}>
                    <Bell size={24} />
                  </div>
                  <div>
                    <div className="font-semibold" style={{color:'var(--text-primary)'}}>Request Early Registration</div>
                    <div className="text-sm" style={{color:'var(--text-muted)'}}>Contact us to reserve your seat in advance</div>
                  </div>
                </Link>
              </div>
            </div>
          )}

          <div className="mt-16 pt-16" style={{borderTop:'1px solid var(--border)'}}>
            <h2 className="font-display font-bold text-3xl mb-8 text-center" style={{color:'var(--text-primary)'}}>
              How Registration Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { step: '01', title: 'Fill the Form', desc: 'Complete the Google registration form with your details and preferred course.' },
                { step: '02', title: 'Receive Invoice', desc: 'We will send you payment details via WhatsApp within 24 hours.' },
                { step: '03', title: 'Make Payment', desc: 'Pay via bKash, Nagad, Rocket, or bank transfer.' },
                { step: '04', title: 'Join the Class', desc: 'Receive your Zoom link and study materials before the first class.' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="text-center">
                  <div className="font-mono text-4xl font-bold mb-3" style={{color:'rgba(221,0,0,0.15)'}}>{step}</div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-3" style={{background:'#DD0000'}}>
                    <CheckCircle size={16} color="white" />
                  </div>
                  <h3 className="font-semibold mb-2" style={{color:'var(--text-primary)'}}>{title}</h3>
                  <p className="text-sm" style={{color:'var(--text-muted)'}}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
