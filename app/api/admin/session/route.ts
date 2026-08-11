import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isValidAdminToken, COOKIE_NAME } from '@/lib/adminAuth'

export async function GET() {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  return NextResponse.json({ authenticated: isValidAdminToken(token) })
}
