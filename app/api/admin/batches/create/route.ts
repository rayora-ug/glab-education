import { NextResponse } from 'next/server'
import { requireAdmin, callAdminAction } from '@/lib/adminApi'

export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { batchId, whatsappLink, classroomLink, meetLink, startDate, endDate } = await request.json()
  if (!batchId || typeof batchId !== 'string' || !batchId.trim()) {
    return NextResponse.json({ success: false, error: 'Batch ID is required.' }, { status: 400 })
  }

  const data = await callAdminAction('adminCreateBatch', {
    batchId: batchId.trim(),
    whatsappLink: whatsappLink || '',
    classroomLink: classroomLink || '',
    meetLink: meetLink || '',
    startDate: startDate || '',
    endDate: endDate || '',
  })
  return NextResponse.json(data)
}
