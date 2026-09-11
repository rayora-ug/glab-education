import { NextResponse } from 'next/server'
import { requireAdmin, callAdminAction } from '@/lib/adminApi'

export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { sessionCode } = await request.json()
  if (!sessionCode) {
    return NextResponse.json({ success: false, error: 'Session code is required.' }, { status: 400 })
  }

  const data = await callAdminAction('adminDeleteFinanceSession', { sessionCode })
  return NextResponse.json(data)
}
