import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const scriptUrl = process.env.GLAB_SCRIPT_URL
  const token = process.env.GLAB_SCRIPT_TOKEN
  if (!scriptUrl || !token) {
    return NextResponse.json({ success: false, error: 'A1 applications are not configured yet.' }, { status: 500 })
  }

  const body = await request.json()
  const {
    name, email, whatsappNumber, facebookLink, dob, occupation, city, batchChoice,
    previousExperience, previousCourseDetails, previousCourseCompleted,
    motivation, whyGlab, howHeard, primaryGoal, comment, agreedToRules,
  } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ success: false, error: 'Name is required.' }, { status: 400 })
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ success: false, error: 'A valid email address is required.' }, { status: 400 })
  }
  if (!whatsappNumber || typeof whatsappNumber !== 'string' || !whatsappNumber.trim()) {
    return NextResponse.json({ success: false, error: 'WhatsApp number is required.' }, { status: 400 })
  }
  if (!dob || typeof dob !== 'string') {
    return NextResponse.json({ success: false, error: 'Date of birth is required.' }, { status: 400 })
  }
  if (!batchChoice || typeof batchChoice !== 'string') {
    return NextResponse.json({ success: false, error: 'Please choose a batch.' }, { status: 400 })
  }
  if (!agreedToRules) {
    return NextResponse.json({ success: false, error: 'You must agree to the course rules to apply.' }, { status: 400 })
  }

  const res = await fetch(scriptUrl, {
    method: 'POST',
    body: JSON.stringify({
      action: 'submitA1Application', token,
      name: name.trim(), email: email.trim(), whatsappNumber: whatsappNumber.trim(),
      facebookLink: typeof facebookLink === 'string' ? facebookLink.trim() : '',
      dob: dob.trim(),
      occupation: typeof occupation === 'string' ? occupation.trim() : '',
      city: typeof city === 'string' ? city.trim() : '',
      batchChoice: batchChoice.trim(),
      previousExperience: typeof previousExperience === 'string' ? previousExperience : '',
      previousCourseDetails: typeof previousCourseDetails === 'string' ? previousCourseDetails.trim() : '',
      previousCourseCompleted: typeof previousCourseCompleted === 'string' ? previousCourseCompleted : '',
      motivation: typeof motivation === 'string' ? motivation.trim() : '',
      whyGlab: typeof whyGlab === 'string' ? whyGlab.trim() : '',
      howHeard: typeof howHeard === 'string' ? howHeard : '',
      primaryGoal: typeof primaryGoal === 'string' ? primaryGoal : '',
      comment: typeof comment === 'string' ? comment.trim() : '',
      agreedToRules: !!agreedToRules,
    }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
