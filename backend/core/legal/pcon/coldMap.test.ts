import { describe, expect, it } from 'vitest';
import { consultColdMap, loadColdMapEntries } from './coldMap';

describe('pcon cold map', () => {
  it('loads seeded failure citizens', () => {
    const { entries } = loadColdMapEntries(true);
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(entries.some((e) => e.failure_id === 'myth-as-settled-lawful-money')).toBe(true);
    expect(entries.some((e) => e.failure_id === 'public-filler-tfx-clocks')).toBe(true);
    expect(entries.some((e) => e.failure_id === 'pacioli-as-modern-us-debtor-proof')).toBe(true);
  });

  it('consults burns for myth-as-settled / lawful money', () => {
    const result = consultColdMap({ query: 'lawful money is always required as settled law', limit: 5 });
    expect(result.posture).toBe('negative_cartography');
    expect(result.hits.length).toBeGreaterThan(0);
    expect(result.hits.some((h) => h.kind === 'myth_as_settled')).toBe(true);
    expect(result.provenance.matched).toBe(true);
  });

  it('consults burns for invented TFX clocks', () => {
    const result = consultColdMap({ query: 'treasury reclamation deadline protest clock', limit: 5 });
    expect(result.hits.some((h) => h.failure_id === 'public-filler-tfx-clocks')).toBe(true);
  });

  it('consults burns for Pacioli-as-modern-US-debtor freestyle', () => {
    const result = consultColdMap({
      query: 'Pacioli proves the United States is an obligated debtor under double-entry',
      limit: 5,
    });
    expect(result.hits.some((h) => h.failure_id === 'pacioli-as-modern-us-debtor-proof')).toBe(true);
  });
});
