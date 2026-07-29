'use client'

import { BookOpen, ExternalLink, ShoppingCart } from 'lucide-react'
import booksData from '../../data/books.json'

type Book = { level: string; title: string; affiliateLink: string }

function groupByLevel(books: Book[]) {
  const groups: Record<string, Book[]> = {}
  for (const b of books) {
    const key = b.level.split('.')[0]
    if (!groups[key]) groups[key] = []
    groups[key].push(b)
  }
  return groups
}

function BookCard({ book }: { book: Book }) {
  return (
    <div className="card p-6 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold" style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
          {book.level}
        </span>
      </div>
      <div className="flex items-start gap-3 mb-5 flex-1">
        <BookOpen size={20} className="mt-0.5 flex-shrink-0" style={{ color: '#DD0000' }} />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedBooks.map(book => (
              <BookCard key={book.title} book={book} />
            ))}
          </div>
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
