import type { Metadata } from 'next'
import AnnouncementsPage from './announcements-client'

export const metadata: Metadata = {
  title: 'Announcements',
  description: 'Latest news, course registration updates, workshops, and exam preparation announcements from GLAB.',
  openGraph: {
    title: 'Announcements – GLAB',
    description: 'Stay up to date with the latest news from GLAB.',
  },
}

export default function Page() {
  return <AnnouncementsPage />
}
