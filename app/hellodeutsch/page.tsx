import type { Metadata } from 'next'
import HelloDeutschPage from './hellodeutsch-client'

export const metadata: Metadata = {
  title: 'HelloDeutsch App',
  description: 'HelloDeutsch is GLAB\'s mobile app for learning German: vocabulary trainer, speaking practice, progress tracking, and exam preparation. Coming soon to Google Play and App Store.',
  openGraph: {
    title: 'HelloDeutsch App – GLAB',
    description: 'The dedicated German learning app for Bangladeshi students.',
  },
}

export default function Page() {
  return <HelloDeutschPage />
}
