import ExamGrammarClient from './exam-grammar-client'

export const metadata = {
  title: 'GLAB – Grammatikprüfung',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <ExamGrammarClient />
}
