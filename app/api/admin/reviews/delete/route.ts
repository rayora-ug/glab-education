import { NextResponse } from 'next/server'
import { requireAdmin, callAdminAction } from '@/lib/adminApi'

export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { row } = await request.json()
  if (!row) {
    return NextResponse.json({ success: false, error: 'Row is required.' }, { status: 400 })
  }

  const data = await callAdminAction('adminDeleteReview', { row })
  return NextResponse.json(data)
}
