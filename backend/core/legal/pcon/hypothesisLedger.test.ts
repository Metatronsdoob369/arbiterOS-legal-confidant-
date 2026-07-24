import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LEDGER_BELT_VERSION } from '../../../../schemas/hypothesisLedger';
import {
  advanceLane,
  attachEvidence,
  createHypothesis,
  ensureSeedLedger,
  exportLedgerMarkdown,
  loadLedger,
  mintGrowthStep,
  queryHypotheses,
  saveLedger,
  upsertCase,
} from './hypothesisLedger';

describe('hypothesisLedger store', () => {
  let dir: string;
  let prev: string | undefined;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pcon-ledger-'));
    prev = process.env.PCON_LEDGER_PATH;
    process.env.PCON_LEDGER_PATH = path.join(dir, 'ledger.v1.json');
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.PCON_LEDGER_PATH;
    else process.env.PCON_LEDGER_PATH = prev;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('rejects save with stale belt_version', () => {
    expect(() =>
      saveLedger({
        schema_version: '0.1.0',
        belt_version: '0.0.1',
        cases: [],
        hypotheses: [],
        audit_trail: [],
      }),
    ).toThrow(/belt_version/);
  });

  it('rejects load with stale belt_version on disk', () => {
    const ledgerPath = process.env.PCON_LEDGER_PATH!;
    fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
    fs.writeFileSync(
      ledgerPath,
      JSON.stringify({
        schema_version: '0.1.0',
        belt_version: '0.0.1',
        cases: [],
        hypotheses: [],
        audit_trail: [],
      }),
    );
    expect(() => loadLedger()).toThrow(/belt_version/);
  });

  it('creates study hypothesis and attaches evidence', () => {
    upsertCase({
      id: '22222222-2222-4222-8222-222222222222',
      title: 'DTC path',
      goal: 'Understand DTC + clearinghouse',
      focus_hypothesis_ids: [],
      working_premise_ids: [],
    });
    const h = createHypothesis({
      title: 'DTC Trust study',
      claim: 'Public structure of DTC custody',
      lane: 'study',
      disposition: 'open',
      confidence: 0.2,
      tags: ['dtc'],
      case_id: '22222222-2222-4222-8222-222222222222',
      source: 'test',
    });
    const updated = attachEvidence(h.id, {
      type: 'procedure',
      ref: 'spine:dtc-public-rules',
      epistemic_ceiling: 'institutional',
    });
    expect(updated.evidence_refs).toHaveLength(1);
    expect(loadLedger().belt_version).toBe(LEDGER_BELT_VERSION);
  });

  it('refuses sealed_executable without all three gates and records ValidationStep', () => {
    const h = createHypothesis({
      title: 'Premature seal',
      claim: 'Code alone',
      lane: 'procedural_potential',
      disposition: 'supported',
      confidence: 0.5,
      tags: [],
      source: 'test',
    });
    expect(() =>
      advanceLane({
        hypothesisId: h.id,
        toLane: 'sealed_executable',
        seal: { proven: true, explainable: true, legally_executable: false },
      }),
    ).toThrow(/legally_executable|seal/i);

    const after = loadLedger().hypotheses.find((x) => x.id === h.id)!;
    expect(
      after.provenance.validation_steps.some(
        (s) => s.rule_id === 'ledger.seal_gates' && s.passed === false,
      ),
    ).toBe(true);
  });

  it('advances to sealed_executable when all gates pass and records passed ValidationStep', () => {
    const h = createHypothesis({
      title: 'Ready',
      claim: 'Situation-bound executable path documented',
      lane: 'procedural_potential',
      disposition: 'supported',
      confidence: 0.8,
      tags: [],
      source: 'test',
    });
    const sealed = advanceLane({
      hypothesisId: h.id,
      toLane: 'sealed_executable',
      seal: { proven: true, explainable: true, legally_executable: true },
      actor: 'operator',
    });
    expect(sealed.lane).toBe('sealed_executable');
    expect(sealed.seal?.legally_executable).toBe(true);
    expect(
      sealed.provenance.validation_steps.some(
        (s) => s.rule_id === 'ledger.seal_gates' && s.passed === true,
      ),
    ).toBe(true);
  });

  it('counsel query includes study; private_commerce only sealed_executable', () => {
    createHypothesis({
      title: 'Study A',
      claim: 'c',
      lane: 'study',
      disposition: 'open',
      confidence: 0.1,
      tags: ['private-commerce'],
      source: 'test',
    });
    const sealedBase = createHypothesis({
      title: 'Sealed B',
      claim: 'c',
      lane: 'procedural_potential',
      disposition: 'supported',
      confidence: 0.9,
      tags: ['private-commerce'],
      source: 'test',
    });
    advanceLane({
      hypothesisId: sealedBase.id,
      toLane: 'sealed_executable',
      seal: { proven: true, explainable: true, legally_executable: true },
    });
    expect(queryHypotheses({ mode: 'counsel' }).some((h) => h.lane === 'study')).toBe(true);
    expect(queryHypotheses({ mode: 'private_commerce' }).every((h) => h.lane === 'sealed_executable')).toBe(
      true,
    );
  });

  it('counsel query excludes parked by default; includeParked adds parked lane', () => {
    createHypothesis({
      title: 'Parked item',
      claim: 'c',
      lane: 'parked',
      disposition: 'open',
      confidence: 0.1,
      tags: [],
      source: 'test',
    });
    expect(queryHypotheses({ mode: 'counsel' }).some((h) => h.lane === 'parked')).toBe(false);
    expect(
      queryHypotheses({ mode: 'counsel', includeParked: true }).some((h) => h.lane === 'parked'),
    ).toBe(true);
  });

  it('exportLedgerMarkdown contains case title, hypothesis title, and validation content', () => {
    const caseId = '33333333-3333-4333-8333-333333333333';
    upsertCase({
      id: caseId,
      title: 'Export Test Case',
      goal: 'Verify markdown export',
      focus_hypothesis_ids: [],
      working_premise_ids: [],
    });
    const h = createHypothesis({
      title: 'Export Hypothesis',
      claim: 'Test claim for export',
      lane: 'procedural_potential',
      disposition: 'supported',
      confidence: 0.8,
      tags: [],
      case_id: caseId,
      source: 'test',
    });
    advanceLane({
      hypothesisId: h.id,
      toLane: 'sealed_executable',
      seal: { proven: true, explainable: true, legally_executable: true },
    });
    const md = exportLedgerMarkdown({ caseId });
    expect(md).toContain('Export Test Case');
    expect(md).toContain('Export Hypothesis');
    expect(md).toMatch(/validation/i);
  });

  it('seed includes one working_premise and one DTC study hypothesis', () => {
    const ledger = ensureSeedLedger();
    expect(ledger.hypotheses.some((h) => h.lane === 'working_premise')).toBe(true);
    expect(
      ledger.hypotheses.some(
        (h) => h.lane === 'study' && /dtc/i.test(h.title + h.claim + h.tags.join(',')),
      ),
    ).toBe(true);
    expect(ledger.cases.length).toBeGreaterThanOrEqual(1);
  });

  it('mintGrowthStep rejects unsealed and sealed-without-publisher', () => {
    const h = createHypothesis({
      title: 'No mint',
      claim: 'c',
      lane: 'study',
      disposition: 'open',
      confidence: 0.1,
      tags: [],
      source: 'test',
    });
    const unsealed = mintGrowthStep(h.id);
    expect(unsealed.ok).toBe(false);
    expect(unsealed.reason).toMatch(/sealed/i);

    advanceLane({
      hypothesisId: h.id,
      toLane: 'sealed_executable',
      seal: { proven: true, explainable: true, legally_executable: true },
    });
    const sealed = mintGrowthStep(h.id);
    expect(sealed.ok).toBe(false);
    expect(sealed.reason).toMatch(/stub|not implemented/i);
  });
});
