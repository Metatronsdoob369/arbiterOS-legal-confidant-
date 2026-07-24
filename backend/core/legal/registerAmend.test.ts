import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  listRegisterProposals,
  mergeRegisterProposal,
  proposeRegisterEntry,
  rejectRegisterProposal,
} from './registerAmend';
import {
  __resetRegisterLexiconCacheForTests,
  loadRegisterLexicon,
  translateRegister,
} from './registerLexicon';
import type { RegisterEntry, RegisterLexicon } from '../../../schemas/legalSchemas';

const seedEntry: RegisterEntry = {
  term_id: 'money',
  surface_forms: ['money'],
  matrix: 'money_credit',
  confusion_with: [],
  mirror_hint: 'Echo money usage.',
  procedural_triggers: [],
  senses: [
    {
      register: 'plain',
      epistemic: 'plain',
      definition: 'Cash.',
      authority_cite: 'plain usage',
      source_refs: [],
    },
    {
      register: 'statute',
      epistemic: 'settled',
      definition: 'UCC money.',
      authority_cite: 'UCC §1-201(b)(24)',
      source_refs: ['ucc:1-201'],
    },
  ],
};

function makeTempWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'arbiter-register-amend-'));
  const lexiconPath = path.join(root, 'lexicon.json');
  const proposalsDir = path.join(root, 'proposals');
  fs.mkdirSync(proposalsDir, { recursive: true });

  const lexicon: RegisterLexicon = {
    schema_version: '0.1.0',
    lexicon_id: 'test-confidant',
    version: '1.0.0',
    description: 'test pack',
    entries: [seedEntry],
  };
  fs.writeFileSync(lexiconPath, `${JSON.stringify(lexicon, null, 2)}\n`, 'utf8');

  process.env.REGISTER_LEXICON_PATH = lexiconPath;
  process.env.REGISTER_PROPOSALS_DIR = proposalsDir;
  __resetRegisterLexiconCacheForTests();

  return { root, lexiconPath, proposalsDir };
}

let workspace: ReturnType<typeof makeTempWorkspace>;

beforeEach(() => {
  workspace = makeTempWorkspace();
});

afterEach(() => {
  __resetRegisterLexiconCacheForTests();
  fs.rmSync(workspace.root, { recursive: true, force: true });
  delete process.env.REGISTER_LEXICON_PATH;
  delete process.env.REGISTER_PROPOSALS_DIR;
});

const transmittingUtilityEntry: RegisterEntry = {
  term_id: 'transmitting_utility',
  surface_forms: ['transmitting utility', 'transmitting utilities'],
  matrix: 'identity_split',
  confusion_with: ['debtor', 'person'],
  mirror_hint: 'Echo the phrase; map to Article 9 transmitting-utility debtor category.',
  procedural_triggers: [],
  senses: [
    {
      register: 'plain',
      epistemic: 'plain',
      definition: 'A utility that transmits something.',
      authority_cite: 'plain usage',
      source_refs: [],
    },
    {
      register: 'statute',
      epistemic: 'settled',
      definition: 'A person primarily engaged in the railroad, subway, street railway, or trolley bus business, electric or electronics communications, transmission of certain commodities by pipeline, or transmission/production/distribution of certain utilities.',
      authority_cite: 'UCC §9-102(a)(81)',
      source_refs: ['ucc:9-102'],
    },
  ],
};

describe('register amend (capture → propose → merge)', () => {
  it('proposes an entry without mutating the live lexicon', () => {
    const proposal = proposeRegisterEntry({
      trigger_text: 'Am I a transmitting utility under the code?',
      notes: 'New situation from diligence session',
      entry: transmittingUtilityEntry,
    });

    expect(proposal.status).toBe('pending');
    expect(proposal.id).toMatch(/^prop_/);
    expect(fs.existsSync(path.join(workspace.proposalsDir, `${proposal.id}.json`))).toBe(true);

    const before = loadRegisterLexicon(true).lexicon;
    expect(before.entries.some((e) => e.term_id === 'transmitting_utility')).toBe(false);
    expect(before.version).toBe('1.0.0');
  });

  it('lists pending proposals', () => {
    proposeRegisterEntry({
      trigger_text: 'transmitting utility?',
      entry: transmittingUtilityEntry,
    });
    const listed = listRegisterProposals({ status: 'pending' });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.entry.term_id).toBe('transmitting_utility');
  });

  it('merges a proposal into the lexicon, bumps version, and hot-reloads matching', () => {
    const proposal = proposeRegisterEntry({
      trigger_text: 'transmitting utility?',
      entry: transmittingUtilityEntry,
    });

    const merged = mergeRegisterProposal(proposal.id);
    expect(merged.proposal.status).toBe('merged');
    expect(merged.lexicon.version).toBe('1.0.1');
    expect(merged.lexicon.entries.some((e) => e.term_id === 'transmitting_utility')).toBe(true);

    const live = loadRegisterLexicon(true).lexicon;
    expect(live.version).toBe('1.0.1');

    const mirror = translateRegister({ text: 'Am I a transmitting utility?' });
    expect(mirror.matched_terms.some((t) => t.term_id === 'transmitting_utility')).toBe(true);
  });

  it('amends an existing term_id on merge instead of duplicating', () => {
    const amended: RegisterEntry = {
      ...seedEntry,
      surface_forms: ['money', 'paying money'],
      mirror_hint: 'Updated mirror hint after new situation.',
    };
    const proposal = proposeRegisterEntry({
      trigger_text: 'paying money again',
      entry: amended,
      mode: 'amend',
    });
    const merged = mergeRegisterProposal(proposal.id);
    const moneyEntries = merged.lexicon.entries.filter((e) => e.term_id === 'money');
    expect(moneyEntries).toHaveLength(1);
    expect(moneyEntries[0]?.surface_forms).toContain('paying money');
    expect(merged.lexicon.version).toBe('1.0.1');
  });

  it('rejects a proposal without touching the lexicon', () => {
    const proposal = proposeRegisterEntry({
      trigger_text: 'skip this',
      entry: transmittingUtilityEntry,
    });
    const rejected = rejectRegisterProposal(proposal.id, 'not ready');
    expect(rejected.status).toBe('rejected');
    expect(rejected.reject_reason).toBe('not ready');

    const live = loadRegisterLexicon(true).lexicon;
    expect(live.version).toBe('1.0.0');
    expect(live.entries.some((e) => e.term_id === 'transmitting_utility')).toBe(false);
  });

  it('refuses to merge a non-pending proposal twice', () => {
    const proposal = proposeRegisterEntry({
      trigger_text: 'once',
      entry: transmittingUtilityEntry,
    });
    mergeRegisterProposal(proposal.id);
    expect(() => mergeRegisterProposal(proposal.id)).toThrow(/not pending/i);
  });
});
