import { describe, expect, it } from 'vitest';
import { buildPrivateConfidantInstruction, getPconCockpitContract } from './pconCockpit';

describe('pconCockpit', () => {
  it('loads the cockpit contract veneer', () => {
    const c = getPconCockpitContract();
    expect(c.contract_id).toBe('private-confidant-cockpit');
    expect(c.posture).toBe('loyal_opposition');
    expect(c.rules.some((r) => r.id === 'loyal_opposition')).toBe(true);
    expect(c.out_of_scope).toContain('trading_bot');
  });

  it('builds Private Confidant instruction from the contract', () => {
    const text = buildPrivateConfidantInstruction();
    expect(text).toContain('COCKPIT CONTRACT');
    expect(text).toContain('loyal_opposition');
    expect(text).toContain('cold-map');
    expect(text).toContain('consult_cold_map');
    expect(text).toContain('Pacioli');
  });

  it('includes Hypothesis Ledger tools and seal posture in cockpit instruction', () => {
    const text = buildPrivateConfidantInstruction();
    expect(text).toContain('HYPOTHESIS LEDGER');
    expect(text).toContain('research-first');
    expect(text).toContain('sealed_executable');
    for (const tool of [
      'ledger_upsert_case',
      'ledger_create_hypothesis',
      'ledger_attach_evidence',
      'ledger_advance_lane',
      'ledger_query',
      'ledger_export',
    ]) {
      expect(text).toContain(tool);
    }
  });
});
