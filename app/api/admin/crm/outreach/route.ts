import { NextResponse } from 'next/server'
import { requireAdmin, callAdminAction } from '@/lib/adminApi'

export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { recipients, subject, messageBody } = await request.json()
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ success: false, error: 'No recipients selected.' }, { status: 400 })
  }
  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    return NextResponse.json({ success: false, error: 'Subject is required.' }, { status: 400 })
  }
  if (!messageBody || typeof messageBody !== 'string' || !messageBody.trim()) {
    return NextResponse.json({ success: false, error: 'Message body is required.' }, { status: 400 })
  }

  const data = await callAdminAction('adminSendOutreach', { recipients, subject: subject.trim(), messageBody })
  return NextResponse.json(data)
}
