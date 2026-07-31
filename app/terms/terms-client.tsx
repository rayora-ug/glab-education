'use client'

import Link from 'next/link'
import { LegalLayout, LegalSection } from '../legal/LegalLayout'

export default function TermsClient() {
  return (
    <LegalLayout label="Legal" title="Terms and Conditions" updated="June 2026">
      <LegalSection heading="1. Scope & Provider">
        <p>
          These Terms and Conditions govern your use of this website and enrollment in courses offered by <strong>Rayora UG (haftungsbeschränkt)</strong>, Samlandweg 90, 22415 Hamburg, Germany, operating under the brand "GLAB — German Language Academy of Bangladesh" ("GLAB," "we," "us"). By using this website or registering for a course, you agree to be bound by these Terms, together with our <Link href="/privacy" className="underline" style={{ color: '#DD0000' }}>Privacy Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection heading="2. Use of the Website">
        <p>
          The content of this website is provided for general information only and is subject to change without notice. While we aim for accuracy, we make no warranty as to the completeness or correctness of any information on this site.
        </p>
      </LegalSection>

      <LegalSection heading="3. Course Enrollment">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>A1 Intensive:</strong> admission is application-based. Submitting an application does not guarantee a seat; applicants are notified of their selection result separately.</li>
          <li><strong>A2 and B1 Intensive:</strong> new (non-GLAB) students are admitted based on a placement/oral test. Existing GLAB students may register directly without a placement test.</li>
          <li>A seat in any course is only confirmed once payment has been received and verified by GLAB.</li>
          <li>Once you have joined a specific batch, you cannot switch to another batch for any reason. If you wish to join a different batch instead, you must complete a new registration and pay the course fee again for that batch.</li>
          <li>Please consider your decision carefully before registering — see Section 6 on cancellation.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Fees & Payment">
        <p>
          Current course fees are listed on our Courses page and are payable via the methods indicated during the registration process. A valid payment reference or proof of payment is required before a registration is confirmed.
        </p>
      </LegalSection>

      <LegalSection heading="5. Attendance & Classes">
        <p>
          Classes are conducted live only and are <strong>not recorded</strong>. This is intentional: regular attendance and completion of homework are mandatory, and missing a class means missing that session's material, since no recording or catch-up material is provided. Keeping your video camera on during every class is mandatory. If a student misses a total of 5 classes and/or homework submissions, they will be removed from the course without further notice.
        </p>
      </LegalSection>

      <LegalSection heading="6. Cancellation & Refunds">
        <p>
          You may cancel your registration and receive a full refund only if you do so within <strong>3 calendar days of the date you registered</strong> — regardless of whether classes have started, and regardless of how many classes fall within that 3-day window.
        </p>
        <p>
          After this 3-day window has passed, no cancellation, batch switch, or refund is possible under any circumstances, including if you have not attended any class. Please register only if you are fully committed to completing the course — a change of mind, personal reasons, or a lack of time does not qualify for a refund or batch change once the 3-day window has closed.
        </p>
      </LegalSection>

      <LegalSection heading="7. Certificates">
        <p>
          GLAB issues an internal course-completion certificate for each level a student completes. These are GLAB's own internal certificates and are separate from official, internationally recognized certifications (such as those issued by the Goethe-Institut or telc). GLAB prepares students for such official exams but does not guarantee any specific outcome in them.
        </p>
      </LegalSection>

      <LegalSection heading="8. Intellectual Property">
        <p>
          All course materials, the HelloDeutsch app (once released), and the content of this website are the property of Rayora UG or its licensors, and may not be reproduced, redistributed, or shared with individuals not enrolled in the relevant course without our prior written permission. Any third-party trademarks referenced on this website remain the property of their respective owners.
        </p>
      </LegalSection>

      <LegalSection heading="9. User Conduct">
        <p>
          You agree to use this website and GLAB's classes only for lawful purposes, and in a way that does not infringe on or restrict any other person's use and enjoyment of the website or of GLAB's classes — including by sharing class access with individuals not enrolled in the course (see Section 5).
        </p>
      </LegalSection>

      <LegalSection heading="10. Limitation of Liability">
        <p>
          GLAB / Rayora UG is liable only for damages caused by intent or gross negligence, except in cases of injury to life, body, or health, or as otherwise required by mandatory applicable law. We do not guarantee uninterrupted availability of this website, nor any specific learning or exam outcome.
        </p>
      </LegalSection>

      <LegalSection heading="11. Governing Law & Jurisdiction">
        <p>
          These Terms are governed by the laws of the Federal Republic of Germany. To the extent legally permissible, the place of jurisdiction for any disputes arising from these Terms is Hamburg, Germany.
        </p>
      </LegalSection>

      <LegalSection heading="12. Changes to These Terms">
        <p>
          We may amend these Terms from time to time. The version published on this page at the time of your enrollment or use of the website applies.
        </p>
        <p>
          See also our <Link href="/privacy" className="underline" style={{ color: '#DD0000' }}>Privacy Policy</Link> and <Link href="/impressum" className="underline" style={{ color: '#DD0000' }}>Impressum</Link>.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
