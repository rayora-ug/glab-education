import type { Metadata } from 'next'
import ApplyA1Page from './apply-a1-client'

export const metadata: Metadata = {
  title: 'Apply for A1 Intensive',
  description: 'Apply for GLAB\'s A1 Intensive German course — submit your application online and we\'ll email you once results are announced.',
  openGraph: {
    title: 'Apply for A1 Intensive – GLAB',
    description: 'Apply for GLAB\'s A1 Intensive German course — submit your application online and we\'ll email you once results are announced.',
  },
}

export default function Page() {
  return <ApplyA1Page />
}
