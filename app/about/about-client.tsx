'use client'

import { Target, Eye, BookOpen, Users, Award, Globe, ArrowRight, Zap } from 'lucide-react'
import Link from 'next/link'

const timeline = [
  { year: '2023', title: 'GLAB Founded', desc: 'Started with our first A1 batch of 15 students, conducting live online classes via Zoom.', color: '#000' },
  { year: '2023', title: 'First 50 Students', desc: 'Expanded to A1 and A2 levels. First students began applying to German universities.', color: '#DD0000' },
  { year: '2024', title: 'B1 & B2 Launched', desc: 'Full curriculum from Pre-A1 to B2 established. First GLAB student arrived in Germany.', color: '#FFCE00' },
  { year: '2024', title: '200+ Students', desc: 'Partnered with StudyLink Germany. Speaking course and Exam Prep programs launched.', color: '#000' },
  { year: '2025', title: 'HelloDeutsch App', desc: 'Development of our mobile learning app begins. Beta vocabulary trainer launched.', color: '#DD0000' },
  { year: '2026', title: '500+ Students', desc: 'GLAB becomes the leading online German language platform for Bangladeshi learners.', color: '#FFCE00' },
]

export default function AboutPage() {
  return (
    <>
      <section className="section pt-8" style={{background:'var(--bg-secondary)'}}>
        <div className="container">
          <div className="german-stripe mb-8 rounded-full" />
          <div className="section-label">Our Story</div>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="font-display font-black mb-6" style={{fontSize:'clamp(3rem,6vw,5rem)',lineHeight:1.05,color:'var(--text-primary)'}}>
                Learn German.<br />
                <span style={{color:'#DD0000'}}>Build Your</span><br />
                Future.
              </h1>
              <p className="text-xl leading-relaxed" style={{color:'var(--text-secondary)'}}>
                GLAB (German Language Academy of Bangladesh) was founded with one mission: to give Bangladeshi students the best possible path to Germany, through structured, expert-taught German language education that's accessible online from anywhere in Bangladesh.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                {n:'500+',l:'Students Enrolled',c:'#DD0000'},{n:'7',l:'Course Levels',c:'#FFCE00'},
                {n:'92%',l:'Exam Pass Rate',c:'#000'},{n:'4.9★',l:'Average Rating',c:'#DD0000'},
              ].map(({n,l,c}) => (
                <div key={l} className="card p-5 text-center">
                  <div className="font-display font-black text-4xl mb-1" style={{color:c}}>{n}</div>
                  <div className="text-xs" style={{color:'var(--text-muted)'}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="card p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1" style={{background:'linear-gradient(to right,#000,#DD0000)'}} />
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{background:'rgba(221,0,0,0.1)'}}>
                <Target size={24} style={{color:'#DD0000'}} />
              </div>
              <h2 className="font-display font-bold text-2xl mb-4" style={{color:'var(--text-primary)'}}>Our Mission</h2>
              <p className="leading-relaxed" style={{color:'var(--text-secondary)'}}>
                To provide high-quality, accessible German language education to Bangladeshi students through structured online courses, digital learning tools, and comprehensive support, empowering them to study, work, and thrive in Germany and the German-speaking world.
              </p>
            </div>
            <div className="card p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1" style={{background:'linear-gradient(to right,#DD0000,#FFCE00)'}} />
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{background:'rgba(255,206,0,0.15)'}}>
                <Eye size={24} style={{color:'#B8920A'}} />
              </div>
              <h2 className="font-display font-bold text-2xl mb-4" style={{color:'var(--text-primary)'}}>Our Vision</h2>
              <p className="leading-relaxed" style={{color:'var(--text-secondary)'}}>
                To become the most trusted German language platform in South Asia, bridging the educational and cultural gap between Bangladesh and Germany, and helping thousands of Bangladeshi students build successful futures in Europe through the power of language.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{background:'var(--bg-secondary)'}}>
        <div className="container">
          <div className="text-center mb-12">
            <div className="section-label justify-center">Opportunity</div>
            <h2 className="font-display font-bold text-4xl md:text-5xl mb-4" style={{color:'var(--text-primary)'}}>
              Why Learn German?
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{color:'var(--text-muted)'}}>
              German is the language of opportunity for Bangladeshi students.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: BookOpen, title: 'Free University Education', desc: 'Germany offers tuition-free public universities, even for international students. German proficiency is often the only requirement.', color: '#DD0000' },
              { icon: Award, title: 'World-Class Degrees', desc: '6 of the world\'s top 100 universities are in Germany. A German degree opens doors globally.', color: '#FFCE00' },
              { icon: Globe, title: 'Work & Residency Rights', desc: 'Post-study work visas and pathways to permanent residency make Germany one of the most attractive destinations.', color: '#000' },
              { icon: Zap, title: 'Ausbildung (Vocational)', desc: 'Germany\'s dual vocational training system (Ausbildung) is world-famous. B1 German is the typical entry requirement.', color: '#DD0000' },
              { icon: Users, title: 'Bangladeshi Community', desc: 'A growing Bangladeshi community in Germany makes the transition smoother. GLAB helps connect you with that network.', color: '#FFCE00' },
              { icon: Target, title: '4th Largest Economy', desc: 'Germany is the 4th largest economy in the world, with career opportunities in engineering, IT, healthcare, and more.', color: '#000' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="card p-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{background:`${color}15`}}>
                  <Icon size={18} style={{color}} />
                </div>
                <h3 className="font-semibold mb-2" style={{color:'var(--text-primary)'}}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{color:'var(--text-muted)'}}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="section-label justify-center">How We Teach</div>
            <h2 className="font-display font-bold text-4xl mb-4" style={{color:'var(--text-primary)'}}>
              Our Teaching Methodology
            </h2>
          </div>
          <div className="space-y-6">
            {[
              { title: 'CEFR-Aligned Curriculum', desc: 'Every GLAB course is built around the Common European Framework of Reference (CEFR). This ensures our students\' skills are internationally recognized and comparable to any European standard.' },
              { title: 'Live Interactive Classes', desc: 'All classes are conducted LIVE via Zoom, not pre-recorded videos. Real-time interaction with teachers and classmates is essential for language learning.' },
              { title: 'Bangladesh-Specific Approach', desc: 'Our instructors understand the unique challenges Bangladeshi students face when learning German. We explain complex grammar in Bangla when needed and use relatable examples.' },
              { title: 'Four-Skills Integration', desc: 'Every class develops all four language skills: Reading (Lesen), Writing (Schreiben), Listening (Horen), and Speaking (Sprechen), mirroring official exam structures.' },
              { title: 'Technology-Augmented Learning', desc: 'The HelloDeutsch app complements classroom learning with vocabulary training, speaking practice, and progress tracking between sessions.' },
            ].map((item, i) => (
              <div key={i} className="flex gap-6 items-start card p-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-mono font-bold text-sm" style={{background:'#DD0000',color:'white'}}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2" style={{color:'var(--text-primary)'}}>{item.title}</h3>
                  <p className="text-sm leading-relaxed" style={{color:'var(--text-muted)'}}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section relative overflow-hidden" style={{background:'var(--bg-secondary)'}}>
        <div className="container max-w-3xl mx-auto text-center">
          <div className="section-label justify-center mb-8">Founder's Message</div>
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl font-display font-bold text-white" style={{background:'linear-gradient(135deg,#000 33%,#DD0000 33% 66%,#FFCE00 66%)'}}>
            G
          </div>
          <blockquote className="font-display text-2xl md:text-3xl italic mb-8 leading-relaxed" style={{color:'var(--text-primary)'}}>
            "Every Bangladeshi student who dreams of studying or working in Germany deserves access to world-class German education, not just those in major cities or with expensive tutors. GLAB exists to make that dream possible for everyone."
          </blockquote>
          <div className="font-bold text-lg" style={{color:'var(--text-primary)'}}>GLAB Founder</div>
          <div className="text-sm" style={{color:'var(--text-muted)'}}>German Language Academy of Bangladesh</div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="text-center mb-12">
            <div className="section-label justify-center">Journey</div>
            <h2 className="font-display font-bold text-4xl mb-4" style={{color:'var(--text-primary)'}}>
              The GLAB Story
            </h2>
          </div>
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <div className="absolute left-16 md:left-1/2 top-0 bottom-0 w-0.5" style={{background:'linear-gradient(to bottom,#000,#DD0000,#FFCE00)',transform:'translateX(-50%)'}} />
              <div className="space-y-10">
                {timeline.map((item, i) => (
                  <div key={i} className={`flex items-start gap-6 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} relative`}>
                    <div className={`flex-1 ${i % 2 === 0 ? 'md:text-right' : 'md:text-left'} pl-24 md:pl-0`}>
                      <div className="card p-5 inline-block text-left">
                        <div className="font-mono text-xs mb-1" style={{color:'var(--text-muted)'}}>{item.year}</div>
                        <h3 className="font-bold mb-1" style={{color:'var(--text-primary)'}}>{item.title}</h3>
                        <p className="text-sm" style={{color:'var(--text-muted)'}}>{item.desc}</p>
                      </div>
                    </div>
                    <div className="absolute left-12 md:relative md:left-auto flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10 font-bold text-white text-xs" style={{background:item.color}}>
                      {i + 1}
                    </div>
                    <div className="hidden md:block flex-1" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{background:'var(--bg-secondary)'}}>
        <div className="container text-center">
          <h2 className="font-display font-bold text-4xl mb-4" style={{color:'var(--text-primary)'}}>
            Join the GLAB Family
          </h2>
          <p className="text-lg mb-8 max-w-xl mx-auto" style={{color:'var(--text-muted)'}}>
            Start your German learning journey with 500+ students who trust GLAB.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/courses" className="btn-primary">Explore Courses <ArrowRight size={14} /></Link>
            <Link href="/contact" className="btn-secondary">Contact Us</Link>
          </div>
        </div>
      </section>
    </>
  )
}
