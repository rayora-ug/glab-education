import './globals.css'
import type { Metadata } from 'next'
import NavFooter from '../components/NavFooter'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.glab.com.bd'),
  title: {
    default: 'GLAB – German Language Academy of Bangladesh | Learn German Online',
    template: '%s | GLAB',
  },
  description: 'GLAB helps Bangladeshi students learn German and prepare for studies, careers, and life in Germany through structured online courses and digital learning tools.',
  keywords: ['German language course Bangladesh', 'learn German online', 'A1 A2 B1 B2 German course', 'Goethe Institut exam preparation', 'GLAB', 'HelloDeutsch'],
  authors: [{ name: 'GLAB' }],
  openGraph: {
    title: 'GLAB – German Language Academy of Bangladesh',
    description: 'Learn German. Build Your Future. Structured online German courses for Bangladeshi students.',
    url: 'https://www.glab.com.bd',
    siteName: 'GLAB',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GLAB – German Language Academy of Bangladesh',
    description: 'Learn German. Build Your Future.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="theme-color" content="#DD0000" />
        <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='33.33' fill='%23000'/%3E%3Crect y='33.33' width='100' height='33.33' fill='%23DD0000'/%3E%3Crect y='66.66' width='100' height='33.34' fill='%23FFCE00'/%3E%3C/svg%3E" />
      </head>
      <body>
        <NavFooter>{children}</NavFooter>
      </body>
    </html>
  )
}
