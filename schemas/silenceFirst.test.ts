/**
 * Unit tests for Silence-First Philosophy Contract helpers.
 */
import { describe, expect, it } from 'vitest';
import {
  SilenceFirstResultSchema,
  holdingsToSilenceEnvelope,
  silenceFirstHit,
  silenceFirstSilent,
} from './silenceFirst';

describe('SilenceFirstResultSchema', () => {
  it('accepts a citeable hit', () => {
    const hit = silenceFirstHit({
      authority_kind: 'statute',
      reason: 'Matched UCC 3-104',
      citation: 'UCC § 3-104',
      text: '…',
      metric: 'unknown',
      provenance: 'fallback',
    });
    expect(hit.silenced).toBe(false);
    expect(hit.found).toBe(true);
    expect(SilenceFirstResultSchema.parse(hit).contract_version).toBe('1.0');
  });

  it('accepts a silenced miss', () => {
    const silent = silenceFirstSilent({
      authority_kind: 'statute',
      reason: 'No match in law corpus',
    });
    expect(silent.silenced).toBe(true);
    expect(silent.found).toBe(false);
  });
});

describe('holdingsToSilenceEnvelope', () => {
  it('silences when holdings are empty', () => {
    const env = holdingsToSilenceEnvelope({ holdings: [] });
    expect(env.silenced).toBe(true);
    expect(env.authority_kind).toBe('holding');
  });

  it('silences weak-only under strict policy', () => {
    const env = holdingsToSilenceEnvelope({
      holdings: [{ strength: 'weak', citation: '1 U.S. 1', holding: 'dicta' }],
      silence_policy: 'strict',
    });
    expect(env.silenced).toBe(true);
    expect(env.found).toBe(true);
  });

  it('allows moderate/strong under strict policy', () => {
    const env = holdingsToSilenceEnvelope({
      holdings: [
        { strength: 'weak', citation: 'a' },
        { strength: 'strong', citation: 'b', holding: 'rule', title: 'Case' },
      ],
    });
    expect(env.silenced).toBe(false);
    expect(env.citation).toBe('b');
    expect(env.score).toBe(1);
  });
});
