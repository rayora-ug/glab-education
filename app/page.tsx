import HomePage from './home-client'
import { getReviews } from '@/lib/reviews'
import { getAnnouncements } from '@/lib/announcements'

export default async function Page() {
  const reviews = await getReviews()
  const announcements = await getAnnouncements()
  return <HomePage reviews={reviews} announcements={announcements} />
}
