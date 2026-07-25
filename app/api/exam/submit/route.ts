import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const scriptUrl = process.env.GLAB_SCRIPT_URL
  const token = process.env.GLAB_SCRIPT_TOKEN
  if (!scriptUrl || !token) {
    return NextResponse.json({ success: false, error: 'Exam submission is not configured yet.' }, { status: 500 })
  }

  const body = await request.json()
  const { name, glabId, examCode, score, totalScorable, percent, answers, writingUploaded } = body

  if (!name || !glabId || !examCode) {
    return NextResponse.json({ success: false, error: 'Name, GLAB ID, and exam code are required.' }, { status: 400 })
  }

  const res = await fetch(scriptUrl, {
    method: 'POST',
    body: JSON.stringify({
      action: 'submitExam',
      token,
      name,
      glabId: String(glabId).trim(),
      examCode,
      score,
      totalScorable,
      percent,
      answers: answers || {},
      writingUploaded: !!writingUploaded,
    }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
