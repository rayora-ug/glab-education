import type { Metadata } from 'next'
import RegistrationPage from './registration-client'

export const metadata: Metadata = {
  title: 'Registration',
  description: 'Register for GLAB German language courses. Check current registration status, seat availability, and the next batch start date.',
  openGraph: {
    title: 'Registration – GLAB',
    description: 'Register for GLAB German language courses and secure your seat.',
  },
}

export default function Page() {
  return <RegistrationPage />
}
