import type { Metadata } from 'next'
import ImpressumClient from './impressum-client'

export const metadata: Metadata = {
  title: 'Impressum',
  robots: { index: true, follow: true },
}

export default function Page() {
  return <ImpressumClient />
}
