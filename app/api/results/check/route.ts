import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const scriptUrl = process.env.GLAB_SCRIPT_URL
  const token = process.env.GLAB_SCRIPT_TOKEN
  if (!scriptUrl || !token) {
    return NextResponse.json({ success: false, error: 'Results lookup is not configured yet.' }, { status: 500 })
  }

  const { email, dob } = await request.json()
  if (!email || typeof email !== 'string' || !dob || typeof dob !== 'string') {
    return NextResponse.json({ success: false, error: 'Email and date of birth are required.' }, { status: 400 })
  }

  const res = await fetch(scriptUrl, {
    method: 'POST',
    body: JSON.stringify({ action: 'checkApplication', token, email: email.trim(), dob: dob.trim() }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
