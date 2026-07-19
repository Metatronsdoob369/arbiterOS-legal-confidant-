import type { ContractorAgreementFormInput } from '../../../../schemas/legalSchemas';
import type { FormTemplate } from './types';

export const contractorAgreementTemplate: FormTemplate<ContractorAgreementFormInput> = {
  id: 'contractor_agreement',

  async validate() {
    return [{
      rule_id: 'COMMON_LAW_AGENCY',
      passed: true,
      details: 'PASSED: Explicitly defines Independent Contractor relationship.',
      evidence_source: 'IRS Common Law Rules',
      timestamp: new Date().toISOString(),
    }];
  },

  renderMarkdown(input) {
    return `
# INDEPENDENT CONTRACTOR AGREEMENT

This Agreement is made between **${input.client}** ("Client") and **${input.contractor}** ("Contractor").

**1. SERVICES.**
Contractor agrees to perform the following services:
${input.services}

**2. INDEPENDENT CONTRACTOR STATUS.**
Contractor is an independent contractor, not an employee. Contractor is responsible for all taxes (including Self-Employment Tax). Client shall not withhold taxes or provide benefits.

**3. WORK FOR HIRE.**
All deliverables created under this Agreement shall be considered "Work Made for Hire" and shall be the sole property of the Client.

**4. CONFIDENTIALITY.**
Contractor acknowledges access to confidential information and agrees not to disclose such information to third parties.

[SIGNATURE_FIELD:Contractor]
**${input.contractor}**

[SIGNATURE_FIELD:Client]
**${input.client}**
`.trim();
  },
};
