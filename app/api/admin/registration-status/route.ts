import { NextResponse } from 'next/server'
import { requireAdmin, callAdminAction } from '@/lib/adminApi'

export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { open } = await request.json()
  const data = await callAdminAction('adminSetRegistrationOpen', { open: !!open })
  return NextResponse.json(data)
}
