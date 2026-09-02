import { NextResponse } from 'next/server'
import { requireAdmin, callAdminAction } from '@/lib/adminApi'

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  const data = await callAdminAction('adminGetA1IdSettings')
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { prefix, nextSeq } = await request.json()
  if (!prefix || typeof prefix !== 'string') {
    return NextResponse.json({ success: false, error: 'Prefix is required.' }, { status: 400 })
  }
  const seq = Number(nextSeq)
  if (!Number.isInteger(seq) || seq < 1) {
    return NextResponse.json({ success: false, error: 'A valid next number is required.' }, { status: 400 })
  }

  const data = await callAdminAction('adminSetA1IdSettings', { prefix, nextSeq: seq })
  return NextResponse.json(data)
}
