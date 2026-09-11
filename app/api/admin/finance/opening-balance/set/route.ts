import { NextResponse } from 'next/server'
import { requireAdmin, callAdminAction } from '@/lib/adminApi'

export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { openingBD, openingDE } = await request.json()
  const data = await callAdminAction('adminSetFinanceOpeningBalance', { openingBD: Number(openingBD) || 0, openingDE: Number(openingDE) || 0 })
  return NextResponse.json(data)
}
