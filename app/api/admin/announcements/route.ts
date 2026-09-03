import { NextResponse } from 'next/server'
import { requireAdmin, callAdminAction } from '@/lib/adminApi'

export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const body = await request.json()
  if (!body.title || !body.content) {
    return NextResponse.json({ success: false, error: 'Title and content are required.' }, { status: 400 })
  }

  const data = await callAdminAction('adminAddAnnouncement', {
    title: body.title,
    excerpt: body.excerpt,
    content: body.content,
    date: body.date,
    category: body.category,
    important: !!body.important,
  })
  return NextResponse.json(data)
}
