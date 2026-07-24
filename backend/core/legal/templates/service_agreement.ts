import type { ServiceAgreementFormInput, ValidationStep } from '../../../../schemas/legalSchemas';
import type { FormTemplate } from './types';

function r5ServicesScope(input: ServiceAgreementFormInput): ValidationStep {
  const partiesDistinct = input.client.trim().toLowerCase() !== input.provider.trim().toLowerCase();
  const hasServices = input.services.trim().length >= 3;
  const passed = partiesDistinct && hasServices;

  const failures: string[] = [];
  if (!partiesDistinct) failures.push('Client and provider must be distinct');
  if (!hasServices) failures.push('Services scope must be defined');

  return {
    rule_id: 'R5_SERVICES_SCOPE',
    passed,
    details: passed
      ? 'PASSED: Service agreement with defined scope and distinct parties.'
      : `FAILED: ${failures.join('; ')}.`,
    evidence_source: 'Local Spectral stub (CourtListener holdings deferred)',
    timestamp: new Date().toISOString(),
  };
}

export const serviceAgreementTemplate: FormTemplate<ServiceAgreementFormInput> = {
  id: 'service_agreement',

  async validate(input) {
    return [r5ServicesScope(input)];
  },

  renderMarkdown(input) {
    const feeLine = input.fee !== undefined
      ? `**Fee:** $${input.fee}`
      : '**Fee:** As mutually agreed in writing or statement of work.';
    const payment = input.payment_terms || 'Net 30 from invoice date';
    const start = input.start_date || input.date || new Date().toISOString().split('T')[0];
    const end = input.end_date || 'completion of Services or earlier termination';

    return `
# MASTER SERVICE AGREEMENT

**Client:** ${input.client} ("Client")
**Provider:** ${input.provider} ("Provider")
**Effective Date:** ${start}
**Governing Law:** State of ${input.state || 'Delaware'}

**1. SERVICES.**
Provider shall perform the following services (the "Services"):
${input.services}

**2. TERM.**
This Agreement begins on ${start} and continues until ${end}, unless terminated earlier in accordance with this Agreement.

**3. COMPENSATION.**
${feeLine}
**Payment Terms:** ${payment}

**4. INDEPENDENT CONTRACTOR.**
Provider is an independent contractor. Nothing in this Agreement creates a partnership, joint venture, or employment relationship.

**5. OWNERSHIP OF DELIVERABLES.**
Unless otherwise agreed in a statement of work, deliverables created specifically for Client under this Agreement are works made for hire and belong to Client upon full payment.

**6. CONFIDENTIALITY.**
Each party shall protect the other's non-public information with reasonable care and use it only to perform under this Agreement.

**7. LIMITATION OF LIABILITY.**
Except for willful misconduct or breach of confidentiality, neither party's aggregate liability under this Agreement shall exceed the fees paid in the twelve (12) months preceding the claim. Neither party is liable for indirect, incidental, or consequential damages.

**8. TERMINATION.**
Either party may terminate for material breach uncured within fifteen (15) days of written notice, or for convenience upon thirty (30) days' written notice.

[SIGNATURE_FIELD:Provider]
**${input.provider}**

[SIGNATURE_FIELD:Client]
**${input.client}**
`.trim();
  },
};
