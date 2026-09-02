import { NextResponse } from 'next/server'
import { requireAdmin, callAdminAction } from '@/lib/adminApi'

export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { email, dob, batchLabel, batchId } = await request.json()
  if (!email || !dob) {
    return NextResponse.json({ success: false, error: 'Email and date of birth are required.' }, { status: 400 })
  }

  const data = await callAdminAction('adminSelectApplicant', { email, dob, batchLabel, batchId })
  return NextResponse.json(data)
}
