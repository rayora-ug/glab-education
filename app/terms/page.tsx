import type { Metadata } from 'next'
import TermsClient from './terms-client'

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  robots: { index: true, follow: true },
}

export default function Page() {
  return <TermsClient />
}
