import type { Metadata } from 'next'
import BooksPage from './books-client'

export const metadata: Metadata = {
  title: 'Recommended Books',
  description: 'Textbooks used in GLAB courses and other recommended German-language books, with links to purchase on Amazon.',
  openGraph: {
    title: 'Recommended Books – GLAB',
    description: 'Textbooks used in GLAB courses and other recommended German-language books.',
  },
}

export default function Page() {
  return <BooksPage />
}
