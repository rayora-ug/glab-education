import type { Metadata } from 'next'
import AboutPage from './about-client'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about GLAB\'s mission, vision, teaching methodology, and our journey helping Bangladeshi students learn German since 2023.',
  openGraph: {
    title: 'About GLAB – German Language Academy of Bangladesh',
    description: 'Learn German. Build Your Future. Our mission, vision, and journey.',
  },
}

export default function Page() {
  return <AboutPage />
}
