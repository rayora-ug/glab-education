import type { Metadata } from 'next'
import MyGlabPage from './myglab-client'

export const metadata: Metadata = {
  title: 'MyGLAB',
  description: 'Your space at GLAB: attendance, class links, and course info.',
}

export default function Page() {
  return <MyGlabPage />
}
