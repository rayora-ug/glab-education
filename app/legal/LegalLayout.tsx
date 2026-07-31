'use client'

export function LegalLayout({ label, title, updated, children }: { label: string; title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <section className="section pt-8" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="german-stripe mb-8 rounded-full" />
          <div className="section-label">{label}</div>
          <h1 className="font-display font-black text-4xl md:text-5xl mb-3" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Last updated: {updated}</p>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-3xl">
          <div className="space-y-8">{children}</div>
        </div>
      </section>
    </>
  )
}

export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display font-bold text-xl mb-3" style={{ color: 'var(--text-primary)' }}>{heading}</h2>
      <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {children}
      </div>
    </div>
  )
}
