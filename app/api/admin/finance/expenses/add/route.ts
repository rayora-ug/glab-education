import { NextResponse } from 'next/server'
import { requireAdmin, callAdminAction } from '@/lib/adminApi'

export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { date, description, amount, location, paidFrom } = await request.json()
  if (!description || typeof description !== 'string' || !description.trim()) {
    return NextResponse.json({ success: false, error: 'Description is required.' }, { status: 400 })
  }
  if (!amount || isNaN(Number(amount))) {
    return NextResponse.json({ success: false, error: 'Amount is required.' }, { status: 400 })
  }

  const data = await callAdminAction('adminAddFinanceExpense', {
    date: date || '', description: description.trim(), amount: Number(amount),
    location: location || '', paidFrom: paidFrom || '',
  })
  return NextResponse.json(data)
}
