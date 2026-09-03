import staticAnnouncements from '../data/announcements.json'

export type Announcement = {
  id: number | string
  title: string
  excerpt: string
  content: string
  date: string
  category: string
  important: boolean
}

const fallback = staticAnnouncements as Announcement[]

// Historical announcements before this feature existed live in
// data/announcements.json (frozen at build time) — new ones added via the
// admin panel's "Add Announcement" form go straight to the "Announcements"
// Google Sheet tab and appear here immediately, no redeploy needed. Same
// pattern as getReviews() in lib/reviews.ts.
export async function getAnnouncements(): Promise<Announcement[]> {
  const scriptUrl = process.env.GLAB_SCRIPT_URL
  const token = process.env.GLAB_SCRIPT_TOKEN
  if (!scriptUrl || !token) return fallback

  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'getPublishedAnnouncements', token }),
      cache: 'no-store',
    })
    const data = await res.json()
    if (!data.success) return fallback

    const combined: Announcement[] = [...fallback, ...data.announcements]
    combined.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    return combined
  } catch {
    return fallback
  }
}
