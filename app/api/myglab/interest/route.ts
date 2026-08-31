import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const scriptUrl = process.env.GLAB_SCRIPT_URL
  const token = process.env.GLAB_SCRIPT_TOKEN
  if (!scriptUrl || !token) {
    return NextResponse.json({ success: false, error: 'MyGLAB is not configured yet.' }, { status: 500 })
  }

  const { glabId, level } = await request.json()
  if (!glabId || typeof glabId !== 'string') {
    return NextResponse.json({ success: false, error: 'GLAB ID is required.' }, { status: 400 })
  }
  if (level !== 'A2' && level !== 'B1') {
    return NextResponse.json({ success: false, error: 'Level must be A2 or B1.' }, { status: 400 })
  }

  const res = await fetch(scriptUrl, {
    method: 'POST',
    body: JSON.stringify({ action: 'submitInterest', token, glabId: glabId.trim(), level }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
