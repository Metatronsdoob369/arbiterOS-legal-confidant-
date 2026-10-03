import { describe, expect, it } from 'vitest';
import { verifyNegotiability, type InstrumentTerms } from './legalEngine';

describe('verifyNegotiability', () => {
  const validTerms: InstrumentTerms = {
    promise_type: 'unconditional',
    amount_type: 'fixed',
    payable_to: 'bearer',
    timing: 'demand',
    other_undertakings: false,
  };

  it('passes when instrument terms satisfy all UCC 3-104 requirements', async () => {
    const result = await verifyNegotiability(validTerms);

    expect(result.rule_id).toBe('UCC_3_104');
    expect(result.passed).toBe(true);
    expect(result.details).toBe('PASSED: Instrument meets all UCC 3-104 requirements for negotiability.');
    expect(result.evidence_source).toContain('UCC 3-104');
    expect(typeof result.timestamp).toBe('string');
  });

  it('passes when payable_to is order and timing is definite', async () => {
    const result = await verifyNegotiability({
      ...validTerms,
      payable_to: 'order',
      timing: 'definite',
    });

    expect(result.passed).toBe(true);
  });

  it('fails when promise_type is conditional', async () => {
    const result = await verifyNegotiability({
      ...validTerms,
      promise_type: 'conditional',
    });

    expect(result.passed).toBe(false);
    expect(result.details).toContain('Must be an unconditional promise (UCC 3-104(a))');
  });

  it('fails when amount_type is variable', async () => {
    const result = await verifyNegotiability({
      ...validTerms,
      amount_type: 'variable',
    });

    expect(result.passed).toBe(false);
    expect(result.details).toContain('Must specify a fixed amount of money (UCC 3-104(a))');
  });

  it('fails when payable_to is specific_person', async () => {
    const result = await verifyNegotiability({
      ...validTerms,
      payable_to: 'specific_person',
    });

    expect(result.passed).toBe(false);
    expect(result.details).toContain('Must be payable to bearer or to order (UCC 3-104(a)(1))');
  });

  it('fails when timing is indefinite', async () => {
    const result = await verifyNegotiability({
      ...validTerms,
      timing: 'indefinite',
    });

    expect(result.passed).toBe(false);
    expect(result.details).toContain('Must be payable on demand or at a definite time (UCC 3-104(a)(2))');
  });

  it('fails when other_undertakings is true', async () => {
    const result = await verifyNegotiability({
      ...validTerms,
      other_undertakings: true,
    });

    expect(result.passed).toBe(false);
    expect(result.details).toContain('Must not state any other undertaking (UCC 3-104(a)(3))');
  });

  it('concatenates all violations when multiple requirements are breached', async () => {
    const invalidTerms: InstrumentTerms = {
      promise_type: 'conditional',
      amount_type: 'variable',
      payable_to: 'specific_person',
      timing: 'indefinite',
      other_undertakings: true,
    };

    const result = await verifyNegotiability(invalidTerms);

    expect(result.passed).toBe(false);
    expect(result.details).toContain('FAILED: Non-negotiable. Violations:');
    expect(result.details).toContain('Must be an unconditional promise (UCC 3-104(a))');
    expect(result.details).toContain('Must specify a fixed amount of money (UCC 3-104(a))');
    expect(result.details).toContain('Must be payable to bearer or to order (UCC 3-104(a)(1))');
    expect(result.details).toContain('Must be payable on demand or at a definite time (UCC 3-104(a)(2))');
    expect(result.details).toContain('Must not state any other undertaking (UCC 3-104(a)(3))');
  });
});
