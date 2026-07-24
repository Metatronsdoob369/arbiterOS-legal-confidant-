import { describe, expect, it } from 'vitest';
import {
  LEDGER_BELT_VERSION,
  LedgerEnvelopeSchema,
  HypothesisSchema,
  assertCurrentBeltVersion,
} from './hypothesisLedger';

describe('HypothesisLedger schemas', () => {
  it('parses a minimal study hypothesis', () => {
    const now = '2026-07-24T17:00:00.000Z';
    const h = HypothesisSchema.parse({
      id: '11111111-1111-4111-8111-111111111111',
      title: 'DTC Trust study',
      claim: 'Map what DTC and clearinghouse publicly are.',
      lane: 'study',
      disposition: 'open',
      confidence: 0.2,
      evidence_refs: [],
      tags: ['dtc'],
      provenance: {
        source: 'seed',
        timestamp: now,
        validation_steps: [],
      },
      created_at: now,
      updated_at: now,
    });
    expect(h.lane).toBe('study');
  });

  it('rejects stale belt_version via assertCurrentBeltVersion', () => {
    expect(() => assertCurrentBeltVersion({ belt_version: '0.0.1' })).toThrow(/belt_version/);
    expect(() => assertCurrentBeltVersion({ belt_version: LEDGER_BELT_VERSION })).not.toThrow();
  });

  it('parses ledger envelope with belt_version', () => {
    const env = LedgerEnvelopeSchema.parse({
      schema_version: '0.1.0',
      belt_version: LEDGER_BELT_VERSION,
      cases: [],
      hypotheses: [],
      audit_trail: [],
    });
    expect(env.belt_version).toBe(LEDGER_BELT_VERSION);
  });
});
