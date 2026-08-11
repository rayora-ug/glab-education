import type { Metadata } from 'next'
import DashboardPage from './dashboard-client'

export const metadata: Metadata = {
  title: 'MyGLAB',
  description: 'Your space at GLAB: attendance, class links, and course info.',
}

export default function Page() {
  return <DashboardPage />
}
