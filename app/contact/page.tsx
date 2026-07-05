import type { Metadata } from 'next'
import ContactPage from './contact-client'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with GLAB for course information, registration help, or partnership inquiries. Reach us via email, WhatsApp, or Facebook.',
  openGraph: {
    title: 'Contact GLAB',
    description: 'Have a question about courses, registration, or the HelloDeutsch app? We\'re here to help.',
  },
}

export default function Page() {
  return <ContactPage />
}
