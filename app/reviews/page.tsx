import type { Metadata } from 'next'
import ReviewsPage from './reviews-client'

export const metadata: Metadata = {
  title: 'Student Reviews',
  description: 'Read real reviews and success stories from GLAB students who passed Goethe-Institut exams and built their future in Germany.',
  openGraph: {
    title: 'Student Reviews – GLAB',
    description: 'Real stories from real students who built their future with GLAB.',
  },
}

export default function Page() {
  return <ReviewsPage />
}
