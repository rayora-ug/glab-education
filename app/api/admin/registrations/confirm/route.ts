import { NextResponse } from 'next/server'
import { requireAdmin, callAdminAction } from '@/lib/adminApi'

export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { glabId, timestamp } = await request.json()
  if (!glabId || !timestamp) {
    return NextResponse.json({ success: false, error: 'GLAB ID and timestamp are required.' }, { status: 400 })
  }

  const data = await callAdminAction('adminConfirmRegistration', { glabId, timestamp })
  return NextResponse.json(data)
}
