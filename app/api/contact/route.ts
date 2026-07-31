import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const scriptUrl = process.env.GLAB_SCRIPT_URL
  const token = process.env.GLAB_SCRIPT_TOKEN
  if (!scriptUrl || !token) {
    return NextResponse.json({ success: false, error: 'The contact form is not configured yet.' }, { status: 500 })
  }

  const { name, email, subject, message } = await request.json()
  if (!name || !email || !message) {
    return NextResponse.json({ success: false, error: 'Name, email, and message are required.' }, { status: 400 })
  }

  const res = await fetch(scriptUrl, {
    method: 'POST',
    body: JSON.stringify({ action: 'submitContact', token, name, email, subject, message }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
