import HomePage from './home-client'
import { getReviews } from '@/lib/reviews'

export default async function Page() {
  const reviews = await getReviews()
  return <HomePage reviews={reviews} />
}
