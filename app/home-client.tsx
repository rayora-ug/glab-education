'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowRight, Star, Users, BookOpen, Award, Clock, ChevronDown,
  CheckCircle, Smartphone, Target, TrendingUp, Globe,
  MessageCircle, GraduationCap, Volume2, BarChart2,
  ChevronLeft, ChevronRight, Quote, Plus, Minus, Download
} from 'lucide-react'
import courses from '../data/courses.json'
import announcements from '../data/announcements.json'
import reviews from '../data/reviews.json'
import faq from '../data/faq.json'

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

function CountUp({ end, duration = 2000 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const { ref, inView } = useInView()
  useEffect(() => {
    if (!inView) return
    const step = end / (duration / 16)
    let cur = 0
    const timer = setInterval(() => {
      cur = Math.min(cur + step, end)
      setCount(Math.floor(cur))
      if (cur >= end) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [inView, end, duration])
  return <span ref={ref}>{count}</span>
}

export default function HomePage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(0)
  const [testimonialIdx, setTestimonialIdx] = useState(0)
  const featuredReviews = (reviews as any).reviews.filter((r: any) => r.featured)

  return (
    <>
      {/* HERO */}
      <section className="hero-gradient relative overflow-hidden min-h-[100svh] flex items-center">
        <div className="absolute top-20 right-10 w-64 h-64 rounded-full opacity-5 blur-3xl" style={{background:'#FFCE00'}} />
        <div className="absolute bottom-20 left-10 w-48 h-48 rounded-full opacity-5 blur-3xl" style={{background:'#DD0000'}} />
        <div className="absolute right-0 top-0 bottom-0 w-1 hidden lg:block" style={{background:'linear-gradient(to bottom,#000 33%,#DD0000 33% 66%,#FFCE00 66%)' }} />

        <div className="container relative z-10 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="animate-fade-up">
              <div className="section-label mb-6">German Language Academy of Bangladesh</div>

              <h1 className="font-display font-black mb-6 leading-[1.05]" style={{fontSize:'clamp(2.5rem, 6vw, 4rem)', color:'var(--text-primary)'}}>
                Learn German<br />
                <span className="underline-flag inline-block" style={{color:'#DD0000'}}>with Confidence</span>
              </h1>

              <p className="text-lg mb-8 leading-relaxed max-w-lg" style={{color:'var(--text-secondary)'}}>
                GLAB helps Bangladeshi students master German and prepare for studies, careers, and life in Germany. Structured online courses with expert instructors.
              </p>

              <div className="flex flex-wrap gap-4 mb-10">
                <Link href="/courses" className="btn-primary text-base px-6 py-3">
                  View Courses <ArrowRight size={16} />
                </Link>
                <Link href="/hellodeutsch" className="btn-secondary text-base px-6 py-3">
                  <Download size={16} /> HelloDeutsch App
                </Link>
              </div>

              <div className="flex flex-wrap gap-6">
                {[['5000+', 'Students Enrolled'], ['4.9★', 'Average Rating'], ['4', 'Course Levels'], ['92%', 'Exam Pass Rate']].map(([n, l]) => (
                  <div key={l} className="flex flex-col">
                    <span className="font-display font-bold text-2xl" style={{color:'var(--text-primary)'}}>{n}</span>
                    <span className="text-xs" style={{color:'var(--text-muted)'}}>{l}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden lg:block relative h-[520px]">
              <div className="absolute top-8 right-0 w-72 card p-5 animate-float" style={{animationDelay:'0s'}}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'rgba(221,0,0,0.1)'}}>
                    <BookOpen size={20} style={{color:'#DD0000'}} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm" style={{color:'var(--text-primary)'}}>A1 Intensive Course</div>
                    <div className="text-xs" style={{color:'var(--text-muted)'}}>6 Weeks · Starting July 10</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="badge badge-gold">Seats Available</span>
                  <span className="font-bold" style={{color:'#DD0000'}}>BDT 3,500</span>
                </div>
              </div>

              <div className="absolute top-44 left-0 w-64 card p-5 animate-float" style={{animationDelay:'2s'}}>
                <div className="flex items-center gap-2 mb-3">
                  {Array(5).fill(0).map((_, i) => <Star key={i} size={14} fill="#FFCE00" style={{color:'#FFCE00'}} />)}
                </div>
                <p className="text-sm italic mb-2" style={{color:'var(--text-secondary)'}}>
                  "Passed Goethe B1 with distinction!"
                </p>
                <div className="text-xs font-semibold" style={{color:'var(--text-muted)'}}>— Nadia Rahman, Dhaka</div>
              </div>

              <div className="absolute bottom-10 right-10 w-64 card p-5 animate-float" style={{animationDelay:'4s'}}>
                <div className="font-mono uppercase tracking-wider mb-2" style={{color:'var(--text-muted)',fontSize:'10px'}}>HelloDeutsch App</div>
                <div className="font-semibold mb-1" style={{color:'var(--text-primary)'}}>2,000+ Vocabulary Words</div>
                <div className="progress-bar mb-2">
                  <div className="progress-fill" style={{width:'78%'}} />
                </div>
                <div className="text-xs" style={{color:'var(--text-muted)'}}>A1 Progress: 78% Complete</div>
              </div>

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full opacity-20 blur-2xl" style={{background:'#FFCE00'}} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden" style={{background:'linear-gradient(135deg,#000 33%,#DD0000 33% 66%,#FFCE00 66%)'}}>
                  <GraduationCap size={36} color="white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50">
          <span className="font-mono" style={{color:'var(--text-muted)',letterSpacing:'0.1em',fontSize:'11px'}}>SCROLL</span>
          <ChevronDown size={16} style={{color:'var(--text-muted)'}} className="animate-bounce" />
        </div>
      </section>

      {/* TICKER */}
      <div className="overflow-hidden py-3" style={{background:'#DD0000'}}>
        <div className="flex animate-marquee whitespace-nowrap">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-8 mr-8 text-white text-sm font-medium">
              {['A1 Intensive – July 2026', 'Free Pronunciation Workshop – June 20', 'B1 Exam Prep Now Available', 'HelloDeutsch App Beta Live', 'GLAB x StudyLink Germany Partnership'].map(t => (
                <span key={t} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 flex-shrink-0" />
                  {t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* WHY GLAB */}
      <section className="section">
        <div className="container">
          <div className="text-center mb-14">
            <div className="section-label justify-center">Why Choose GLAB</div>
            <h2 className="font-display font-bold text-4xl md:text-5xl mb-4" style={{color:'var(--text-primary)'}}>
              The Smart Way to Learn German
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{color:'var(--text-muted)'}}>
              Purpose-built for Bangladeshi learners, designed to get you to Germany faster.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Target, title: 'CEFR-Aligned Curriculum', desc: 'Our courses follow the Common European Framework of Reference (CEFR), the international standard for language learning.', color: '#DD0000' },
              { icon: Users, title: 'Expert Bangladeshi Instructors', desc: 'Learn from teachers who understand the unique challenges Bangladeshi students face and explain in Bangla when needed.', color: '#FFCE00' },
              { icon: Smartphone, title: 'HelloDeutsch App', desc: 'Reinforce your learning with our dedicated mobile app featuring vocabulary trainers, speaking practice, and progress tracking.', color: '#000' },
              { icon: Globe, title: 'Visa & Study Guidance', desc: 'Beyond language – we guide students on student visa requirements, university applications, and life in Germany.', color: '#DD0000' },
              { icon: Award, title: 'Goethe Exam Ready', desc: 'Every GLAB course is specifically designed to prepare students for the official Goethe-Institut and TestDaF exams.', color: '#FFCE00' },
              { icon: TrendingUp, title: 'Proven Results', desc: '92% exam pass rate. 5000+ students enrolled. Graduates now studying and working across Germany and Austria.', color: '#000' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="card p-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{background:`${color}15`}}>
                  <Icon size={22} style={{color}} />
                </div>
                <h3 className="font-display font-bold text-lg mb-2" style={{color:'var(--text-primary)'}}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{color:'var(--text-muted)'}}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="section" style={{background:'var(--bg-secondary)'}}>
        <div className="container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { end: 5000, suffix: '+', label: 'Students Enrolled', sub: 'Since 2023' },
              { end: 4, suffix: '', label: 'Course Levels', sub: 'Foundation to B1' },
              { end: 92, suffix: '%', label: 'Exam Pass Rate', sub: 'Goethe & TestDaF' },
              { end: 247, suffix: '+', label: 'Five-Star Reviews', sub: 'Average 4.9/5' },
            ].map(({ end, suffix, label, sub }) => (
              <div key={label} className="text-center">
                <div className="font-display font-black mb-1" style={{fontSize:'3.5rem', lineHeight:1, background:'linear-gradient(135deg,#FFCE00,#FF9900)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>
                  <CountUp end={end} />{suffix}
                </div>
                <div className="font-semibold text-sm mb-1" style={{color:'var(--text-primary)'}}>{label}</div>
                <div className="text-xs" style={{color:'var(--text-muted)'}}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COURSES */}
      <section className="section">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <div className="section-label">Our Programs</div>
              <h2 className="font-display font-bold text-4xl md:text-5xl" style={{color:'var(--text-primary)'}}>
                Structured German Courses
              </h2>
            </div>
            <Link href="/courses" className="btn-secondary text-sm px-5 py-2.5 self-start">
              View All Courses <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(courses as any[]).slice(0, 6).map((c) => (
              <div key={c.id} className="card p-6 relative overflow-hidden">
                {c.popular && (
                  <div className="absolute top-4 right-4 badge badge-red">Popular</div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <span className="badge" style={{background:'rgba(0,0,0,0.06)',color:'var(--text-secondary)',fontSize:'10px',letterSpacing:'0.08em'}}>
                    {c.level}
                  </span>
                  <span className="badge badge-gold" style={{fontSize:'10px'}}>{c.badge}</span>
                </div>
                <h3 className="font-display font-bold text-xl mb-2" style={{color:'var(--text-primary)'}}>{c.title}</h3>
                <p className="text-sm mb-4 line-clamp-2" style={{color:'var(--text-muted)'}}>{c.description}</p>
                <div className="space-y-1.5 mb-5 text-xs" style={{color:'var(--text-muted)'}}>
                  <div className="flex gap-2"><Clock size={12} className="mt-0.5 flex-shrink-0" style={{color:'#DD0000'}} />{c.duration}</div>
                  <div className="flex gap-2"><BookOpen size={12} className="mt-0.5 flex-shrink-0" style={{color:'#DD0000'}} />{c.schedule}</div>
                  <div className="flex gap-2"><Award size={12} className="mt-0.5 flex-shrink-0" style={{color:'#DD0000'}} /><span className="font-bold" style={{color:'var(--text-primary)'}}>{c.fee}</span></div>
                </div>
                <Link href="/registration" className={c.registrationOpen ? 'btn-primary text-sm py-2.5 w-full justify-center' : 'btn-secondary text-sm py-2.5 w-full justify-center'}>
                  {c.registrationOpen ? 'Register Now' : 'Join Waitlist'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ANNOUNCEMENTS */}
      <section className="section" style={{background:'var(--bg-secondary)'}}>
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <div className="section-label">Latest News</div>
              <h2 className="font-display font-bold text-4xl md:text-5xl" style={{color:'var(--text-primary)'}}>
                Announcements
              </h2>
            </div>
            <Link href="/announcements" className="btn-secondary text-sm px-5 py-2.5 self-start">
              All Announcements <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(announcements as any[]).slice(0,3).map((a) => (
              <div key={a.id} className="card p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="badge badge-gold text-xs">{a.category}</span>
                  {a.important && <span className="badge badge-red text-xs">Important</span>}
                </div>
                <h3 className="font-semibold text-base mb-2 leading-snug" style={{color:'var(--text-primary)'}}>{a.title}</h3>
                <p className="text-sm mb-4 line-clamp-3" style={{color:'var(--text-muted)'}}>{a.excerpt}</p>
                <div className="flex items-center justify-between text-xs" style={{color:'var(--text-muted)'}}>
                  <span>{new Date(a.date).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'})}</span>
                  <Link href="/announcements" className="flex items-center gap-1 hover:text-red-600 transition-colors font-medium">
                    Read more <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HELLODEUTSCH PREVIEW */}
      <section className="section relative overflow-hidden" style={{background:'#000'}}>
        <div className="container relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="section-label" style={{color:'#FFCE00'}}>Mobile App</div>
              <h2 className="font-display font-bold text-4xl md:text-5xl mb-6 text-white">
                HelloDeutsch<br />
                <span style={{color:'#FFCE00'}}>Learn Anywhere</span>
              </h2>
              <p className="text-lg mb-8 text-gray-300 leading-relaxed">
                Our dedicated mobile app brings German learning to your fingertips. Vocabulary trainer, speaking practice, and progress tracking – all in one place.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { icon: BookOpen, label: 'Vocabulary Trainer', desc: '2,000+ words with audio' },
                  { icon: Volume2, label: 'Speaking Practice', desc: 'Record & compare' },
                  { icon: BarChart2, label: 'Progress Tracking', desc: 'Visual dashboards' },
                  { icon: Target, label: 'Exam Preparation', desc: 'Mock tests & drills' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:'rgba(255,206,0,0.2)'}}>
                      <Icon size={16} style={{color:'#FFCE00'}} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{label}</div>
                      <div className="text-xs text-gray-400">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/hellodeutsch" className="btn-gold">
                  <Download size={16} /> Download App
                </Link>
                <Link href="/hellodeutsch" className="btn-secondary" style={{borderColor:'rgba(255,255,255,0.2)',color:'white'}}>
                  Learn More <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="relative w-64 h-[480px] rounded-[40px] overflow-hidden shadow-2xl" style={{background:'#1a1a1a',border:'3px solid rgba(255,255,255,0.1)'}}>
                <div className="absolute top-0 left-0 right-0 h-1" style={{background:'linear-gradient(to right,#000,#DD0000,#FFCE00)'}} />
                <div className="p-6 pt-10 h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg overflow-hidden" style={{background:'linear-gradient(135deg,#000 33%,#DD0000 33% 66%,#FFCE00 66%)'}}>
                      <div className="w-full h-full flex items-center justify-center">
                        <GraduationCap size={14} color="white" />
                      </div>
                    </div>
                    <span className="font-bold text-white text-sm">HelloDeutsch</span>
                  </div>
                  <div className="text-gray-400 mb-3 font-mono uppercase tracking-wider" style={{fontSize:'10px'}}>Today's Vocabulary</div>
                  <div className="space-y-2 mb-6">
                    {[['Schule', 'School', '✓'], ['Lernen', 'To Learn', '✓'], ['Sprache', 'Language', '→']].map(([de, en, s]) => (
                      <div key={de} className="rounded-xl p-3 flex items-center justify-between" style={{background:'rgba(255,255,255,0.06)'}}>
                        <div>
                          <div className="text-white text-sm font-semibold">{de}</div>
                          <div className="text-gray-400 text-xs">{en}</div>
                        </div>
                        <span style={{color: s === '✓' ? '#FFCE00' : 'rgba(255,255,255,0.3)', fontSize:'14px'}}>{s}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl p-3 mb-4" style={{background:'rgba(221,0,0,0.15)',border:'1px solid rgba(221,0,0,0.3)'}}>
                    <div className="text-xs text-gray-400 mb-1">Daily Progress</div>
                    <div className="progress-bar mb-1">
                      <div className="progress-fill" style={{width:'65%'}} />
                    </div>
                    <div className="text-xs" style={{color:'#FFCE00'}}>13/20 words reviewed</div>
                  </div>
                  <div className="mt-auto flex justify-around">
                    {[BookOpen, Volume2, BarChart2, Target].map((Icon, i) => (
                      <div key={i} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: i===0 ? 'rgba(221,0,0,0.2)' : 'rgba(255,255,255,0.05)'}}>
                        <Icon size={16} style={{color: i===0 ? '#DD0000' : 'rgba(255,255,255,0.4)'}} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section">
        <div className="container">
          <div className="text-center mb-12">
            <div className="section-label justify-center">Student Stories</div>
            <h2 className="font-display font-bold text-4xl md:text-5xl mb-4" style={{color:'var(--text-primary)'}}>
              Hear from Our Students
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="card p-8 md:p-12 relative overflow-hidden">
              <Quote size={64} className="absolute top-6 right-6 opacity-5" />
              <div className="flex gap-1 mb-6">
                {Array(5).fill(0).map((_,i) => <Star key={i} size={18} fill="#FFCE00" style={{color:'#FFCE00'}} />)}
              </div>
              <p className="text-xl md:text-2xl font-display italic mb-8 leading-relaxed" style={{color:'var(--text-primary)'}}>
                "{featuredReviews[testimonialIdx]?.text}"
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold" style={{color:'var(--text-primary)'}}>{featuredReviews[testimonialIdx]?.name}</div>
                  <div className="text-sm" style={{color:'var(--text-muted)'}}>{featuredReviews[testimonialIdx]?.level} • {featuredReviews[testimonialIdx]?.location}</div>
                  {featuredReviews[testimonialIdx]?.outcome && (
                    <div className="mt-1 badge badge-gold">{featuredReviews[testimonialIdx].outcome}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setTestimonialIdx(i => (i - 1 + featuredReviews.length) % featuredReviews.length)}
                    className="w-10 h-10 rounded-xl border flex items-center justify-center transition-colors hover:border-red-500" style={{borderColor:'var(--border)'}}>
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={() => setTestimonialIdx(i => (i + 1) % featuredReviews.length)}
                    className="w-10 h-10 rounded-xl border flex items-center justify-center transition-colors hover:border-red-500" style={{borderColor:'var(--border)'}}>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-2 mt-6">
              {featuredReviews.map((_: any, i: number) => (
                <button key={i} onClick={() => setTestimonialIdx(i)}
                  className="h-2 rounded-full transition-all"
                  style={{background: i === testimonialIdx ? '#DD0000' : 'var(--border)', width: i === testimonialIdx ? '24px' : '8px'}} />
              ))}
            </div>
          </div>

          <div className="text-center mt-8">
            <Link href="/reviews" className="btn-secondary">
              View All Reviews <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section" style={{background:'var(--bg-secondary)'}}>
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <div className="section-label justify-center">FAQ</div>
              <h2 className="font-display font-bold text-4xl mb-4" style={{color:'var(--text-primary)'}}>
                Frequently Asked Questions
              </h2>
            </div>
            <div className="space-y-3">
              {(faq as any[]).map((q) => (
                <div key={q.id} className="card overflow-hidden">
                  <button
                    className="w-full text-left px-6 py-5 flex items-center justify-between gap-4"
                    onClick={() => setFaqOpen(faqOpen === q.id ? null : q.id)}>
                    <span className="font-semibold text-sm md:text-base" style={{color:'var(--text-primary)'}}>{q.question}</span>
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{background: faqOpen === q.id ? '#DD0000' : 'var(--bg-secondary)'}}>
                      {faqOpen === q.id ? <Minus size={14} color="white" /> : <Plus size={14} style={{color:'var(--text-muted)'}} />}
                    </div>
                  </button>
                  {faqOpen === q.id && (
                    <div className="px-6 pb-5">
                      <p className="text-sm leading-relaxed" style={{color:'var(--text-muted)'}}>{q.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="section relative overflow-hidden" style={{background:'#DD0000'}}>
        <div className="container relative z-10 text-center">
          <h2 className="font-display font-black text-4xl md:text-6xl text-white mb-6">
            Ready to Start<br />Your Journey?
          </h2>
          <p className="text-xl text-red-100 mb-10 max-w-2xl mx-auto">
            Join 5000+ students who chose GLAB to build their future in Germany. Registration for the next batch opens soon.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/registration" className="btn-gold text-lg px-8 py-4">
              Register Now <ArrowRight size={18} />
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-2 text-white border-2 border-white/30 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-colors">
              <MessageCircle size={18} /> Ask a Question
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
