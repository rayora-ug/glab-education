'use client'

import Link from 'next/link'
import { LegalLayout, LegalSection } from '../legal/LegalLayout'

export default function PrivacyClient() {
  return (
    <LegalLayout label="Data Protection" title="Privacy Policy" updated="June 2026">
      <LegalSection heading="1. Controller">
        <p>
          <strong>Rayora UG (haftungsbeschränkt)</strong>, operating this website under the brand "GLAB — German Language Academy of Bangladesh."
        </p>
        <p>
          Managing Director: Mohammad Rayhanur Rahman<br />
          Samlandweg 90, 22415 Hamburg, Germany<br />
          Email: <a href="mailto:contact@rayora.de" className="underline" style={{ color: '#DD0000' }}>contact@rayora.de</a>
        </p>
      </LegalSection>

      <LegalSection heading="2. General Information">
        <p>
          Protecting your personal data is important to us. We process your data confidentially and in accordance with applicable data protection law, in particular the EU General Data Protection Regulation (GDPR). You can generally use this website without providing any personal data. Where personal data is collected (e.g. name, email address, phone number), this is, unless otherwise stated below, always on a voluntary basis.
        </p>
      </LegalSection>

      <LegalSection heading="3. Hosting">
        <p>This website is hosted by Netlify, Inc. When you visit this website, technical information is automatically processed, including:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>IP address</li>
          <li>Date and time of access</li>
          <li>Browser type and version</li>
          <li>Operating system</li>
          <li>Referrer URL</li>
          <li>Pages visited</li>
        </ul>
        <p>This processing is necessary to ensure secure and stable operation of the website (legal basis: Art. 6(1)(f) GDPR, legitimate interest).</p>
      </LegalSection>

      <LegalSection heading="4. Contact">
        <p>
          If you contact us via our contact form or by email, the data you provide (which may include your name, email address, phone number, and message content) is stored to process your inquiry (legal basis: Art. 6(1)(b) GDPR, pre-contractual measures, or Art. 6(1)(f) GDPR, legitimate interest).
        </p>
      </LegalSection>

      <LegalSection heading="5. Course Applications & Registration">
        <p>
          Through this website you can apply for or register for German language courses offered by GLAB. Depending on the course and step, this may involve collecting:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Full name, email address, WhatsApp/phone number</li>
          <li>Date of birth (for A1 Foundation applicants, used to verify your application)</li>
          <li>GLAB-ID (a student identifier we assign)</li>
          <li>Desired or confirmed course/batch</li>
          <li>Payment proof (e.g. a screenshot or receipt) and payment reference</li>
          <li>Any feedback or additional information you choose to submit</li>
        </ul>
        <p>
          This data is used exclusively for course organization, admissions, payment verification, and communication with you (legal basis: Art. 6(1)(b) GDPR, performance of a contract or steps prior to entering one).
        </p>
        <p>
          <strong>Backend infrastructure:</strong> Submitted data is stored and processed using Google Sheets and Google Apps Script (provided by Google Ireland Limited / Google LLC). Where this involves a transfer of data outside the EU/EEA, this takes place on the basis of Standard Contractual Clauses under Art. 46 GDPR.
        </p>
      </LegalSection>

      <LegalSection heading="6. Exams">
        <p>
          Where you take a placement or course exam through this website, we process your GLAB-ID, name, submitted answers, scores, and — where a writing task requires it — a photo or scan of your handwritten answer, uploaded via Google Drive. This data is used to administer and grade the exam and verify your eligibility to take it (legal basis: Art. 6(1)(b) GDPR).
        </p>
      </LegalSection>

      <LegalSection heading="7. Certificate Verification">
        <p>
          Our certificate verification tool looks up an existing certificate record by the ID you enter. No new personal data about you is collected beyond the certificate ID you submit for the lookup.
        </p>
      </LegalSection>

      <LegalSection heading="8. WhatsApp, Facebook & Social Media">
        <p>
          This website contains links to WhatsApp, Facebook, and other social platforms. Clicking these links takes you to third-party services outside our control. The respective provider is solely responsible for data processing on their platform.
        </p>
      </LegalSection>

      <LegalSection heading="9. Storage Duration">
        <p>
          We retain personal data only for as long as necessary for the purpose it was collected for, or as required by applicable statutory retention obligations (for example, German commercial and tax law generally require certain business records to be kept for six to ten years).
        </p>
      </LegalSection>

      <LegalSection heading="10. Your Rights">
        <p>Under the GDPR, you have the right to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Request access to the personal data we hold about you (Art. 15)</li>
          <li>Request correction of inaccurate data (Art. 16)</li>
          <li>Request erasure of your data (Art. 17)</li>
          <li>Request restriction of processing (Art. 18)</li>
          <li>Request data portability (Art. 20)</li>
          <li>Object to processing (Art. 21)</li>
        </ul>
        <p>
          To exercise any of these rights, contact us at <a href="mailto:contact@rayora.de" className="underline" style={{ color: '#DD0000' }}>contact@rayora.de</a> at any time.
        </p>
      </LegalSection>

      <LegalSection heading="11. Right to Lodge a Complaint">
        <p>
          You have the right to lodge a complaint with a data protection supervisory authority. The authority responsible for us is the Hamburg Commissioner for Data Protection and Freedom of Information (Der Hamburgische Beauftragte für Datenschutz und Informationsfreiheit).
        </p>
      </LegalSection>

      <LegalSection heading="12. Changes to This Privacy Policy">
        <p>
          We may update this Privacy Policy from time to time to reflect changes to our practices or legal requirements. Any changes will be posted on this page.
        </p>
        <p>
          See also our <Link href="/impressum" className="underline" style={{ color: '#DD0000' }}>Impressum</Link> and <Link href="/terms" className="underline" style={{ color: '#DD0000' }}>Terms and Conditions</Link>.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
