import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { researchRegisterTerm } from './registerResearch';
import { __resetRegisterLexiconCacheForTests } from './registerLexicon';
import type { RegisterLexicon } from '../../../schemas/legalSchemas';

function makeTempLexicon(entries: RegisterLexicon['entries']) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'arbiter-register-research-'));
  const lexiconPath = path.join(root, 'lexicon.json');
  const lexicon: RegisterLexicon = {
    schema_version: '0.1.0',
    lexicon_id: 'research-test',
    version: '1.0.0',
    entries,
  };
  fs.writeFileSync(lexiconPath, `${JSON.stringify(lexicon, null, 2)}\n`, 'utf8');
  process.env.REGISTER_LEXICON_PATH = lexiconPath;
  __resetRegisterLexiconCacheForTests();
  return root;
}

let root: string;

beforeEach(() => {
  root = makeTempLexicon([
    {
      term_id: 'minor_age',
      surface_forms: ['minor'],
      matrix: 'fiscal',
      confusion_with: [],
      mirror_hint: 'Echo minor as used.',
      procedural_triggers: [],
      senses: [
        {
          register: 'plain',
          epistemic: 'plain',
          definition: 'A child / underage person in everyday speech.',
          authority_cite: 'plain usage',
          source_refs: [],
        },
        {
          register: 'institutional',
          epistemic: 'institutional',
          definition: 'In some Treasury materials, lowercase minor appears in ordinary descriptive prose.',
          authority_cite: 'Fiscal Service usage (example fixture)',
          source_refs: ['dna:fast-book'],
        },
      ],
    },
  ]);
});

afterEach(() => {
  __resetRegisterLexiconCacheForTests();
  fs.rmSync(root, { recursive: true, force: true });
  delete process.env.REGISTER_LEXICON_PATH;
});

describe('register research (clarify before propose)', () => {
  it('returns pack senses for an in-lexicon term', () => {
    const result = researchRegisterTerm({ term: 'minor', corpus_hint: 'treasury' });
    expect(result.posture).toBe('clarify_before_propose');
    expect(result.in_lexicon).toBe(true);
    expect(result.hits[0]?.senses_by_band.institutional.length).toBeGreaterThan(0);
    expect(result.propose_ready.recommended).toBe(false);
  });

  it('flags case gap when user asks Minor but pack only has minor', () => {
    const result = researchRegisterTerm({
      term: 'Minor',
      context: 'Treasury account policies appear to use Minor and minor differently.',
      corpus_hint: 'treasury',
    });
    expect(result.in_lexicon).toBe(true);
    expect(result.hits[0]?.exact_case_match).toBe(false);
    expect(result.case_gap.noted).toBe(true);
    expect(result.propose_ready.recommended).toBe(true);
    expect(result.propose_ready.mode).toBe('amend');
    expect(result.propose_ready.suggested_surface_forms).toContain('Minor');
  });

  it('marks unknown terms propose-ready without inventing settled senses', () => {
    const result = researchRegisterTerm({ term: 'transmittal code', corpus_hint: 'treasury' });
    expect(result.in_lexicon).toBe(false);
    expect(result.hits).toHaveLength(0);
    expect(result.propose_ready.recommended).toBe(true);
    expect(result.propose_ready.mode).toBe('create');
    expect(result.clarity_summary.toLowerCase()).toContain('no lexicon entry');
  });
});
