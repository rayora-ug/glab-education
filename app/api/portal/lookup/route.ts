import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const scriptUrl = process.env.GLAB_SCRIPT_URL
  const token = process.env.GLAB_SCRIPT_TOKEN
  if (!scriptUrl || !token) {
    return NextResponse.json({ success: false, error: 'Portal is not configured yet.' }, { status: 500 })
  }

  const { glabId } = await request.json()
  if (!glabId || typeof glabId !== 'string') {
    return NextResponse.json({ success: false, error: 'GLAB ID is required.' }, { status: 400 })
  }

  const res = await fetch(scriptUrl, {
    method: 'POST',
    body: JSON.stringify({ action: 'lookup', token, glabId: glabId.trim() }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
