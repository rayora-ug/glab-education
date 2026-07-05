'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Clock, BookOpen, Award, Users, CheckCircle, ArrowRight } from 'lucide-react'
import courses from '../../data/courses.json'

export default function CoursesPage() {
  const [filter, setFilter] = useState('All')
  const filtered = filter === 'All' ? courses : (courses as any[]).filter(c => c.level === filter)

  return (
    <>
      <section className="section pt-8" style={{background:'var(--bg-secondary)'}}>
        <div className="container">
          <div className="german-stripe mb-8 rounded-full" />
          <div className="section-label">Programs</div>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-4">
            <div>
              <h1 className="font-display font-black text-5xl md:text-6xl" style={{color:'var(--text-primary)'}}>
                Our Courses
              </h1>
              <p className="text-xl mt-4 max-w-2xl" style={{color:'var(--text-muted)'}}>
                From absolute beginner to upper-intermediate — structured, exam-ready German courses designed for Bangladeshi learners.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['All', 'A1', 'A2', 'B1', 'B2'].map(l => (
                <button key={l} onClick={() => setFilter(l)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all border"
                  style={{background: filter === l ? '#DD0000' : 'var(--card-bg)', color: filter === l ? 'white' : 'var(--text-secondary)', borderColor: filter === l ? '#DD0000' : 'var(--border)'}}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filtered.map((c: any) => (
              <div key={c.id} className="card flex flex-col relative overflow-hidden">
                {c.popular && (
                  <div className="absolute top-0 left-0 right-0 h-1" style={{background:'linear-gradient(to right,#FFCE00,#DD0000)'}} />
                )}
                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold" style={{background:'rgba(0,0,0,0.06)',color:'var(--text-primary)',letterSpacing:'0.05em'}}>
                          {c.level}
                        </span>
                        <span className="badge badge-gold">{c.badge}</span>
                      </div>
                      {c.popular && <span className="badge badge-red text-xs self-start">Most Popular</span>}
                    </div>
                    <div className="text-right">
                      <div className="font-display font-black text-2xl" style={{color:'#DD0000'}}>{c.fee}</div>
                      <div className="text-xs" style={{color:'var(--text-muted)'}}>{c.feeUSD}</div>
                    </div>
                  </div>

                  <h2 className="font-display font-bold text-2xl mb-3" style={{color:'var(--text-primary)'}}>{c.title}</h2>
                  <p className="text-sm mb-5 leading-relaxed" style={{color:'var(--text-muted)'}}>{c.description}</p>

                  <div className="grid grid-cols-2 gap-3 mb-5 p-4 rounded-xl" style={{background:'var(--bg-secondary)'}}>
                    <div className="flex items-center gap-2 text-xs" style={{color:'var(--text-muted)'}}>
                      <Clock size={12} style={{color:'#DD0000'}} />
                      <span>{c.duration}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs" style={{color:'var(--text-muted)'}}>
                      <Users size={12} style={{color:'#DD0000'}} />
                      <span>Max {c.seats} seats</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs col-span-2" style={{color:'var(--text-muted)'}}>
                      <BookOpen size={12} className="mt-0.5 flex-shrink-0" style={{color:'#DD0000'}} />
                      <span>{c.schedule}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{color:'var(--text-muted)'}}>What you'll cover</div>
                    {c.highlights.map((h: string) => (
                      <div key={h} className="flex items-start gap-2 text-sm" style={{color:'var(--text-secondary)'}}>
                        <CheckCircle size={14} className="mt-0.5 flex-shrink-0" style={{color:'#FFCE00'}} />
                        {h}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 pt-0">
                  {c.registrationOpen ? (
                    <a href={c.googleFormLink} target="_blank" rel="noopener noreferrer" className="btn-primary w-full justify-center">
                      Register Now – {c.fee} <ArrowRight size={14} />
                    </a>
                  ) : (
                    <Link href="/registration" className="btn-secondary w-full justify-center">
                      Join Waitlist <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{background:'var(--bg-secondary)'}}>
        <div className="container">
          <div className="text-center mb-12">
            <div className="section-label justify-center">Learning Path</div>
            <h2 className="font-display font-bold text-4xl" style={{color:'var(--text-primary)'}}>Your German Learning Journey</h2>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-0">
            {['Foundation', 'A1', 'A2', 'B1', 'B2', 'Germany'].map((level, i, arr) => (
              <div key={level} className="flex items-center">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all"
                    style={i < arr.length - 1
                      ? {borderColor:'#DD0000',background:'rgba(221,0,0,0.08)',color:'#DD0000'}
                      : {borderColor:'#FFCE00',background:'rgba(255,206,0,0.1)',color:'#B8920A'}}>
                    {level === 'Germany' ? '🇩🇪' : level === 'Foundation' ? 'F' : level}
                  </div>
                  <div className="text-xs mt-1 font-medium" style={{color:'var(--text-muted)'}}>{level}</div>
                </div>
                {i < arr.length - 1 && (
                  <div className="w-8 md:w-16 h-0.5 mx-1" style={{background: 'linear-gradient(to right,#DD0000,#FFCE00)'}} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container text-center">
          <h2 className="font-display font-bold text-4xl mb-4" style={{color:'var(--text-primary)'}}>Not sure which level to start?</h2>
          <p className="text-lg mb-8" style={{color:'var(--text-muted)'}}>Contact us and we'll help you find the right course for your current level and goals.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/contact" className="btn-primary">Get Guidance <ArrowRight size={14} /></Link>
            <Link href="/registration" className="btn-secondary">Register Now</Link>
          </div>
        </div>
      </section>
    </>
  )
}
