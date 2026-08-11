import type { Metadata } from 'next'
import ApplyPage from './apply-client'

export const metadata: Metadata = {
  title: 'Apply',
  description: 'Start your GLAB application: check your A1 application status, or access the Registration Portal to register for A2/B1.',
  openGraph: {
    title: 'Apply – GLAB',
    description: 'Start your GLAB application: check your A1 application status, or access the Registration Portal to register for A2/B1.',
  },
}

export default function Page() {
  return <ApplyPage />
}
