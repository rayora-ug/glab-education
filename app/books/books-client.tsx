'use client'

import { useState } from 'react'
import { BookOpen, ExternalLink, ShoppingCart } from 'lucide-react'
import booksData from '../../data/books.json'

type Book = { level: string; title: string; affiliateLink: string; coverImage?: string }

function groupByLevel(books: Book[]) {
  const groups: Record<string, Book[]> = {}
  for (const b of books) {
    const key = b.level.split('.')[0]
    if (!groups[key]) groups[key] = []
    groups[key].push(b)
  }
  return groups
}

function BookCover({ book }: { book: Book }) {
  const [broken, setBroken] = useState(false)

  if (!book.coverImage || broken) {
    return (
      <a
        href={book.affiliateLink}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="w-full aspect-[3/4] rounded-lg mb-4 flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        <BookOpen size={32} style={{ color: 'var(--text-muted)' }} />
      </a>
    )
  }

  return (
    <a
      href={book.affiliateLink}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="w-full aspect-[3/4] rounded-lg mb-4 overflow-hidden flex-shrink-0"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={book.coverImage}
        alt={`Cover of ${book.title}`}
        loading="lazy"
        onError={() => setBroken(true)}
        className="w-full h-full object-cover"
      />
    </a>
  )
}

function BookCard({ book }: { book: Book }) {
  return (
    <div className="card p-6 flex flex-col">
      <BookCover book={book} />
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold" style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
          {book.level}
        </span>
      </div>
      <div className="mb-5 flex-1">
        <h3 className="font-display font-bold text-lg leading-snug" style={{ color: 'var(--text-primary)' }}>{book.title}</h3>
      </div>
      <a href={book.affiliateLink} target="_blank" rel="noopener noreferrer sponsored" className="btn-primary w-full justify-center">
        <ShoppingCart size={14} /> Buy on Amazon
      </a>
    </div>
  )
}

export default function BooksPage() {
  const { courseBooks, recommendedBooks } = booksData as { courseBooks: Book[]; recommendedBooks: Book[] }
  const grouped = groupByLevel(courseBooks)
  const levelOrder = ['A1', 'A2', 'B1']

  const b2Books = recommendedBooks.filter(b => b.level === 'B2')
  const otherRecommendedBooks = recommendedBooks.filter(b => b.level !== 'B2')

  return (
    <>
      <section className="section pt-8" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="german-stripe mb-8 rounded-full" />
          <div className="section-label">Study Materials</div>
          <h1 className="font-display font-black text-5xl md:text-6xl mb-4" style={{ color: 'var(--text-primary)' }}>
            Recommended Books
          </h1>
          <p className="text-xl max-w-2xl" style={{ color: 'var(--text-muted)' }}>
            The textbooks used in GLAB courses, plus a few extra picks for exam prep and specialized German.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-label">Course Books</div>
          <h2 className="font-display font-bold text-3xl mb-8" style={{ color: 'var(--text-primary)' }}>
            Textbooks Used in Our Courses
          </h2>

          {levelOrder.map(level => (
            grouped[level] && (
              <div key={level} className="mb-10 last:mb-0">
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
                  {level} Level
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {grouped[level].map(book => (
                    <BookCard key={book.title} book={book} />
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      </section>

      <section className="section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="section-label">Also Recommended</div>
          <h2 className="font-display font-bold text-3xl mb-8" style={{ color: 'var(--text-primary)' }}>
            More Books We Recommend
          </h2>

          {b2Books.length > 0 && (
            <div className="mb-10">
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
                B2 Level
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {b2Books.map(book => (
                  <BookCard key={book.title} book={book} />
                ))}
              </div>
            </div>
          )}

          {otherRecommendedBooks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
                Other Books
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {otherRecommendedBooks.map(book => (
                  <BookCard key={book.title} book={book} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="text-xs max-w-2xl mx-auto text-center flex items-center justify-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <ExternalLink size={12} />
            As an Amazon Associate, GLAB (Rayora UG) earns from qualifying purchases made through these links, at no extra cost to you.
          </p>
        </div>
      </section>
    </>
  )
}
