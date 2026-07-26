import { NextResponse } from 'next/server'

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5MB

function base64ByteLength(base64: string) {
  const padding = (base64.match(/=+$/) || [''])[0].length
  return Math.floor((base64.length * 3) / 4) - padding
}

export async function POST(request: Request) {
  const scriptUrl = process.env.GLAB_SCRIPT_URL
  const token = process.env.GLAB_SCRIPT_TOKEN
  if (!scriptUrl || !token) {
    return NextResponse.json({ success: false, error: 'Upload is not configured yet.' }, { status: 500 })
  }

  const body = await request.json()
  const { examCode, glabId, fileBase64, fileName, fileMimeType } = body

  if (!examCode || !glabId || !fileBase64 || !fileName || !fileMimeType) {
    return NextResponse.json({ success: false, error: 'Exam code, GLAB ID, and file are required.' }, { status: 400 })
  }
  if (!/^image\//.test(fileMimeType) && fileMimeType !== 'application/pdf') {
    return NextResponse.json({ success: false, error: 'File must be an image or a PDF.' }, { status: 400 })
  }
  if (base64ByteLength(fileBase64) > MAX_FILE_BYTES) {
    return NextResponse.json({ success: false, error: 'File is too large (max 5MB).' }, { status: 400 })
  }

  const res = await fetch(scriptUrl, {
    method: 'POST',
    body: JSON.stringify({
      action: 'uploadWritingProof',
      token,
      examCode,
      glabId: String(glabId).trim(),
      fileBase64, fileName, fileMimeType,
    }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
