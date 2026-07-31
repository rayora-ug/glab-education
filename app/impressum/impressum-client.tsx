'use client'

import { LegalLayout, LegalSection } from '../legal/LegalLayout'

export default function ImpressumClient() {
  return (
    <LegalLayout label="Legal Notice" title="Impressum" updated="June 2026">
      <LegalSection heading="Angaben gemäß § 5 TMG / § 5 DDG">
        <p><strong>Rayora UG (haftungsbeschränkt)</strong></p>
        <p>
          Geschäftsführer: Mohammad Rayhanur Rahman<br />
          Samlandweg 90<br />
          22415 Hamburg<br />
          Deutschland
        </p>
        <p>E-Mail: <a href="mailto:contact@rayora.de" className="underline" style={{ color: '#DD0000' }}>contact@rayora.de</a></p>
        <p>
          Handelsregister: Amtsgericht Hamburg<br />
          HRB 193273
        </p>
      </LegalSection>

      <LegalSection heading="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
        <p>
          Mohammad Rayhanur Rahman<br />
          Samlandweg 90<br />
          22415 Hamburg<br />
          Deutschland
        </p>
      </LegalSection>

      <LegalSection heading="About This Website">
        <p>
          This website is operated by Rayora UG (haftungsbeschränkt) under the brand name <strong>GLAB — German Language Academy of Bangladesh</strong>.
        </p>
      </LegalSection>

      <LegalSection heading="EU Dispute Resolution">
        <p>
          The European Commission provides a platform for online dispute resolution (OS): <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#DD0000' }}>https://ec.europa.eu/consumers/odr/</a>.
          We are not obligated and generally not willing to participate in dispute resolution proceedings before a consumer arbitration board.
        </p>
      </LegalSection>

      <LegalSection heading="Liability for Content">
        <p>
          As a service provider, we are responsible for our own content on these pages in accordance with general laws. However, we are not obligated to monitor transmitted or stored third-party information, or to investigate circumstances that indicate illegal activity. Obligations to remove or block the use of information under general law remain unaffected. Liability in this regard is only possible from the point in time at which a specific infringement of the law becomes known. Upon becoming aware of any such infringements, we will remove the relevant content immediately.
        </p>
      </LegalSection>

      <LegalSection heading="Liability for Links">
        <p>
          Our website contains links to external third-party websites, the content of which is beyond our control. We therefore cannot assume any liability for this external content. The respective provider or operator of the linked pages is always responsible for their content. A permanent review of the content of linked pages is unreasonable without concrete evidence of a violation of the law. Upon becoming aware of any legal infringements, we will remove such links immediately.
        </p>
      </LegalSection>

      <LegalSection heading="Copyright">
        <p>
          Content and works created by the site operator on these pages are subject to German copyright law. Reproduction, editing, distribution, and any kind of use outside the limits of copyright law require the written consent of the respective author or creator.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
