import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const scriptUrl = process.env.GLAB_SCRIPT_URL
  const token = process.env.GLAB_SCRIPT_TOKEN
  if (!scriptUrl || !token) {
    // Fail open rather than blocking every registration page if this isn't
    // configured — the backend still enforces the real gate either way.
    return NextResponse.json({ success: true, open: true })
  }

  const res = await fetch(scriptUrl, {
    method: 'POST',
    body: JSON.stringify({ action: 'getRegistrationStatus', token }),
    cache: 'no-store',
  })
  const data = await res.json()
  return NextResponse.json(data)
}
