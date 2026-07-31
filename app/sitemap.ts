import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://glabeducation.com'
  const routes = [
    '', '/courses', '/apply', '/portal', '/results', '/announcements',
    '/reviews', '/books', '/about', '/contact',
    '/impressum', '/privacy', '/terms',
  ]

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }))
}
