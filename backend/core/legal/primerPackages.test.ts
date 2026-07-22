import { beforeEach, describe, expect, it } from 'vitest';
import { PrimerPackageSchema } from '../../../schemas/legalSchemas';
import {
  __resetPrimerPackagesCacheForTests,
  getPrimerPackage,
  listPrimerPackages,
} from './primerPackages';

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

describe('primerPackages loader', () => {
  beforeEach(() => {
    __resetPrimerPackagesCacheForTests();
  });

  it('lists all six primer package_ids', () => {
    const ids = listPrimerPackages().map((p) => p.package_id).sort();
    expect(ids).toEqual([
      'contract_navigation',
      'irs_form_intimacy',
      'proper_debt_discharge',
      'property_tax_procedure',
      'securities_control',
      'transition_essentials',
    ]);
  });

  it('loads transition_essentials with a settled signature step', () => {
    const pack = getPrimerPackage('transition_essentials');
    expect(pack.title).toBe('Transition Essentials');
    expect(
      pack.steps.some((step) => step.epistemic === 'settled' && step.lines.length > 0),
    ).toBe(true);
  });

  it('marks commercial-redemption coaching steps as perilous or contested on debt discharge', () => {
    const pack = getPrimerPackage('proper_debt_discharge');
    const tagged = pack.steps.filter(
      (step) => step.epistemic === 'perilous' || step.epistemic === 'contested',
    );
    expect(tagged.length).toBeGreaterThan(0);
    expect(tagged.every((step) => step.flags.length > 0 || step.speed_bumps.length > 0)).toBe(
      true,
    );
  });

  it('loads property_tax_procedure with institutional protest or redemption steps', () => {
    const pack = getPrimerPackage('property_tax_procedure');
    expect(pack.title).toBe('Property Tax Procedure');
    expect(pack.steps.length).toBeGreaterThanOrEqual(3);
    expect(pack.steps.some((step) => step.epistemic === 'institutional')).toBe(true);
  });

  it('loads irs_form_intimacy with Form 8822-B and tags contested fills', () => {
    const pack = getPrimerPackage('irs_form_intimacy');
    expect(pack.title).toBe('IRS Form Intimacy');
    const form8822 = pack.steps.flatMap((step) => step.forms).find((form) => form.form_id === '8822-B');
    expect(form8822?.title).toMatch(/8822-B|Change of Address/i);
    const tagged = pack.steps.filter(
      (step) => step.epistemic === 'contested' || step.epistemic === 'perilous',
    );
    expect(tagged.length).toBeGreaterThan(0);
    expect(tagged.every((step) => step.flags.length > 0)).toBe(true);
  });
});
