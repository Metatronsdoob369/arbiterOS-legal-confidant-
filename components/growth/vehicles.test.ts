import { describe, expect, it } from 'vitest';
import type { PrimerPackage } from '../../schemas/legalSchemas';
import { vehiclesForPackage } from './vehicles';

const basePackage = (package_id: string, title: string, outcome: string): PrimerPackage => ({
  package_id,
  title,
  outcome,
  course_kind: 'primer',
  vector_ready: false,
  steps: [
    {
      id: 's1',
      title: 'Step one',
      order: 1,
      forms: [],
      lines: [],
      speed_bumps: [],
      flags: [],
      epistemic: 'settled',
    },
  ],
});

describe('vehiclesForPackage', () => {
  it('returns Contract Navigation sample vehicles', () => {
    const vehicles = vehiclesForPackage(
      basePackage('contract_navigation', 'Contract Navigation', 'Read a contract in sequence.'),
    );
    expect(vehicles.length).toBeGreaterThanOrEqual(2);
    expect(vehicles.some((v) => /dealership|auto/i.test(v.label))).toBe(true);
    expect(vehicles.every((v) => v.areaId === 'contract_navigation')).toBe(true);
  });

  it('falls back to a single primary vehicle for unknown areas', () => {
    const vehicles = vehiclesForPackage(
      basePackage('transition_essentials', 'Transition Essentials', 'Organize identity and records.'),
    );
    expect(vehicles).toHaveLength(1);
    expect(vehicles[0]?.id).toBe('transition_essentials-primary');
    expect(vehicles[0]?.label).toContain('Transition Essentials');
  });
});
