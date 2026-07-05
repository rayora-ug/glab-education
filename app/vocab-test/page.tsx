import type { Metadata } from 'next'
import VocabTestPage from './vocab-test-client'

export const metadata: Metadata = {
  title: 'German Vocabulary Test',
  description: 'GLAB timed vocabulary and grammar tests for enrolled students. Login with your GLAB ID and batch to access your assigned test.',
}

export default function Page() {
  return <VocabTestPage />
}
