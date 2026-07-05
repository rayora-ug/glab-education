import ExamClient from './exam-client'

export const metadata = {
  title: 'GLAB – Exam',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <ExamClient />
}
