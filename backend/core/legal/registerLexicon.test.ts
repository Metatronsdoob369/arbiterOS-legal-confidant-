import { afterEach, describe, expect, it } from 'vitest';
import {
  __resetRegisterLexiconCacheForTests,
  loadRegisterLexicon,
  translateRegister,
} from './registerLexicon';

afterEach(() => {
  __resetRegisterLexiconCacheForTests();
});

describe('register lexicon (private confidant)', () => {
  it('loads the private-confidant.v1 seed pack from disk', () => {
    const { lexicon, sourcePath } = loadRegisterLexicon(true);
    expect(lexicon.lexicon_id).toBe('private-confidant');
    expect(lexicon.entries.length).toBeGreaterThan(10);
    expect(sourcePath).toMatch(/private-confidant\.v1\.json$/);
  });

  it('mirrors United States citizen with capacity distinction', () => {
    loadRegisterLexicon(true);
    const result = translateRegister({
      text: 'Am I a United States citizen or a citizen of a state for this filing?',
    });

    const ids = result.matched_terms.map((t) => t.term_id);
    expect(ids).toContain('united_states_citizen');
    expect(ids).toContain('citizen_of_a_state');

    const us = result.matched_terms.find((t) => t.term_id === 'united_states_citizen');
    expect(us?.posture).toBe('mirror_then_distinguish');
    expect(us?.user_usage_echo.toLowerCase()).toContain('united states citizen');
    expect(us?.senses_by_band.settled.length).toBeGreaterThan(0);
  });

  it('splits file my lien into security agreement vs UCC-1 confusion notes', () => {
    loadRegisterLexicon(true);
    const result = translateRegister({ text: 'I need to file my lien this week.' });
    const lien = result.matched_terms.find((t) => t.term_id === 'lien');
    expect(lien).toBeDefined();
    expect(lien?.user_usage_echo.toLowerCase()).toContain('lien');
    expect(lien?.confusion_notes.some((n) => /security_agreement|ucc1/i.test(n))).toBe(true);
    expect(lien?.senses_by_band.settled.some((s) => /9-203|9-310|perfection/i.test(s.authority_cite + s.definition))).toBe(true);
  });

  it('maps paying money / loan through the money-credit matrix', () => {
    loadRegisterLexicon(true);
    const result = translateRegister({ text: 'I am paying money after getting a loan.' });
    const ids = result.matched_terms.map((t) => t.term_id);
    expect(ids).toContain('money');
    expect(ids).toContain('loan');
  });

  it('surfaces contested band for lawful money without treating it as settled', () => {
    loadRegisterLexicon(true);
    const result = translateRegister({ text: 'Do they require lawful money?' });
    const entry = result.matched_terms.find((t) => t.term_id === 'lawful_money');
    expect(entry).toBeDefined();
    expect(entry?.senses_by_band.contested.length).toBeGreaterThan(0);
    expect(entry?.senses_by_band.settled.some((s) => /1-201\(b\)\(24\)/.test(s.authority_cite))).toBe(true);
  });

  it('reminds UCC 1-308 on signature language', () => {
    loadRegisterLexicon(true);
    const result = translateRegister({ text: 'Should I sign this demand letter?' });
    const sig = result.matched_terms.find((t) => t.term_id === 'signature');
    expect(sig).toBeDefined();
    expect(sig?.procedural_reminders.some((r) => /1-308/.test(r))).toBe(true);
  });

  it('distinguishes payment from Article 3 discharge', () => {
    loadRegisterLexicon(true);
    const result = translateRegister({ text: 'I paid it — is that a true discharge?' });
    const ids = result.matched_terms.map((t) => t.term_id);
    expect(ids).toContain('payment');
    expect(ids).toContain('discharge');
    const discharge = result.matched_terms.find((t) => t.term_id === 'discharge');
    expect(discharge?.senses_by_band.settled.some((s) => /3-604|3-601/.test(s.authority_cite))).toBe(true);
  });

  it('maps took the money back to reclamation', () => {
    loadRegisterLexicon(true);
    const result = translateRegister({ text: 'They took the money back from my account.' });
    expect(result.matched_terms.some((t) => t.term_id === 'reclamation')).toBe(true);
  });

  it('maps transmitting utility and all-assets collateral phrases', () => {
    loadRegisterLexicon(true);
    const util = translateRegister({ text: 'Is this debtor a transmitting utility?' });
    expect(util.matched_terms.some((t) => t.term_id === 'transmitting_utility')).toBe(true);
    const collateral = translateRegister({ text: 'Cover all assets of the debtor on the filing.' });
    expect(collateral.matched_terms.some((t) => t.term_id === 'collateral_description')).toBe(true);
  });

  it('prefers longer surface forms over shorter overlapping ones', () => {
    loadRegisterLexicon(true);
    const result = translateRegister({ text: 'I am a United States citizen.' });
    const ids = result.matched_terms.map((t) => t.term_id);
    expect(ids).toContain('united_states_citizen');
    // "citizen" alone should not also match inside the longer phrase span.
    expect(ids.filter((id) => id === 'citizen')).toHaveLength(0);
  });
});
