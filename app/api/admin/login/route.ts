import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { signAdminToken, COOKIE_NAME } from '@/lib/adminAuth'

const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    return NextResponse.json({ success: false, error: 'Admin login is not configured yet.' }, { status: 500 })
  }

  const { password } = await request.json()
  if (!password || typeof password !== 'string' || !safeEqual(password, adminPassword)) {
    return NextResponse.json({ success: false, error: 'Incorrect password.' }, { status: 401 })
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set(COOKIE_NAME, signAdminToken(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  return res
}
