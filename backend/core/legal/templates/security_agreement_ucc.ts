import type { SecurityAgreementFormInput } from '../../../../schemas/legalSchemas';
import { consultStatuteCitation } from '../formChecks';
import type { FormTemplate } from './types';

export const securityAgreementTemplate: FormTemplate<SecurityAgreementFormInput> = {
  id: 'security_agreement_ucc',

  async validate(input) {
    const hasCollateral = input.collateral.trim().length > 3;
    if (!hasCollateral) {
      return [{
        rule_id: 'UCC_9_203',
        passed: false,
        details: 'FAILED: Missing sufficient description of Collateral (UCC 9-108).',
        evidence_source: 'UCC Article 9',
        timestamp: new Date().toISOString(),
      }];
    }

    const citation = await consultStatuteCitation('UCC 9-203');
    return [{
      rule_id: 'UCC_9_203',
      passed: true,
      details: 'PASSED: Contains granting clause and collateral description (UCC 9-203).',
      evidence_source: citation || 'UCC Article 9',
      timestamp: new Date().toISOString(),
    }];
  },

  renderMarkdown(input) {
    const debtor = input.debtor || 'Debtor';
    const securedParty = input.secured_party || 'Secured Party';
    const obligation = input.obligation
      || `Promissory Note dated ${input.date || 'even date herewith'}`;

    return `
# SECURITY AGREEMENT (UCC Article 9)

This Security Agreement is entered into on **${input.date || new Date().toISOString().split('T')[0]}** between **${debtor}** ("Debtor") and **${securedParty}** ("Secured Party").

**1. GRANT OF SECURITY INTEREST.**
Debtor hereby grants to Secured Party a security interest in the property described below ("Collateral") to secure the payment and performance of the obligation described as: ${obligation}.

**2. COLLATERAL DESCRIPTION.**
The Collateral consists of the following:
> ${input.collateral}

**3. PERFECTION.**
Debtor authorizes Secured Party to file a financing statement (UCC-1) to perfect this Security Interest.

**4. DEFAULT.**
Upon default, Secured Party shall have all rights and remedies of a secured party under the Uniform Commercial Code of ${input.state || 'Delaware'}.

[SIGNATURE_FIELD:Debtor Authentication]
**${debtor}**
`.trim();
  },
};
