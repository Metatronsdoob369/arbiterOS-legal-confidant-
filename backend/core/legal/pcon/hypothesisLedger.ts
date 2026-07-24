import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  LEDGER_BELT_VERSION,
  LedgerEnvelopeSchema,
  LedgerEvidenceRefSchema,
  HypothesisSchema,
  CaseStrategySchema,
  assertCurrentBeltVersion,
  type CaseStrategy,
  type LedgerEvidenceRef,
  type Hypothesis,
  type LedgerEnvelope,
} from '../../../../schemas/hypothesisLedger';
import { type ValidationStep } from '../../../../schemas/legalSchemas';

const DEFAULT_LEDGER_PATH = 'backend/core/legal/pcon/knowledge/ledger/ledger.v1.json';
const DEFAULT_SEED_PATH = 'backend/core/legal/pcon/knowledge/ledger/seed.v1.json';

let cachedLedger: LedgerEnvelope | null = null;
let cachedPath: string | null = null;

function resolveLedgerPath(configuredPath: string): string {
  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }
  return path.resolve(process.cwd(), configuredPath);
}

export function getLedgerPath(): string {
  const configured = process.env.PCON_LEDGER_PATH ?? DEFAULT_LEDGER_PATH;
  return resolveLedgerPath(configured);
}

function emptyEnvelope(): LedgerEnvelope {
  return LedgerEnvelopeSchema.parse({
    schema_version: '0.1.0',
    belt_version: LEDGER_BELT_VERSION,
    cases: [],
    hypotheses: [],
    audit_trail: [],
  });
}

function readEnvelopeFromDisk(filePath: string): LedgerEnvelope {
  if (!fs.existsSync(filePath)) {
    return emptyEnvelope();
  }
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  const envelope = LedgerEnvelopeSchema.parse(raw);
  assertCurrentBeltVersion(envelope);
  return envelope;
}

function writeEnvelopeToDisk(filePath: string, envelope: LedgerEnvelope): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
}

function cloneEnvelope(envelope: LedgerEnvelope): LedgerEnvelope {
  return structuredClone(envelope);
}

function readSeedEnvelope(): LedgerEnvelope {
  const seedPath = resolveLedgerPath(DEFAULT_SEED_PATH);
  if (!fs.existsSync(seedPath)) {
    throw new Error(`seed ledger not found: ${seedPath}`);
  }
  const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as unknown;
  const envelope = LedgerEnvelopeSchema.parse(raw);
  assertCurrentBeltVersion(envelope);
  return envelope;
}

export function ensureSeedLedger(): LedgerEnvelope {
  const filePath = getLedgerPath();
  if (fs.existsSync(filePath)) {
    return loadLedger(true);
  }

  const seeded = readSeedEnvelope();
  writeEnvelopeToDisk(filePath, seeded);
  cachedLedger = seeded;
  cachedPath = filePath;
  return cloneEnvelope(seeded);
}

export function loadLedger(forceReload = false): LedgerEnvelope {
  const filePath = getLedgerPath();
  if (!forceReload && cachedLedger && cachedPath === filePath) {
    return cloneEnvelope(cachedLedger);
  }

  const envelope = readEnvelopeFromDisk(filePath);
  cachedLedger = envelope;
  cachedPath = filePath;
  return cloneEnvelope(envelope);
}

export function saveLedger(envelope: LedgerEnvelope): LedgerEnvelope {
  const parsed = LedgerEnvelopeSchema.parse(envelope);
  assertCurrentBeltVersion(parsed);

  const filePath = getLedgerPath();
  writeEnvelopeToDisk(filePath, parsed);
  cachedLedger = parsed;
  cachedPath = filePath;
  return parsed;
}

function pushAudit(envelope: LedgerEnvelope, message: string): LedgerEnvelope {
  return {
    ...envelope,
    audit_trail: [...envelope.audit_trail, `${new Date().toISOString()} ${message}`],
  };
}

export function upsertCase(
  input: Omit<CaseStrategy, 'created_at' | 'updated_at' | 'id'> & { id?: string },
): CaseStrategy {
  const ledger = loadLedger();
  const now = new Date().toISOString();
  const id = input.id ?? crypto.randomUUID();
  const idx = ledger.cases.findIndex((c) => c.id === id);

  const nextCase = CaseStrategySchema.parse({
    ...input,
    id,
    focus_hypothesis_ids: input.focus_hypothesis_ids ?? [],
    working_premise_ids: input.working_premise_ids ?? [],
    created_at: idx >= 0 ? ledger.cases[idx]!.created_at : now,
    updated_at: now,
  });

  const cases =
    idx >= 0
      ? ledger.cases.map((c, i) => (i === idx ? nextCase : c))
      : [...ledger.cases, nextCase];

  saveLedger(
    pushAudit(
      { ...ledger, cases },
      idx >= 0 ? `upsertCase updated ${id}` : `upsertCase created ${id}`,
    ),
  );

  return nextCase;
}

export type CreateHypothesisInput = {
  title: string;
  claim: string;
  lane: Hypothesis['lane'];
  disposition: Hypothesis['disposition'];
  confidence: number;
  tags?: string[];
  case_id?: string;
  source: string;
  id?: string;
};

export function createHypothesis(input: CreateHypothesisInput): Hypothesis {
  const ledger = loadLedger();
  const now = new Date().toISOString();
  const id = input.id ?? crypto.randomUUID();

  const hypothesis = HypothesisSchema.parse({
    id,
    title: input.title,
    claim: input.claim,
    lane: input.lane,
    disposition: input.disposition,
    confidence: input.confidence,
    evidence_refs: [],
    tags: input.tags ?? [],
    case_id: input.case_id,
    provenance: {
      source: input.source,
      timestamp: now,
      validation_steps: [],
    },
    created_at: now,
    updated_at: now,
  });

  saveLedger(
    pushAudit(
      { ...ledger, hypotheses: [...ledger.hypotheses, hypothesis] },
      `createHypothesis ${id}`,
    ),
  );

  return hypothesis;
}

export function attachEvidence(hypothesisId: string, ref: LedgerEvidenceRef): Hypothesis {
  const ledger = loadLedger();
  const idx = ledger.hypotheses.findIndex((h) => h.id === hypothesisId);
  if (idx < 0) {
    throw new Error(`hypothesis not found: ${hypothesisId}`);
  }

  const parsedRef = LedgerEvidenceRefSchema.parse(ref);
  const now = new Date().toISOString();
  const current = ledger.hypotheses[idx]!;
  const updated = HypothesisSchema.parse({
    ...current,
    evidence_refs: [...current.evidence_refs, parsedRef],
    updated_at: now,
  });

  const hypotheses = ledger.hypotheses.map((h, i) => (i === idx ? updated : h));
  saveLedger(
    pushAudit(
      { ...ledger, hypotheses },
      `attachEvidence ${hypothesisId} ${parsedRef.type}:${parsedRef.ref}`,
    ),
  );

  return updated;
}

export type AdvanceLaneInput = {
  hypothesisId: string;
  toLane: Hypothesis['lane'];
  seal?: { proven: boolean; explainable: boolean; legally_executable: boolean };
  actor?: string;
};

function makeSealGateStep(args: {
  passed: boolean;
  seal: { proven: boolean; explainable: boolean; legally_executable: boolean };
  hypothesisId: string;
}): ValidationStep {
  return {
    rule_id: 'ledger.seal_gates',
    passed: args.passed,
    details: JSON.stringify(args.seal),
    evidence_source: `hypothesis:${args.hypothesisId}`,
    timestamp: new Date().toISOString(),
  };
}

export function advanceLane(input: AdvanceLaneInput): Hypothesis {
  const ledger = loadLedger();
  const idx = ledger.hypotheses.findIndex((h) => h.id === input.hypothesisId);
  if (idx < 0) {
    throw new Error(`hypothesis not found: ${input.hypothesisId}`);
  }
  const current = ledger.hypotheses[idx]!;
  const now = new Date().toISOString();

  if (input.toLane === 'sealed_executable') {
    const seal = input.seal ?? { proven: false, explainable: false, legally_executable: false };
    const passed = seal.proven && seal.explainable && seal.legally_executable;
    const step = makeSealGateStep({ passed, seal, hypothesisId: current.id });
    const withStep = HypothesisSchema.parse({
      ...current,
      provenance: {
        ...current.provenance,
        validation_steps: [...current.provenance.validation_steps, step],
      },
      updated_at: now,
    });
    if (!passed) {
      const hypotheses = ledger.hypotheses.map((h, i) => (i === idx ? withStep : h));
      saveLedger({
        ...ledger,
        hypotheses,
        audit_trail: [...ledger.audit_trail, `seal_rejected:${current.id}`],
      });
      throw new Error('seal gates failed: proven/explainable/legally_executable all required');
    }
    const sealed = HypothesisSchema.parse({
      ...withStep,
      lane: 'sealed_executable' as const,
      seal: { ...seal, sealed_at: now, sealed_by: input.actor ?? 'operator' },
    });
    const hypotheses = ledger.hypotheses.map((h, i) => (i === idx ? sealed : h));
    saveLedger({
      ...ledger,
      hypotheses,
      audit_trail: [...ledger.audit_trail, `sealed:${current.id}`],
    });
    return sealed;
  }

  const next = HypothesisSchema.parse({ ...current, lane: input.toLane, updated_at: now });
  const hypotheses = ledger.hypotheses.map((h, i) => (i === idx ? next : h));
  saveLedger({
    ...ledger,
    hypotheses,
    audit_trail: [...ledger.audit_trail, `lane:${current.id}:${input.toLane}`],
  });
  return next;
}

export type LedgerQueryMode = 'counsel' | 'private_commerce';

const COUNSEL_LANES: ReadonlySet<Hypothesis['lane']> = new Set([
  'working_premise',
  'study',
  'procedural_potential',
  'sealed_executable',
]);

export function queryHypotheses(opts: {
  mode: LedgerQueryMode;
  tags?: string[];
  caseId?: string;
  q?: string;
  includeParked?: boolean;
}): Hypothesis[] {
  const ledger = loadLedger();
  let results: Hypothesis[];
  if (opts.mode === 'counsel') {
    const counselLanes = new Set(COUNSEL_LANES);
    if (opts.includeParked) {
      counselLanes.add('parked');
    }
    results = ledger.hypotheses.filter((h) => counselLanes.has(h.lane));
  } else {
    results = ledger.hypotheses.filter((h) => h.lane === 'sealed_executable');
  }

  if (opts.caseId) {
    results = results.filter((h) => h.case_id === opts.caseId);
  }

  if (opts.tags && opts.tags.length > 0) {
    results = results.filter((h) => opts.tags!.some((t) => h.tags.includes(t)));
  }

  if (opts.q) {
    const needle = opts.q.toLowerCase();
    results = results.filter(
      (h) =>
        h.title.toLowerCase().includes(needle) ||
        h.claim.toLowerCase().includes(needle) ||
        h.tags.some((t) => t.toLowerCase().includes(needle)),
    );
  }

  return results;
}

export function exportLedgerMarkdown(opts?: { caseId?: string }): string {
  const ledger = loadLedger();
  const lines: string[] = ['# Hypothesis Ledger Export', ''];

  const cases = opts?.caseId
    ? ledger.cases.filter((c) => c.id === opts.caseId)
    : ledger.cases;

  for (const c of cases) {
    lines.push(`## Case: ${c.title}`, '');
    lines.push(`- **ID:** ${c.id}`);
    lines.push(`- **Goal:** ${c.goal}`);
    if (c.next_intentional_move) {
      lines.push(`- **Next move:** ${c.next_intentional_move}`);
    }
    lines.push('');
  }

  const hypotheses = opts?.caseId
    ? ledger.hypotheses.filter((h) => h.case_id === opts.caseId)
    : ledger.hypotheses;

  for (const h of hypotheses) {
    lines.push(`## Hypothesis: ${h.title}`, '');
    lines.push(`- **Lane:** ${h.lane}`);
    lines.push(`- **Disposition:** ${h.disposition}`);
    lines.push(`- **Claim:** ${h.claim}`);
    lines.push(`- **Confidence:** ${h.confidence}`, '');

    if (h.evidence_refs.length > 0) {
      lines.push('### Evidence', '');
      for (const ref of h.evidence_refs) {
        lines.push(`- ${ref.type}: ${ref.ref}`);
      }
      lines.push('');
    }

    if (h.seal) {
      lines.push('### Seal', '');
      lines.push(`- proven: ${h.seal.proven}`);
      lines.push(`- explainable: ${h.seal.explainable}`);
      lines.push(`- legally_executable: ${h.seal.legally_executable}`);
      if (h.seal.sealed_at) {
        lines.push(`- sealed_at: ${h.seal.sealed_at}`);
      }
      if (h.seal.sealed_by) {
        lines.push(`- sealed_by: ${h.seal.sealed_by}`);
      }
      lines.push('');
    }

    if (h.provenance.validation_steps.length > 0) {
      lines.push('### Validation Steps', '');
      for (const step of h.provenance.validation_steps) {
        lines.push(`- \`${step.rule_id}\` passed=${step.passed}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function mintGrowthStep(
  hypothesisId: string,
): { ok: false; reason: string } {
  const ledger = loadLedger();
  const hypothesis = ledger.hypotheses.find((h) => h.id === hypothesisId);
  if (!hypothesis) {
    return { ok: false, reason: 'hypothesis not found' };
  }
  if (hypothesis.lane !== 'sealed_executable' || !hypothesis.seal) {
    saveLedger(
      pushAudit(ledger, `mintGrowthStep rejected ${hypothesisId}: not sealed_executable`),
    );
    return { ok: false, reason: 'not sealed_executable' };
  }
  saveLedger(
    pushAudit(
      ledger,
      `mintGrowthStep rejected ${hypothesisId}: growth mint stub — not implemented`,
    ),
  );
  return { ok: false, reason: 'growth mint stub — not implemented' };
}
