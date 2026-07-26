import ExamB1Client from './exam-b1-client'

export const metadata = {
  title: 'GLAB – B1 Grammatikprüfung',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <ExamB1Client />
}
