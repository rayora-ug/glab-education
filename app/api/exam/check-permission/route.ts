import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const scriptUrl = process.env.GLAB_SCRIPT_URL
  const token = process.env.GLAB_SCRIPT_TOKEN
  if (!scriptUrl || !token) {
    return NextResponse.json({ success: false, error: 'Exam permission check is not configured yet.' }, { status: 500 })
  }

  const body = await request.json()
  const { examCode, glabId } = body

  if (!examCode || !glabId) {
    return NextResponse.json({ success: false, error: 'Exam code and GLAB ID are required.' }, { status: 400 })
  }

  const res = await fetch(scriptUrl, {
    method: 'POST',
    body: JSON.stringify({
      action: 'checkExamPermission',
      token,
      examCode,
      glabId: String(glabId).trim(),
    }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
