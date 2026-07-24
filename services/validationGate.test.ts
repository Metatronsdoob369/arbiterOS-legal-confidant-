import { describe, expect, it } from 'vitest';
import { runValidationGate } from './validationGate';

describe('validation gate R5', () => {
  it('blocks a high-severity interpretation claim without statute or strong holding support', async () => {
    const decision = await runValidationGate({
      draft_text: '[interpretation] This note is negotiable.',
      claims: [
        {
          id: 'c1',
          text: '[interpretation] This note is negotiable.',
          kind: 'interpretation',
          severity: 'high',
          evidence: [],
          interpretation_links: [],
        },
      ],
    });

    expect(decision.decision).toBe('block');
    expect(decision.validation_steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rule_id: 'R5_HOLDING_REQUIRED',
          passed: false,
        }),
      ]),
    );
  });

  it('passes a high-severity interpretation claim with a strong holding link', async () => {
    const decision = await runValidationGate({
      draft_text: '[interpretation] The note is likely negotiable under UCC 3-104.',
      claims: [
        {
          id: 'c1',
          text: '[interpretation] The note is likely negotiable under UCC 3-104.',
          kind: 'interpretation',
          severity: 'high',
          evidence: [
            {
              kind: 'holding',
              ref: 'clh-ucc-3-104-unconditional-promise',
              strength: 'strong',
              quote: 'Negotiability demands an unconditional promise to pay.',
            },
          ],
          interpretation_links: [
            {
              holding_id: 'clh-ucc-3-104-unconditional-promise',
              citation: 'Seed Common Law § UCC 3-104 / unconditional promise',
              relation: 'supports',
              strength: 'strong',
              quote: 'Negotiability demands an unconditional promise to pay.',
            },
          ],
        },
      ],
    });

    expect(decision.decision).toBe('pass');
    expect(decision.validation_steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rule_id: 'R5_HOLDING_PRESENT',
          passed: true,
        }),
      ]),
    );
  });
});
