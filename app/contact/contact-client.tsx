'use client'

import { useState } from 'react'
import {
  Mail, MessageCircle, Facebook, Users, MapPin, Send,
  CheckCircle, ArrowRight, Clock
} from 'lucide-react'

const subjects = ['General Inquiry', 'Course Information', 'Registration Help', 'Payment Issue', 'Technical Support (HelloDeutsch)', 'Partnership / Other']

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: subjects[0], message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setTimeout(() => {
      setSending(false)
      setSubmitted(true)
    }, 900)
  }

  const channels = [
    { icon: Facebook, label: 'Facebook Page', desc: 'Follow for daily updates & tips', href: 'https://facebook.com/glab.bd', color: '#1877F2', bg: 'rgba(24,119,242,0.1)' },
    { icon: Users, label: 'Facebook Group', desc: 'Join 1,000+ German learners', href: 'https://facebook.com/groups/glab.bd', color: '#1877F2', bg: 'rgba(24,119,242,0.1)' },
    { icon: MessageCircle, label: 'WhatsApp Community', desc: 'Get instant announcements', href: 'https://chat.whatsapp.com/glab', color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
    { icon: Mail, label: 'Email Us', desc: 'info@glab.com.bd', href: 'mailto:info@glab.com.bd', color: '#DD0000', bg: 'rgba(221,0,0,0.1)' },
  ]

  return (
    <>
      <section className="section pt-8" style={{background:'var(--bg-secondary)'}}>
        <div className="container">
          <div className="german-stripe mb-8 rounded-full" />
          <div className="section-label">Get in Touch</div>
          <h1 className="font-display font-black text-5xl md:text-6xl mb-4" style={{color:'var(--text-primary)'}}>
            Contact Us
          </h1>
          <p className="text-xl max-w-2xl" style={{color:'var(--text-muted)'}}>
            Have a question about courses, registration, or the HelloDeutsch app? We're here to help.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid lg:grid-cols-5 gap-10">
            <div className="lg:col-span-3">
              <div className="card p-6 md:p-10">
                {submitted ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center" style={{background:'rgba(22,163,74,0.1)'}}>
                      <CheckCircle size={32} style={{color:'#16a34a'}} />
                    </div>
                    <h3 className="font-display font-bold text-2xl mb-2" style={{color:'var(--text-primary)'}}>Message Sent!</h3>
                    <p className="mb-6" style={{color:'var(--text-muted)'}}>
                      Thank you for reaching out. Our team will get back to you within 24 hours.
                    </p>
                    <button onClick={() => { setSubmitted(false); setForm({name:'',email:'',subject:subjects[0],message:''}) }} className="btn-secondary">
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="font-display font-bold text-2xl mb-6" style={{color:'var(--text-primary)'}}>Send us a message</h2>
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-semibold mb-2" style={{color:'var(--text-primary)'}}>Full Name</label>
                          <input type="text" name="name" required value={form.name} onChange={handleChange}
                            placeholder="Your name" className="input" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-2" style={{color:'var(--text-primary)'}}>Email Address</label>
                          <input type="email" name="email" required value={form.email} onChange={handleChange}
                            placeholder="you@example.com" className="input" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{color:'var(--text-primary)'}}>Subject</label>
                        <select name="subject" value={form.subject} onChange={handleChange} className="input">
                          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{color:'var(--text-primary)'}}>Message</label>
                        <textarea name="message" required rows={6} value={form.message} onChange={handleChange}
                          placeholder="Tell us how we can help..." className="input" style={{resize:'vertical'}} />
                      </div>
                      <button type="submit" disabled={sending} className="btn-primary w-full justify-center text-base py-3.5 disabled:opacity-60">
                        {sending ? 'Sending...' : <>Send Message <Send size={16} /></>}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {channels.map(({ icon: Icon, label, desc, href, color, bg }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  className="card p-5 flex items-center gap-4 transition-all hover:translate-x-1">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: bg, color}}>
                    <Icon size={22} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold" style={{color:'var(--text-primary)'}}>{label}</div>
                    <div className="text-sm" style={{color:'var(--text-muted)'}}>{desc}</div>
                  </div>
                  <ArrowRight size={16} style={{color:'var(--text-muted)'}} />
                </a>
              ))}

              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={16} style={{color:'#DD0000'}} />
                  <span className="font-semibold text-sm" style={{color:'var(--text-primary)'}}>Response Hours</span>
                </div>
                <div className="text-sm space-y-1" style={{color:'var(--text-muted)'}}>
                  <div className="flex justify-between"><span>Saturday – Thursday</span><span>10 AM – 10 PM</span></div>
                  <div className="flex justify-between"><span>Friday</span><span>3 PM – 10 PM</span></div>
                </div>
              </div>

              <div className="card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={16} style={{color:'#DD0000'}} />
                  <span className="font-semibold text-sm" style={{color:'var(--text-primary)'}}>Operating From</span>
                </div>
                <p className="text-sm" style={{color:'var(--text-muted)'}}>
                  GLAB operates fully online, serving students across all divisions of Bangladesh — Dhaka, Chittagong, Sylhet, Rajshahi, Khulna, and beyond.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
