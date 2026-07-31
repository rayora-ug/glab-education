import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const scriptUrl = process.env.GLAB_SCRIPT_URL
  const token = process.env.GLAB_SCRIPT_TOKEN
  if (!scriptUrl || !token) {
    return NextResponse.json({ success: false, error: 'Certificate verification is not configured yet.' }, { status: 500 })
  }

  const { certificateId } = await request.json()
  if (!certificateId || typeof certificateId !== 'string') {
    return NextResponse.json({ success: false, error: 'Certificate ID is required.' }, { status: 400 })
  }

  const res = await fetch(scriptUrl, {
    method: 'POST',
    body: JSON.stringify({ action: 'verifyCertificate', token, certificateId: certificateId.trim() }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
