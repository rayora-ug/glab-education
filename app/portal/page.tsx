import type { Metadata } from 'next'
import PortalPage from './portal-client'

export const metadata: Metadata = {
  title: 'Student Portal',
  description: 'Existing GLAB students: register for your next course with your GLAB ID.',
}

export default function Page() {
  return <PortalPage />
}
