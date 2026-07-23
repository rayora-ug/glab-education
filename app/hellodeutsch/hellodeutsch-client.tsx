'use client'

import { useState } from 'react'
import { BookOpen, Volume2, BarChart2, Target, CheckCircle, Bell } from 'lucide-react'

const features = [
  {
    icon: BookOpen,
    title: 'Vocabulary Trainer',
    desc: '2,000+ German words organized by CEFR level (A1–B2) with audio pronunciations by native speakers. Spaced repetition ensures you never forget what you learn.',
    highlights: ['2,000+ curated words', 'Native speaker audio', 'Spaced repetition algorithm', 'Organized by CEFR level'],
    color: '#DD0000',
  },
  {
    icon: Volume2,
    title: 'Speaking Practice',
    desc: 'Record yourself speaking German and compare with native speaker pronunciation. Get instant visual feedback on your pronunciation accuracy.',
    highlights: ['Record & playback', 'Pronunciation comparison', 'Intonation feedback', 'Common mistake alerts'],
    color: '#FFCE00',
  },
  {
    icon: BarChart2,
    title: 'Progress Tracking',
    desc: 'Visual dashboards show your daily streaks, vocabulary mastery, and skill progress across all four language areas: reading, writing, listening, speaking.',
    highlights: ['Daily streak counter', 'Skill progress charts', 'Weekly study reports', 'Achievement badges'],
    color: '#000',
  },
  {
    icon: Target,
    title: 'Exam Preparation',
    desc: 'Practice tests and drills specifically designed for Goethe-Institut A1, A2, B1, and B2 exams. Includes listening comprehension and reading exercises.',
    highlights: ['Mock exam simulations', 'Listening comprehension', 'Reading exercises', 'Writing prompts'],
    color: '#DD0000',
  },
]

export default function HelloDeutschPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) setSubmitted(true)
  }

  return (
    <>
      <section className="section pt-8 relative overflow-hidden" style={{background:'#000'}}>
        <div className="absolute inset-0">
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-10" style={{background:'#FFCE00'}} />
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full blur-3xl opacity-5" style={{background:'#DD0000'}} />
        </div>
        <div className="container relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center py-8">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 font-mono" style={{background:'rgba(255,206,0,0.1)',color:'#FFCE00',border:'1px solid rgba(255,206,0,0.2)',letterSpacing:'0.1em',fontSize:'11px'}}>
                BETA · COMING SOON
              </div>
              <h1 className="font-display font-black text-5xl md:text-7xl mb-6 text-white leading-[1.05]">
                Hello<span style={{color:'#FFCE00'}}>Deutsch</span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                The dedicated German learning app for Bangladeshi students. Vocabulary training, speaking practice, progress tracking, and exam prep, all in your pocket.
              </p>
              <div className="flex flex-wrap gap-4 mb-10">
                <button className="flex items-center gap-3 px-6 py-4 rounded-xl font-semibold text-sm transition-all hover:scale-105" style={{background:'rgba(255,255,255,0.1)',color:'white',border:'1px solid rgba(255,255,255,0.2)'}}>
                  <div>
                    <div className="text-xs text-gray-400 text-left">Coming Soon to</div>
                    <div className="text-base font-bold">Google Play</div>
                  </div>
                </button>
                <button className="flex items-center gap-3 px-6 py-4 rounded-xl font-semibold text-sm transition-all hover:scale-105" style={{background:'rgba(255,255,255,0.1)',color:'white',border:'1px solid rgba(255,255,255,0.2)'}}>
                  <div>
                    <div className="text-xs text-gray-400 text-left">Coming Soon to</div>
                    <div className="text-base font-bold">App Store</div>
                  </div>
                </button>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                <span className="flex items-center gap-1.5"><CheckCircle size={14} style={{color:'#FFCE00'}} /> Free to download</span>
                <span className="flex items-center gap-1.5"><CheckCircle size={14} style={{color:'#FFCE00'}} /> Works offline</span>
                <span className="flex items-center gap-1.5"><CheckCircle size={14} style={{color:'#FFCE00'}} /> No ads</span>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                <div className="w-64 h-[520px] rounded-[44px] shadow-2xl relative overflow-hidden" style={{background:'#111',border:'3px solid rgba(255,255,255,0.15)'}}>
                  <div className="absolute top-0 left-0 right-0 h-1.5" style={{background:'linear-gradient(to right,#000,#DD0000,#FFCE00)'}} />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-7 rounded-b-2xl" style={{background:'#000'}} />
                  <div className="p-5 pt-12 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="text-white font-bold text-lg">Guten Morgen!</div>
                        <div className="text-gray-400 text-xs">Day 14 streak</div>
                      </div>
                      <div className="w-10 h-10 rounded-xl overflow-hidden" style={{background:'linear-gradient(135deg,#000 33%,#DD0000 33% 66%,#FFCE00 66%)'}}>
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">GL</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl p-4 mb-4" style={{background:'rgba(255,206,0,0.1)',border:'1px solid rgba(255,206,0,0.2)'}}>
                      <div className="text-xs text-gray-400 mb-2">Today's Goal</div>
                      <div className="progress-bar mb-2" style={{background:'rgba(255,255,255,0.1)'}}>
                        <div className="progress-fill" style={{width:'65%'}} />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span style={{color:'#FFCE00'}}>13/20 words</span>
                        <span className="text-gray-400">65%</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {[
                        {icon: BookOpen, label: 'Vocabulary', active: true},
                        {icon: Volume2, label: 'Speaking', active: false},
                        {icon: Target, label: 'Exam Prep', active: false},
                        {icon: BarChart2, label: 'Progress', active: false},
                      ].map(({icon: Icon, label, active}) => (
                        <div key={label} className="rounded-xl p-3 text-center" style={{background: active ? 'rgba(221,0,0,0.15)' : 'rgba(255,255,255,0.05)', border: active ? '1px solid rgba(221,0,0,0.3)' : '1px solid transparent'}}>
                          <Icon size={18} className="mx-auto mb-1" style={{color: active ? '#DD0000' : 'rgba(255,255,255,0.3)'}} />
                          <div className="text-xs" style={{color: active ? 'white' : 'rgba(255,255,255,0.3)'}}>{label}</div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl p-4 mt-auto" style={{background:'rgba(255,255,255,0.05)'}}>
                      <div className="text-xs text-gray-400 mb-2 font-mono">Word of the Day</div>
                      <div className="text-white font-bold text-xl">Bildung</div>
                      <div className="text-gray-400 text-sm">Education / Formation</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="text-center mb-14">
            <div className="section-label justify-center">Features</div>
            <h2 className="font-display font-bold text-4xl md:text-5xl mb-4" style={{color:'var(--text-primary)'}}>
              Everything You Need to Learn German
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {features.map(({ icon: Icon, title, desc, highlights, color }) => (
              <div key={title} className="card p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full" style={{background:color}} />
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{background:`${color}15`}}>
                  <Icon size={28} style={{color}} />
                </div>
                <h3 className="font-display font-bold text-2xl mb-3" style={{color:'var(--text-primary)'}}>{title}</h3>
                <p className="mb-5 leading-relaxed" style={{color:'var(--text-muted)'}}>{desc}</p>
                <div className="space-y-2">
                  {highlights.map(h => (
                    <div key={h} className="flex items-center gap-2 text-sm" style={{color:'var(--text-secondary)'}}>
                      <CheckCircle size={14} style={{color}} />
                      {h}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{background:'var(--bg-secondary)'}}>
        <div className="container max-w-2xl mx-auto text-center">
          <div className="section-label justify-center">Stay Updated</div>
          <h2 className="font-display font-bold text-4xl mb-4" style={{color:'var(--text-primary)'}}>
            Get Notified When We Launch
          </h2>
          <p className="text-lg mb-8" style={{color:'var(--text-muted)'}}>
            Be the first to know when HelloDeutsch launches on Google Play and App Store. We'll also send you early access and exclusive beta features.
          </p>
          {submitted ? (
            <div className="card p-8">
              <CheckCircle size={48} className="mx-auto mb-4" style={{color:'#16a34a'}} />
              <h3 className="font-bold text-xl mb-2" style={{color:'var(--text-primary)'}}>You're on the list!</h3>
              <p style={{color:'var(--text-muted)'}}>We'll notify you when HelloDeutsch launches. Danke schon!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="input flex-1"
              />
              <button type="submit" className="btn-primary whitespace-nowrap">
                <Bell size={16} /> Notify Me
              </button>
            </form>
          )}
          <p className="text-xs mt-4" style={{color:'var(--text-muted)'}}>No spam. Only launch announcement and updates. Unsubscribe anytime.</p>
        </div>
      </section>
    </>
  )
}
