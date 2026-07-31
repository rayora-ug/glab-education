import type { Metadata } from 'next'
import PrivacyClient from './privacy-client'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  robots: { index: true, follow: true },
}

export default function Page() {
  return <PrivacyClient />
}
