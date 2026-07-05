import type { Metadata } from 'next'
import CoursesPage from './courses-client'

export const metadata: Metadata = {
  title: 'German Courses – A1 to B2 Online Classes',
  description: 'Explore GLAB\'s structured German courses: Foundation, A1, A2, B1, B2 Intensive, Speaking Course, and Exam Preparation. Live online classes for Bangladeshi students.',
  openGraph: {
    title: 'German Courses – GLAB',
    description: 'From absolute beginner to upper-intermediate — structured, exam-ready German courses for Bangladeshi learners.',
  },
}

export default function Page() {
  return <CoursesPage />
}
