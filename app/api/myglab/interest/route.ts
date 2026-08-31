import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const scriptUrl = process.env.GLAB_SCRIPT_URL
  const token = process.env.GLAB_SCRIPT_TOKEN
  if (!scriptUrl || !token) {
    return NextResponse.json({ success: false, error: 'MyGLAB is not configured yet.' }, { status: 500 })
  }

  const { glabId, level, batch, email } = await request.json()
  if (!glabId || typeof glabId !== 'string') {
    return NextResponse.json({ success: false, error: 'GLAB ID is required.' }, { status: 400 })
  }
  if (level !== 'A2' && level !== 'B1') {
    return NextResponse.json({ success: false, error: 'Level must be A2 or B1.' }, { status: 400 })
  }
  if (!batch || typeof batch !== 'string') {
    return NextResponse.json({ success: false, error: 'Batch is required.' }, { status: 400 })
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ success: false, error: 'A valid email address is required.' }, { status: 400 })
  }

  const res = await fetch(scriptUrl, {
    method: 'POST',
    body: JSON.stringify({ action: 'submitInterest', token, glabId: glabId.trim(), level, batch, email: email.trim() }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
