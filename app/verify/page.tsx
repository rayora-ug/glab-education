import type { Metadata } from 'next'
import VerifyPage from './verify-client'

export const metadata: Metadata = {
  title: 'Certificate Verification',
  description: 'Verify the authenticity of a GLAB course completion or participation certificate using the certificate ID.',
}

export default function Page() {
  return <VerifyPage />
}
