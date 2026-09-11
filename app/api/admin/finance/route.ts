import { NextResponse } from 'next/server'
import { requireAdmin, callAdminAction } from '@/lib/adminApi'

export async function POST() {
  const denied = await requireAdmin()
  if (denied) return denied

  const data = await callAdminAction('adminListFinance')
  return NextResponse.json(data)
}
