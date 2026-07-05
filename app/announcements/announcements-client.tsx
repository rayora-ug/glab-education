'use client'

import { useState } from 'react'
import { Search, Clock, ArrowRight } from 'lucide-react'
import announcementsData from '../../data/announcements.json'

const CATEGORIES = ['All', 'Course Registration', 'Events', 'Workshops', 'Exam Preparation', 'General Updates']
const PER_PAGE = 4

export default function AnnouncementsPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<number | null>(null)

  const filtered = (announcementsData as any[]).filter(a => {
    const matchCat = category === 'All' || a.category === category
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.excerpt.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <>
      <section className="section pt-8" style={{background:'var(--bg-secondary)'}}>
        <div className="container">
          <div className="german-stripe mb-8 rounded-full" />
          <div className="section-label">News & Updates</div>
          <h1 className="font-display font-black text-5xl md:text-6xl mb-4" style={{color:'var(--text-primary)'}}>
            Announcements
          </h1>
          <p className="text-xl mb-8" style={{color:'var(--text-muted)'}}>
            Stay up to date with the latest news from GLAB.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{color:'var(--text-muted)'}} />
              <input
                type="text"
                placeholder="Search announcements..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="input pl-10"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => { setCategory(cat); setPage(1) }}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all border"
                style={{
                  background: category === cat ? '#DD0000' : 'var(--card-bg)',
                  color: category === cat ? 'white' : 'var(--text-secondary)',
                  borderColor: category === cat ? '#DD0000' : 'var(--border)'
                }}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {paginated.length === 0 ? (
            <div className="text-center py-20">
              <h3 className="font-display font-bold text-2xl mb-2" style={{color:'var(--text-primary)'}}>No results found</h3>
              <p style={{color:'var(--text-muted)'}}>Try a different search term or category.</p>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {paginated.map((a: any) => (
                <div key={a.id} className="card overflow-hidden">
                  <div className="p-6 md:p-8">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className="badge badge-gold">{a.category}</span>
                      {a.important && <span className="badge badge-red">Important</span>}
                      <span className="flex items-center gap-1.5 text-xs ml-auto" style={{color:'var(--text-muted)'}}>
                        <Clock size={12} />
                        {new Date(a.date).toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'})}
                      </span>
                    </div>

                    <h2 className="font-display font-bold text-2xl mb-3" style={{color:'var(--text-primary)'}}>{a.title}</h2>
                    <p className="mb-4" style={{color:'var(--text-secondary)'}}>{a.excerpt}</p>

                    {expanded === a.id && (
                      <div className="mt-4 pt-4 leading-relaxed" style={{color:'var(--text-secondary)',borderTop:'1px solid var(--border)'}}>
                        {a.content}
                      </div>
                    )}

                    <button
                      onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                      className="flex items-center gap-2 text-sm font-semibold mt-4 transition-colors hover:text-red-600"
                      style={{color:'#DD0000'}}>
                      {expanded === a.id ? 'Show less' : 'Read full announcement'}
                      <ArrowRight size={14} style={{transform: expanded === a.id ? 'rotate(90deg)' : 'none', transition:'transform 0.2s'}} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-12">
              {Array.from({length: totalPages}, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className="w-10 h-10 rounded-lg text-sm font-semibold transition-all border"
                  style={{
                    background: page === p ? '#DD0000' : 'var(--card-bg)',
                    color: page === p ? 'white' : 'var(--text-secondary)',
                    borderColor: page === p ? '#DD0000' : 'var(--border)'
                  }}>
                  {p}
                </button>
              ))}
            </div>
          )}

          <div className="text-center mt-4 text-sm" style={{color:'var(--text-muted)'}}>
            Showing {paginated.length} of {filtered.length} announcements
          </div>
        </div>
      </section>
    </>
  )
}
