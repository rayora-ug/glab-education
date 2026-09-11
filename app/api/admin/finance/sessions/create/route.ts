import { NextResponse } from 'next/server'
import { requireAdmin, callAdminAction } from '@/lib/adminApi'

export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { sessionCode, startDate, endDate } = await request.json()
  if (!sessionCode || typeof sessionCode !== 'string' || !sessionCode.trim()) {
    return NextResponse.json({ success: false, error: 'Session code is required.' }, { status: 400 })
  }
  if (!startDate || !endDate) {
    return NextResponse.json({ success: false, error: 'Start date and end date are required.' }, { status: 400 })
  }

  const data = await callAdminAction('adminCreateFinanceSession', { sessionCode: sessionCode.trim(), startDate, endDate })
  return NextResponse.json(data)
}
