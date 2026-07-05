'use client'

import { useState } from 'react'
import { Star, ExternalLink, CheckCircle, Quote, Filter } from 'lucide-react'
import reviewsData from '../../data/reviews.json'

const data = reviewsData as any

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={14} fill={i <= rating ? '#FFCE00' : 'none'} style={{color: i <= rating ? '#FFCE00' : 'var(--border)'}} />
      ))}
    </div>
  )
}

export default function ReviewsPage() {
  const [filter, setFilter] = useState('All')
  const levels = ['All', ...Array.from(new Set(data.reviews.map((r: any) => r.level)))] as string[]
  const filtered = filter === 'All' ? data.reviews : data.reviews.filter((r: any) => r.level === filter)

  return (
    <>
      <section className="section pt-8" style={{background:'var(--bg-secondary)'}}>
        <div className="container">
          <div className="german-stripe mb-8 rounded-full" />
          <div className="section-label">Testimonials</div>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-8">
            <div>
              <h1 className="font-display font-black text-5xl md:text-6xl mb-4" style={{color:'var(--text-primary)'}}>
                Student Reviews
              </h1>
              <p className="text-xl" style={{color:'var(--text-muted)'}}>
                Real stories from real students who built their future with GLAB.
              </p>
            </div>

            <div className="card p-6 text-center min-w-[200px]">
              <div className="font-display font-black text-6xl mb-1" style={{background:'linear-gradient(135deg,#FFCE00,#FF9900)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>
                {data.averageRating}
              </div>
              <div className="flex justify-center gap-1 mb-2">
                {[1,2,3,4,5].map(i => <Star key={i} size={20} fill="#FFCE00" style={{color:'#FFCE00'}} />)}
              </div>
              <div className="text-sm font-semibold mb-1" style={{color:'var(--text-primary)'}}>Excellent Rating</div>
              <div className="text-xs" style={{color:'var(--text-muted)'}}>{data.totalReviews}+ verified reviews</div>
            </div>
          </div>

          <a href={data.facebookLink} target="_blank" rel="noopener noreferrer" className="btn-primary">
            Leave a Review on Facebook <ExternalLink size={14} />
          </a>
        </div>
      </section>

      <div className="py-6" style={{background:'var(--bg-secondary)',borderBottom:'1px solid var(--border)'}}>
        <div className="container">
          <div className="flex flex-wrap gap-2 items-center">
            <Filter size={14} style={{color:'var(--text-muted)'}} />
            <span className="text-sm font-medium mr-2" style={{color:'var(--text-muted)'}}>Filter by course:</span>
            {levels.map(l => (
              <button key={l} onClick={() => setFilter(l)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                style={{
                  background: filter === l ? '#DD0000' : 'var(--card-bg)',
                  color: filter === l ? 'white' : 'var(--text-secondary)',
                  borderColor: filter === l ? '#DD0000' : 'var(--border)'
                }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="section">
        <div className="container">
          {filter === 'All' && (
            <>
              <div className="section-label mb-6">Featured Stories</div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                {data.reviews.filter((r: any) => r.featured).slice(0, 2).map((r: any) => (
                  <div key={r.id} className="card p-8 relative overflow-hidden" style={{background:'linear-gradient(135deg,var(--card-bg),var(--bg-secondary))'}}>
                    <div className="absolute top-0 left-0 w-1 h-full" style={{background:'linear-gradient(to bottom,#000,#DD0000,#FFCE00)'}} />
                    <Quote size={40} className="absolute top-6 right-6 opacity-5" />
                    <StarDisplay rating={r.rating} />
                    <p className="text-base italic my-4 leading-relaxed font-display" style={{color:'var(--text-primary)'}}>
                      "{r.text}"
                    </p>
                    <div className="flex items-center justify-between mt-4 pt-4" style={{borderTop:'1px solid var(--border)'}}>
                      <div>
                        <div className="font-bold flex items-center gap-1.5" style={{color:'var(--text-primary)'}}>
                          {r.name}
                          {r.verified && <CheckCircle size={14} style={{color:'#16a34a'}} />}
                        </div>
                        <div className="text-xs" style={{color:'var(--text-muted)'}}>{r.level} · {r.location}</div>
                      </div>
                      {r.outcome && (
                        <span className="badge badge-gold text-xs">{r.outcome}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="section-label mb-6">{filter === 'All' ? 'All Reviews' : `${filter} Reviews`}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((r: any) => (
              <div key={r.id} className="card p-6">
                <div className="flex items-start justify-between mb-3">
                  <StarDisplay rating={r.rating} />
                  <span className="text-xs" style={{color:'var(--text-muted)'}}>{new Date(r.date).toLocaleDateString('en-GB', {month:'short',year:'numeric'})}</span>
                </div>
                <p className="text-sm italic mb-4 leading-relaxed" style={{color:'var(--text-secondary)'}}>"{r.text}"</p>
                <div className="pt-3" style={{borderTop:'1px solid var(--border)'}}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-1" style={{color:'var(--text-primary)'}}>
                        {r.name}
                        {r.verified && <CheckCircle size={12} style={{color:'#16a34a'}} />}
                      </div>
                      <div className="text-xs" style={{color:'var(--text-muted)'}}>{r.level} · {r.location}</div>
                    </div>
                  </div>
                  {r.outcome && (
                    <span className="badge badge-gold text-xs mt-2 block w-fit">{r.outcome}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-16 p-10 card">
            <h2 className="font-display font-bold text-3xl mb-3" style={{color:'var(--text-primary)'}}>Share Your GLAB Story</h2>
            <p className="mb-6" style={{color:'var(--text-muted)'}}>Did GLAB help you achieve your German language goals? We'd love to hear from you!</p>
            <a href={data.facebookLink} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Leave a Review on Facebook <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
