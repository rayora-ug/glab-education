import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_PREFIXES = ['/portal', '/api/portal', '/_next', '/favicon.ico', '/manifest.json', '/robots.txt', '/sitemap.xml']

export function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_LOCKDOWN_MODE !== 'true') return NextResponse.next()

  const { pathname } = request.nextUrl
  const allowed = ALLOWED_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/') || pathname.startsWith(prefix))
  if (allowed) return NextResponse.next()

  return NextResponse.redirect(new URL('/portal/', request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
