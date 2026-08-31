import { NextResponse } from 'next/server'
import { requireAdmin, callAdminAction } from '@/lib/adminApi'

export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { glabId, timestamp, level } = await request.json()
  if (!glabId || !timestamp || !level) {
    return NextResponse.json({ success: false, error: 'GLAB ID, timestamp, and level are required.' }, { status: 400 })
  }

  const data = await callAdminAction('adminApproveInterest', { glabId, timestamp, level })
  return NextResponse.json(data)
}
