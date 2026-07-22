import { describe, expect, it } from 'vitest';
import { PrimerPackageSchema } from '../../../schemas/legalSchemas';

describe('PrimerPackageSchema', () => {
  it('accepts a minimal valid package', () => {
    const parsed = PrimerPackageSchema.safeParse({
      package_id: 'transition_essentials',
      title: 'Transition Essentials',
      outcome: 'Sign and file without collapsing principal into debtor.',
      course_kind: 'primer',
      vector_ready: false,
      steps: [
        {
          id: 'te-1',
          title: 'Agent signature practice',
          order: 1,
          forms: [],
          lines: [
            {
              line_id: 'ucc-3-402-agent',
              text: 'Signature must show unambiguously that it is made on behalf of the represented person.',
              register_ref: 'signature_agency',
            },
          ],
          speed_bumps: ['Signing the ALL-CAPS name without agency capacity'],
          flags: [],
          epistemic: 'settled',
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects unknown epistemic band', () => {
    const parsed = PrimerPackageSchema.safeParse({
      package_id: 'x',
      title: 'X',
      outcome: 'o',
      course_kind: 'primer',
      vector_ready: false,
      steps: [
        {
          id: '1',
          title: 't',
          order: 1,
          forms: [],
          lines: [],
          speed_bumps: [],
          flags: [],
          epistemic: 'mythic',
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});
