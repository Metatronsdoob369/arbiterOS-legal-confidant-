import type { NdaFormInput, ValidationStep } from '../../../../schemas/legalSchemas';
import type { FormTemplate } from './types';

function r5Confidentiality(input: NdaFormInput): ValidationStep {
  const partiesDistinct = input.disclosing_party.trim().toLowerCase()
    !== input.receiving_party.trim().toLowerCase();
  const hasPurpose = input.purpose.trim().length >= 3;
  const hasTerm = Number.isFinite(input.term_years) && input.term_years > 0;
  const passed = partiesDistinct && hasPurpose && hasTerm;

  const failures: string[] = [];
  if (!partiesDistinct) failures.push('Disclosing and receiving parties must be distinct');
  if (!hasPurpose) failures.push('Purpose/scope of disclosure must be defined');
  if (!hasTerm) failures.push('Confidentiality term must be a positive number of years');

  return {
    rule_id: 'R5_CONFIDENTIALITY',
    passed,
    details: passed
      ? `PASSED: ${input.mutual === false ? 'One-way' : 'Mutual'} NDA with consideration of purpose and defined term (${input.term_years} years).`
      : `FAILED: ${failures.join('; ')}.`,
    evidence_source: 'Local Spectral stub (CourtListener holdings deferred)',
    timestamp: new Date().toISOString(),
  };
}

export const ndaTemplate: FormTemplate<NdaFormInput> = {
  id: 'nda',

  async validate(input) {
    return [r5Confidentiality(input)];
  },

  renderMarkdown(input) {
    const style = input.mutual === false ? 'NON-DISCLOSURE AGREEMENT' : 'MUTUAL NON-DISCLOSURE AGREEMENT';
    return `
# ${style}

**Disclosing Party:** ${input.disclosing_party} ("Disclosing Party")
**Receiving Party:** ${input.receiving_party} ("Receiving Party")
**Effective Date:** ${input.date || new Date().toISOString().split('T')[0]}
**Governing Law:** State of ${input.state || 'Delaware'}

**1. PURPOSE.**
The parties wish to explore or pursue: ${input.purpose}.

**2. CONFIDENTIAL INFORMATION.**
"Confidential Information" means any non-public information disclosed by Disclosing Party to Receiving Party in connection with the Purpose, whether oral, written, electronic, or otherwise, and including business plans, technical data, customer lists, financial information, and trade secrets.

**3. OBLIGATIONS.**
Receiving Party shall (a) maintain Confidential Information in strict confidence; (b) use it solely for the Purpose; and (c) restrict access to personnel with a need to know who are bound by confidentiality obligations no less restrictive than this Agreement.

**4. EXCEPTIONS.**
Obligations do not apply to information that: (a) is or becomes publicly available through no fault of Receiving Party; (b) was rightfully known prior to disclosure; (c) is independently developed without use of Confidential Information; or (d) is rightfully received from a third party without confidentiality duty.

**5. TERM.**
Obligations survive for **${input.term_years} years** from the date of last disclosure of Confidential Information, or longer if required by law for trade secrets.

**6. RETURN / DESTRUCTION.**
Upon written request, Receiving Party shall return or destroy Confidential Information and certify destruction in writing, except for archival copies retained under legal hold.

**7. NO LICENSE.**
Nothing in this Agreement grants any license under any patent, copyright, trademark, or other intellectual property right.

[SIGNATURE_FIELD:Disclosing Party]
**${input.disclosing_party}**

[SIGNATURE_FIELD:Receiving Party]
**${input.receiving_party}**
`.trim();
  },
};
