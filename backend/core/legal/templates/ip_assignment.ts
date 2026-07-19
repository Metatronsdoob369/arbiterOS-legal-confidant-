import type { IpAssignmentFormInput, ValidationStep } from '../../../../schemas/legalSchemas';
import type { FormTemplate } from './types';

function r5IpAssignment(input: IpAssignmentFormInput): ValidationStep {
  const partiesDistinct = input.assignor.trim().toLowerCase() !== input.assignee.trim().toLowerCase();
  const hasWork = input.work_description.trim().length >= 3;
  const passed = partiesDistinct && hasWork;

  const failures: string[] = [];
  if (!partiesDistinct) failures.push('Assignor and assignee must be distinct');
  if (!hasWork) failures.push('Work / IP description must be defined');

  return {
    rule_id: 'R5_IP_ASSIGNMENT',
    passed,
    details: passed
      ? 'PASSED: IP assignment with identified work product and distinct parties.'
      : `FAILED: ${failures.join('; ')}.`,
    evidence_source: 'Local Spectral stub (CourtListener holdings deferred)',
    timestamp: new Date().toISOString(),
  };
}

export const ipAssignmentTemplate: FormTemplate<IpAssignmentFormInput> = {
  id: 'ip_assignment',

  async validate(input) {
    return [r5IpAssignment(input)];
  },

  renderMarkdown(input) {
    const consideration = input.consideration || 'good and valuable consideration, the receipt and sufficiency of which are acknowledged';
    const effective = input.effective_date || input.date || new Date().toISOString().split('T')[0];

    return `
# INTELLECTUAL PROPERTY ASSIGNMENT AGREEMENT

**Assignor:** ${input.assignor} ("Assignor")
**Assignee:** ${input.assignee} ("Assignee")
**Effective Date:** ${effective}
**Governing Law:** State of ${input.state || 'Delaware'}

**1. ASSIGNMENT.**
For ${consideration}, Assignor hereby irrevocably assigns, transfers, and conveys to Assignee all right, title, and interest in and to the following intellectual property and work product (the "Assigned IP"):

${input.work_description}

**2. SCOPE OF RIGHTS.**
Assigned IP includes all copyrights, patents, patent applications, trade secrets, moral rights (to the extent waivable), and related rights worldwide, including the right to sue for past infringement.

**3. WORK MADE FOR HIRE / FURTHER ASSURANCES.**
To the extent any Assigned IP is not automatically owned by Assignee, Assignor agrees it is a work made for hire where applicable, and otherwise assigns it as set forth herein. Assignor shall execute documents and take further actions reasonably requested to perfect Assignee's ownership.

**4. REPRESENTATIONS.**
Assignor represents that: (a) Assignor is the sole owner of the Assigned IP free of liens; (b) Assignor has full power to assign; and (c) the Assigned IP does not knowingly infringe third-party rights.

**5. NO RETAINED LICENSE.**
Except as expressly agreed in writing, Assignor retains no license to use the Assigned IP after the Effective Date.

**6. ENTIRE AGREEMENT.**
This Agreement constitutes the entire agreement regarding the Assigned IP and supersedes prior oral or written understandings on that subject.

[SIGNATURE_FIELD:Assignor]
**${input.assignor}**

[SIGNATURE_FIELD:Assignee]
**${input.assignee}**
`.trim();
  },
};
