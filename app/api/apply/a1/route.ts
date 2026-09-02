import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const scriptUrl = process.env.GLAB_SCRIPT_URL
  const token = process.env.GLAB_SCRIPT_TOKEN
  if (!scriptUrl || !token) {
    return NextResponse.json({ success: false, error: 'A1 applications are not configured yet.' }, { status: 500 })
  }

  const { name, email, dob, phone } = await request.json()
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ success: false, error: 'Name is required.' }, { status: 400 })
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ success: false, error: 'A valid email address is required.' }, { status: 400 })
  }
  if (!dob || typeof dob !== 'string') {
    return NextResponse.json({ success: false, error: 'Date of birth is required.' }, { status: 400 })
  }

  const res = await fetch(scriptUrl, {
    method: 'POST',
    body: JSON.stringify({
      action: 'submitA1Application', token,
      name: name.trim(), email: email.trim(), dob: dob.trim(),
      phone: typeof phone === 'string' ? phone.trim() : '',
    }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
