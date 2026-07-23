import { describe, expect, it } from 'vitest';
import { sortPackageSteps } from './sortSteps';

describe('sortPackageSteps', () => {
  it('orders by order ascending without mutating input', () => {
    const input = [
      { id: 'b', title: 'B', order: 2, forms: [], lines: [], speed_bumps: [], flags: [], epistemic: 'settled' as const },
      { id: 'a', title: 'A', order: 1, forms: [], lines: [], speed_bumps: [], flags: [], epistemic: 'settled' as const },
    ];

    const sorted = sortPackageSteps(input);

    expect(sorted.map((step) => step.id)).toEqual(['a', 'b']);
    expect(input[0]?.id).toBe('b');
  });
});
