import { NextResponse } from 'next/server'

const MAX_FILE_BYTES = 3 * 1024 * 1024 // 3MB

function base64ByteLength(base64: string) {
  const padding = (base64.match(/=+$/) || [''])[0].length
  return Math.floor((base64.length * 3) / 4) - padding
}

// The A1 equivalent of /api/portal/submit — identifies the applicant by
// email + WhatsApp number instead of an existing GLAB ID, since a
// first-time A1 registrant doesn't have one yet. See submitA1Registration_
// in Code.gs: the GLAB ID is minted at this point, not at selection time.
export async function POST(request: Request) {
  const scriptUrl = process.env.GLAB_SCRIPT_URL
  const token = process.env.GLAB_SCRIPT_TOKEN
  if (!scriptUrl || !token) {
    return NextResponse.json({ success: false, error: 'Registration is not configured yet.' }, { status: 500 })
  }

  const body = await request.json()
  const { email, phone, course, batchId, paymentMethod, paymentReference, feedback, fileBase64, fileName, fileMimeType } = body

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ success: false, error: 'A valid email address is required.' }, { status: 400 })
  }
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return NextResponse.json({ success: false, error: 'WhatsApp number is required.' }, { status: 400 })
  }
  if (!course || !batchId || !paymentMethod) {
    return NextResponse.json({ success: false, error: 'Course, batch, and payment method are required.' }, { status: 400 })
  }
  if (!fileBase64 || !fileName || !fileMimeType) {
    return NextResponse.json({ success: false, error: 'Please attach your payment proof.' }, { status: 400 })
  }
  if (!/^image\//.test(fileMimeType) && fileMimeType !== 'application/pdf') {
    return NextResponse.json({ success: false, error: 'Payment proof must be an image or a PDF.' }, { status: 400 })
  }
  if (base64ByteLength(fileBase64) > MAX_FILE_BYTES) {
    return NextResponse.json({ success: false, error: 'File is too large (max 3MB).' }, { status: 400 })
  }

  const res = await fetch(scriptUrl, {
    method: 'POST',
    body: JSON.stringify({
      action: 'submitA1Registration',
      token,
      email: String(email).trim(),
      phone: phone.trim(),
      course,
      batchId,
      paymentMethod,
      paymentReference: paymentReference || '',
      feedback: feedback || '',
      fileBase64,
      fileName,
      fileMimeType,
    }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
