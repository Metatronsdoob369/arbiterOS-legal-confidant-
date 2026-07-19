import type { PromissoryNoteFormInput } from '../../../../schemas/legalSchemas';
import { verifyNegotiability } from '../formChecks';
import type { FormTemplate } from './types';

export const promissoryNoteTemplate: FormTemplate<PromissoryNoteFormInput> = {
  id: 'promissory_note_ucc',

  async validate(input) {
    const check = await verifyNegotiability({
      promise_type: 'unconditional',
      amount_type: 'fixed',
      currency: 'USD',
      payable_to: 'order',
      timing: input.date ? 'definite' : 'demand',
      other_undertakings: false,
    });
    return [check];
  },

  renderMarkdown(input) {
    return `
# PROMISSORY NOTE (UCC § 3-104 Compliant)

**Principal Amount:** $${input.amount}
**Date:** ${input.date || 'On Demand'}

FOR VALUE RECEIVED, the undersigned ("Borrower") promises to pay to the order of **${input.lender}** ("Lender") the principal sum of **$${input.amount}** USD.

**1. PAYMENT.**
${input.date ? `Payment shall be made in full on ${input.date}.` : 'Payment shall be made immediately upon demand by Lender.'}

**2. UNCONDITIONAL PROMISE.**
This Note represents an unconditional promise to pay and is not subject to any other agreement.

**3. GOVERNING LAW.**
This Note shall be governed by the Uniform Commercial Code as adopted in the State of ${input.state || 'Delaware'}.

**4. WAIVERS.**
Borrower waives presentment, demand, protest, and notice of dishonor.

**5. EXECUTION.**
The parties hereby execute this Note as of the date first written above.

[SIGNATURE_FIELD:Borrower Signature]
**${input.borrower}**

[SIGNATURE_FIELD:Lender Signature]
**${input.lender}**
`.trim();
  },
};
