import { NextResponse } from 'next/server'
import { requireAdmin, callAdminAction } from '@/lib/adminApi'

export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { rows } = await request.json()
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ success: false, error: 'No rows selected.' }, { status: 400 })
  }

  const data = await callAdminAction('adminApplyApplicationCleanup', { rows })
  return NextResponse.json(data)
}
