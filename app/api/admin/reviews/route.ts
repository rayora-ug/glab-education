import { NextResponse } from 'next/server'
import { requireAdmin, callAdminAction } from '@/lib/adminApi'

export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const body = await request.json()
  const data = await callAdminAction('adminAddReview', {
    name: body.name,
    location: body.location,
    rating: body.rating,
    date: body.date,
    level: body.level,
    text: body.text,
    outcome: body.outcome,
    featured: !!body.featured,
  })
  return NextResponse.json(data)
}
