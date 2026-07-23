import type { Metadata } from 'next'
import ResultsPage from './results-client'

export const metadata: Metadata = {
  title: 'Application Results',
  description: 'Check your Foundation/A1 application result and complete registration if selected.',
}

export default function Page() {
  return <ResultsPage />
}
