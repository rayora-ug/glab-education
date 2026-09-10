import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const scriptUrl = process.env.GLAB_SCRIPT_URL
  const token = process.env.GLAB_SCRIPT_TOKEN
  if (!scriptUrl || !token) {
    return NextResponse.json({ success: false, error: 'This isn\'t configured yet.' }, { status: 500 })
  }

  const body = await request.json()
  const { name, email, whatsappNumber } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ success: false, error: 'Name is required.' }, { status: 400 })
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ success: false, error: 'A valid email address is required.' }, { status: 400 })
  }
  if (!whatsappNumber || typeof whatsappNumber !== 'string' || !whatsappNumber.trim()) {
    return NextResponse.json({ success: false, error: 'WhatsApp number is required.' }, { status: 400 })
  }

  const res = await fetch(scriptUrl, {
    method: 'POST',
    body: JSON.stringify({
      action: 'submitA1Waitlist', token,
      name: name.trim(), email: email.trim(), whatsappNumber: whatsappNumber.trim(),
    }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
