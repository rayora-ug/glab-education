import staticReviews from '../data/reviews.json'

export type Review = {
  id: number | string
  name: string
  location: string
  rating: number
  date: string
  level: string
  text: string
  outcome: string
  featured: boolean
  verified: boolean
}

export type ReviewsData = {
  averageRating: number
  totalReviews: number
  facebookLink: string
  reviews: Review[]
}

const fallback = staticReviews as ReviewsData

// The historical reviews collected before this feature existed live in
// data/reviews.json (frozen at build time) — new reviews added via the
// admin panel's "Add Review" form go straight to the "Reviews" Google Sheet
// tab and appear here immediately, no redeploy needed. Combining both
// avoids a risky one-time bulk migration of the existing reviews (many with
// multi-paragraph text) into the sheet.
export async function getReviews(): Promise<ReviewsData> {
  const scriptUrl = process.env.GLAB_SCRIPT_URL
  const token = process.env.GLAB_SCRIPT_TOKEN
  if (!scriptUrl || !token) return fallback

  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'getPublishedReviews', token }),
      cache: 'no-store',
    })
    const data = await res.json()
    if (!data.success) return fallback

    const combined: Review[] = [...fallback.reviews, ...data.reviews]
    combined.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

    const ratings = combined.map(r => r.rating).filter((n): n is number => typeof n === 'number' && !isNaN(n))
    const averageRating = ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : fallback.averageRating

    return {
      averageRating,
      totalReviews: combined.length,
      facebookLink: fallback.facebookLink,
      reviews: combined,
    }
  } catch {
    return fallback
  }
}
