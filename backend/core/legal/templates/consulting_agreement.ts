import type { ConsultingAgreementFormInput, ValidationStep } from '../../../../schemas/legalSchemas';
import type { FormTemplate } from './types';

function r5ConsultingScope(input: ConsultingAgreementFormInput): ValidationStep {
  const partiesDistinct = input.client.trim().toLowerCase() !== input.consultant.trim().toLowerCase();
  const hasScope = input.scope.trim().length >= 3;
  const passed = partiesDistinct && hasScope;

  const failures: string[] = [];
  if (!partiesDistinct) failures.push('Client and consultant must be distinct');
  if (!hasScope) failures.push('Consulting scope must be defined');

  return {
    rule_id: 'R5_CONSULTING_SCOPE',
    passed,
    details: passed
      ? 'PASSED: Consulting agreement with defined scope and distinct parties.'
      : `FAILED: ${failures.join('; ')}.`,
    evidence_source: 'Local Spectral stub (CourtListener holdings deferred)',
    timestamp: new Date().toISOString(),
  };
}

export const consultingAgreementTemplate: FormTemplate<ConsultingAgreementFormInput> = {
  id: 'consulting_agreement',

  async validate(input) {
    return [r5ConsultingScope(input)];
  },

  renderMarkdown(input) {
    const feeParts: string[] = [];
    if (input.retainer !== undefined) feeParts.push(`Retainer: $${input.retainer}`);
    if (input.fee !== undefined) feeParts.push(`Engagement fee / rate: $${input.fee}`);
    const compensation = feeParts.length > 0
      ? feeParts.join('\n')
      : 'Compensation as set forth in the applicable statement of work or invoice.';
    const deliverables = input.deliverables || 'As described in the Scope or subsequent written SOW.';

    return `
# CONSULTING AGREEMENT

**Client:** ${input.client} ("Client")
**Consultant:** ${input.consultant} ("Consultant")
**Effective Date:** ${input.date || new Date().toISOString().split('T')[0]}
**Governing Law:** State of ${input.state || 'Delaware'}

**1. ENGAGEMENT.**
Client engages Consultant as an independent consultant to provide professional advisory services.

**2. SCOPE.**
Consultant shall provide the following services (the "Scope"):
${input.scope}

**3. DELIVERABLES.**
${deliverables}

**4. COMPENSATION.**
${compensation}
Invoices are due within thirty (30) days unless otherwise agreed.

**5. INDEPENDENT CONTRACTOR.**
Consultant is not an employee, partner, or agent of Client. Consultant is solely responsible for taxes, insurance, and benefits. Consultant controls the means and methods of performing the Scope.

**6. INTELLECTUAL PROPERTY.**
Work product specifically created for Client under this Agreement and paid for by Client is assigned to Client. Consultant retains pre-existing tools, frameworks, and generic methodologies, and grants Client a non-exclusive license to use them as embodied in deliverables.

**7. CONFIDENTIALITY & NON-SOLICIT.**
Consultant shall not disclose Client confidential information. During the term and for twelve (12) months thereafter, Consultant shall not solicit Client's employees introduced through this engagement for competing employment, to the extent enforceable under applicable law.

**8. TERMINATION.**
Either party may terminate upon fifteen (15) days' written notice. Client shall pay for services satisfactorily performed through the effective termination date.

[SIGNATURE_FIELD:Consultant]
**${input.consultant}**

[SIGNATURE_FIELD:Client]
**${input.client}**
`.trim();
  },
};
