import { NextResponse } from 'next/server'
import { requireAdmin, callAdminAction } from '@/lib/adminApi'

export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { glabId, blocked } = await request.json()
  if (!glabId || typeof glabId !== 'string') {
    return NextResponse.json({ success: false, error: 'GLAB ID is required.' }, { status: 400 })
  }

  const data = await callAdminAction('adminSetStudentBlocked', { glabId: glabId.trim(), blocked: !!blocked })
  return NextResponse.json(data)
}
