import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const scriptUrl = process.env.GLAB_SCRIPT_URL
  const token = process.env.GLAB_SCRIPT_TOKEN
  if (!scriptUrl || !token) {
    return NextResponse.json({ success: false, error: 'Results lookup is not configured yet.' }, { status: 500 })
  }

  const { email, phone } = await request.json()
  if (!email || typeof email !== 'string' || !phone || typeof phone !== 'string') {
    return NextResponse.json({ success: false, error: 'Email and WhatsApp number are required.' }, { status: 400 })
  }

  const res = await fetch(scriptUrl, {
    method: 'POST',
    body: JSON.stringify({ action: 'checkApplication', token, email: email.trim(), phone: phone.trim() }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
