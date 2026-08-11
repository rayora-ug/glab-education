import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_PREFIXES = ['/apply', '/portal', '/api/portal', '/results', '/api/results', '/dashboard', '/api/dashboard', '/admin', '/api/admin', '/api/registration-status', '/pruefung', '/api/exam', '/books', '/about', '/courses', '/reviews', '/verify', '/api/verify', '/announcements', '/impressum', '/privacy', '/terms', '/contact', '/api/contact', '/_next', '/favicon.ico', '/manifest.json', '/robots.txt', '/sitemap.xml']

export function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_LOCKDOWN_MODE !== 'true') return NextResponse.next()

  const { pathname } = request.nextUrl
  if (pathname === '/') return NextResponse.next()
  const allowed = ALLOWED_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/') || pathname.startsWith(prefix))
  if (allowed) return NextResponse.next()

  return NextResponse.redirect(new URL('/', request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
