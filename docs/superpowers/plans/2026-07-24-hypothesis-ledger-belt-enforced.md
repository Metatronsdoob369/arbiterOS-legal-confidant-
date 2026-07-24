# Hypothesis Ledger (Belt-Enforced) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a belt-enforced Hypothesis Ledger (schemas → file store → API/tools → seed DTC case → `npm run test:ledger`) so Counselor can study pre-truth candidates without audit drift, and sealed material is the only path into private-commerce/draft consumers later.

**Architecture:** Zod schemas in `schemas/hypothesisLedger.ts` reuse `ValidationStepSchema`. A small file-backed store under `backend/core/legal/pcon/knowledge/ledger/` rejects stale `belt_version`, appends ValidationStep receipts on lane advances, and exposes Fastify routes + Private Confidant tools mirroring `consult_cold_map`. No progress UI; no Growth mint body beyond a reject stub.

**Tech Stack:** TypeScript (strict), Zod, Vitest, Fastify, existing Pcon routes/`aiProvider` tool wiring, `node:fs` JSON store (v1)

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-24-hypothesis-ledger-belt-enforced-design.md` — follow verbatim (incl. approved nits: belt_version reject, seal-gate ValidationStep, explicit working_premise in seed/tests, `npm run test:ledger`).
- Chastity belt: if it ain’t in schema, it ain’t real. No raw API dumps into counsel/draft paths.
- Research-first: study lane needs no seal. Skip ≠ seal for working premises.
- Seal requires proven + explainable + legally_executable; Code-alone cannot seal.
- TypeScript strict; no `any` in new files.
- TDD: failing test first for pure store/schema logic.
- Do not build progress UI, Congress/US Code firehose wiring, or private-commerce query module in this plan.
- Do not commit unless the operator explicitly asks (plan steps may stage files; commit only on request).

## File Structure

| Path | Responsibility |
|------|----------------|
| `schemas/hypothesisLedger.ts` | Zod models + `LEDGER_BELT_VERSION` + parse helpers |
| `schemas/hypothesisLedger.test.ts` | Schema / belt_version parse tests |
| `backend/core/legal/pcon/hypothesisLedger.ts` | Load/save envelope, CRUD, advance_lane, query, mint stub |
| `backend/core/legal/pcon/hypothesisLedger.test.ts` | Store + gate + seed tests |
| `backend/core/legal/pcon/knowledge/ledger/seed.v1.json` | Seed case + working_premise + DTC study |
| `backend/modules/pcon/routes.ts` | HTTP: health, upsert case, create hypothesis, attach evidence, advance, query, export |
| `services/pconLedgerClient.ts` | Thin client for tool/backend calls (optional if tools call core directly) |
| `services/aiProvider.ts` | Register ledger tools in Private Confidant workspace |
| `services/pconCockpit.ts` | Mention ledger in instruction (study vs seal) |
| `package.json` | `test:ledger` script |
| `docs/superpowers/specs/2026-07-24-hypothesis-ledger-belt-enforced-design.md` | Already approved; touch only if implementation discovers a contradiction |

---

### Task 1: Zod schemas + belt version constant

**Files:**
- Create: `schemas/hypothesisLedger.ts`
- Create: `schemas/hypothesisLedger.test.ts`
- Modify: `schemas/legalSchemas.ts` — only if exporting a shared re-export is needed; prefer importing `ValidationStepSchema` from legalSchemas into hypothesisLedger (no circular import)

**Interfaces:**
- Produces:
  - `export const LEDGER_BELT_VERSION = '0.1.0' as const`
  - `export const EvidenceRefSchema`, `HypothesisSchema`, `CaseStrategySchema`, `LedgerEnvelopeSchema`
  - `export type Hypothesis`, `CaseStrategy`, `LedgerEnvelope`, `EvidenceRef`
  - `export function assertCurrentBeltVersion(envelope: { belt_version: string }): void` — throws if ≠ `LEDGER_BELT_VERSION`

- [ ] **Step 1: Write the failing test**

Create `schemas/hypothesisLedger.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run schemas/hypothesisLedger.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Write minimal implementation**

Create `schemas/hypothesisLedger.ts` implementing the schemas from the spec (EvidenceRef, Hypothesis with lane/disposition/seal, CaseStrategy, LedgerEnvelope), `LEDGER_BELT_VERSION`, and:

```ts
export function assertCurrentBeltVersion(envelope: { belt_version: string }): void {
  if (envelope.belt_version !== LEDGER_BELT_VERSION) {
    throw new Error(
      `Rejected ledger envelope: belt_version ${envelope.belt_version} != ${LEDGER_BELT_VERSION}`,
    );
  }
}
```

Import `ValidationStepSchema` from `./legalSchemas`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run schemas/hypothesisLedger.test.ts`  
Expected: PASS

- [ ] **Step 5: Stage for commit (do not commit unless asked)**

```bash
git add schemas/hypothesisLedger.ts schemas/hypothesisLedger.test.ts
```

---

### Task 2: File store — load/save + belt reject + CRUD

**Files:**
- Create: `backend/core/legal/pcon/hypothesisLedger.ts`
- Create: `backend/core/legal/pcon/hypothesisLedger.test.ts`
- Create: `backend/core/legal/pcon/knowledge/ledger/.gitkeep` (seed added in Task 5)

**Interfaces:**
- Consumes: schemas from Task 1
- Produces:
  - `export function getLedgerPath(): string` — `PCON_LEDGER_PATH` or default `backend/core/legal/pcon/knowledge/ledger/ledger.v1.json`
  - `export function loadLedger(forceReload?: boolean): LedgerEnvelope`
  - `export function saveLedger(envelope: LedgerEnvelope): LedgerEnvelope` — parse + `assertCurrentBeltVersion` then write
  - `export function upsertCase(input: Omit<CaseStrategy, 'created_at' | 'updated_at'> & { id?: string }): CaseStrategy`
  - `export function createHypothesis(input: ...): Hypothesis`
  - `export function attachEvidence(hypothesisId: string, ref: EvidenceRef): Hypothesis`

- [ ] **Step 1: Write the failing test**

In `hypothesisLedger.test.ts`:

```ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LEDGER_BELT_VERSION } from '../../../../schemas/hypothesisLedger';
import {
  attachEvidence,
  createHypothesis,
  loadLedger,
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run backend/core/legal/pcon/hypothesisLedger.test.ts`  
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Implement `hypothesisLedger.ts`:

- Resolve path from `process.env.PCON_LEDGER_PATH` or config key if you add `PCON_LEDGER_PATH` to `backend/config` (prefer env in v1 to match cold-map simplicity; add config only if cold-map already uses getConfig — then mirror `PCON_COLD_MAP_DIR` pattern).
- Empty missing file → empty envelope with current `LEDGER_BELT_VERSION`.
- `saveLedger`: `LedgerEnvelopeSchema.parse` → `assertCurrentBeltVersion` → write JSON pretty.
- Mutators load → change → push audit string → save.
- Use `crypto.randomUUID()` for new ids when omitted.
- Timestamps: `new Date().toISOString()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run backend/core/legal/pcon/hypothesisLedger.test.ts`  
Expected: PASS

- [ ] **Step 5: Stage for commit (do not commit unless asked)**

```bash
git add backend/core/legal/pcon/hypothesisLedger.ts backend/core/legal/pcon/hypothesisLedger.test.ts
```

---

### Task 3: `advanceLane` with three-gate ValidationStep

**Files:**
- Modify: `backend/core/legal/pcon/hypothesisLedger.ts`
- Modify: `backend/core/legal/pcon/hypothesisLedger.test.ts`

**Interfaces:**
- Produces:
  - `export type AdvanceLaneInput = { hypothesisId: string; toLane: Hypothesis['lane']; seal?: { proven: boolean; explainable: boolean; legally_executable: boolean }; actor?: string }`
  - `export function advanceLane(input: AdvanceLaneInput): Hypothesis`
  - `export function mintGrowthStep(hypothesisId: string): never | { rejected: true; reason: string }` — stub always rejects unless sealed (and still returns reject payload for “not implemented mint body”)

- [ ] **Step 1: Write the failing test**

```ts
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
    after.provenance.validation_steps.some((s) => s.rule_id === 'ledger.seal_gates' && s.passed === false),
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
    sealed.provenance.validation_steps.some((s) => s.rule_id === 'ledger.seal_gates' && s.passed === true),
  ).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run backend/core/legal/pcon/hypothesisLedger.test.ts`  
Expected: FAIL (`advanceLane` missing)

- [ ] **Step 3: Write minimal implementation**

```ts
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
  if (idx < 0) throw new Error('hypothesis not found');
  const current = ledger.hypotheses[idx]!;
  const now = new Date().toISOString();

  if (input.toLane === 'sealed_executable') {
    const seal = input.seal ?? { proven: false, explainable: false, legally_executable: false };
    const passed = seal.proven && seal.explainable && seal.legally_executable;
    const step = makeSealGateStep({ passed, seal, hypothesisId: current.id });
    const withStep = {
      ...current,
      provenance: {
        ...current.provenance,
        validation_steps: [...current.provenance.validation_steps, step],
      },
      updated_at: now,
    };
    if (!passed) {
      ledger.hypotheses[idx] = withStep;
      ledger.audit_trail = [...ledger.audit_trail, `seal_rejected:${current.id}`];
      saveLedger(ledger);
      throw new Error('seal gates failed: proven/explainable/legally_executable all required');
    }
    const sealed = {
      ...withStep,
      lane: 'sealed_executable' as const,
      seal: { ...seal, sealed_at: now, sealed_by: input.actor ?? 'operator' },
    };
    ledger.hypotheses[idx] = sealed;
    ledger.audit_trail = [...ledger.audit_trail, `sealed:${current.id}`];
    saveLedger(ledger);
    return sealed;
  }

  // non-seal transitions: allow study/procedural_potential/parked/burned/working_premise without three gates
  const next = { ...current, lane: input.toLane, updated_at: now };
  ledger.hypotheses[idx] = next;
  ledger.audit_trail = [...ledger.audit_trail, `lane:${current.id}:${input.toLane}`];
  saveLedger(ledger);
  return next;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run backend/core/legal/pcon/hypothesisLedger.test.ts`  
Expected: PASS

- [ ] **Step 5: Stage for commit (do not commit unless asked)**

```bash
git add backend/core/legal/pcon/hypothesisLedger.ts backend/core/legal/pcon/hypothesisLedger.test.ts
```

---

### Task 4: Query + export + mint stub

**Files:**
- Modify: `backend/core/legal/pcon/hypothesisLedger.ts`
- Modify: `backend/core/legal/pcon/hypothesisLedger.test.ts`

**Interfaces:**
- Produces:
  - `export type LedgerQueryMode = 'counsel' | 'private_commerce'`
  - `export function queryHypotheses(opts: { mode: LedgerQueryMode; tags?: string[]; caseId?: string; q?: string }): Hypothesis[]`
  - `export function exportLedgerMarkdown(opts?: { caseId?: string }): string`
  - `export function mintGrowthStep(hypothesisId: string): { ok: false; reason: string }`

- [ ] **Step 1: Write the failing test**

```ts
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
  expect(mintGrowthStep(h.id).ok).toBe(false);
});
```

- [ ] **Step 2: Run to verify fail → implement → pass**

Counsel lanes: `working_premise`, `study`, `procedural_potential`, `sealed_executable` (exclude burned by default; include parked only if `opts.includeParked`).  
Private commerce: `lane === 'sealed_executable'` only (tags filter optional).  
Export: markdown sections for case + hypotheses + evidence + seal + validation_steps.  
Mint: if not sealed → `{ ok: false, reason: 'not sealed_executable' }`; if sealed → `{ ok: false, reason: 'growth mint stub — not implemented' }` (v1 stub).

- [ ] **Step 3: Stage for commit (do not commit unless asked)**

---

### Task 5: Seed DTC case with explicit working_premise

**Files:**
- Create: `backend/core/legal/pcon/knowledge/ledger/seed.v1.json`
- Modify: `backend/core/legal/pcon/hypothesisLedger.ts` — `export function ensureSeedLedger(): LedgerEnvelope` loads seed if ledger missing
- Modify: `backend/core/legal/pcon/hypothesisLedger.test.ts`

**Interfaces:**
- Produces: `ensureSeedLedger()` copies/parses seed into ledger path when file absent

- [ ] **Step 1: Write failing test**

```ts
it('seed includes one working_premise and one DTC study hypothesis', () => {
  // point PCON_LEDGER_PATH at empty dir file that does not exist
  const ledger = ensureSeedLedger();
  expect(ledger.hypotheses.some((h) => h.lane === 'working_premise')).toBe(true);
  expect(
    ledger.hypotheses.some(
      (h) => h.lane === 'study' && /dtc/i.test(h.title + h.claim + h.tags.join(',')),
    ),
  ).toBe(true);
  expect(ledger.cases.length).toBeGreaterThanOrEqual(1);
});
```

- [ ] **Step 2: Author `seed.v1.json`**

Include:

1. Case: goal about restructure/trusts/DTC understanding  
2. Hypothesis working_premise: title `Upper map: Treasury as trust company (working premise)` — claim explicitly “path context only; unsealed”  
3. Hypothesis study: DTC Trust + clearinghouse  

All UUIDs fixed for stable tests; `belt_version` / `schema_version` = `0.1.0`.

- [ ] **Step 3: Implement `ensureSeedLedger` → tests pass**

- [ ] **Step 4: Stage for commit (do not commit unless asked)**

---

### Task 6: HTTP routes

**Files:**
- Modify: `backend/modules/pcon/routes.ts`
- Create: `backend/modules/pcon/ledger.routes.test.ts` (or extend existing pattern — if no Fastify test harness, keep logic coverage in unit tests and add a thin route smoke with inject if app supports it)

**Interfaces:**
- `GET /api/pcon/ledger/health` → `{ ok, belt_version, hypothesis_count }`
- `POST /api/pcon/ledger/cases` — upsert case (session required)
- `POST /api/pcon/ledger/hypotheses` — create
- `POST /api/pcon/ledger/hypotheses/:id/evidence` — attach
- `POST /api/pcon/ledger/hypotheses/:id/advance` — advanceLane
- `POST /api/pcon/ledger/query` — body `{ mode, tags?, caseId?, q? }`
- `GET /api/pcon/ledger/export` — markdown text

All mutating routes: Zod parse body; 400 on failure; call core store.

- [ ] **Step 1: Add request schemas** (in `hypothesisLedger.ts` or legalSchemas) for each body  
- [ ] **Step 2: Register routes beside cold-map**  
- [ ] **Step 3: Manual or inject smoke** — health returns `LEDGER_BELT_VERSION`  
- [ ] **Step 4: Stage for commit (do not commit unless asked)**

---

### Task 7: Wire Private Confidant tools + cockpit line

**Files:**
- Modify: `services/aiProvider.ts` — tool defs + handlers for:
  - `ledger_upsert_case`
  - `ledger_create_hypothesis`
  - `ledger_attach_evidence`
  - `ledger_advance_lane`
  - `ledger_query`
  - `ledger_export`
- Modify: `services/pconCockpit.ts` — instruction: research-first; seal gates; working premises unsealed; private-commerce consumers sealed-only
- Create: `services/pconLedgerClient.ts` if tools should call HTTP; else import core functions from backend path carefully (prefer HTTP client like `pconColdMapClient` if that pattern exists)

Check `services/pconColdMapClient.ts` and mirror it.

- [ ] **Step 1: Mirror cold-map client pattern for ledger**  
- [ ] **Step 2: Register tools only in Private Confidant workspace**  
- [ ] **Step 3: Unit-smoke: tool name list includes ledger_***  
- [ ] **Step 4: Stage for commit (do not commit unless asked)**

---

### Task 8: `npm run test:ledger` peer to validate_pipeline

**Files:**
- Modify: `package.json` — add `"test:ledger": "vitest run schemas/hypothesisLedger.test.ts backend/core/legal/pcon/hypothesisLedger.test.ts"`
- Modify: `docs/superpowers/specs/2026-07-24-hypothesis-ledger-belt-enforced-design.md` — confirm peer entrypoint line (already present after nits)
- Optional: one-line note in `README.md` under testing — only if README already documents validate patterns

- [ ] **Step 1: Add script**  
- [ ] **Step 2: Run `npm run test:ledger`**  
Expected: PASS  
- [ ] **Step 3: Run full `npm run test:unit`** to ensure no regressions  
- [ ] **Step 4: Stage for commit (do not commit unless asked)**

---

### Task 9: Spine pointer + knowledge self-check

**Files:**
- Modify: `backend/core/legal/pcon/knowledge/spine/manifest.v1.json` — add entry for ledger seed / store
- Modify: knowledge architecture only if needed (already linked)

- [ ] **Step 1: Add manifest entry** `hypothesis-ledger-seed` → seed path, trust owned, epistemic_ceiling contested for premises / institutional for study scaffolding  
- [ ] **Step 2: Final `npm run test:ledger`**  
- [ ] **Step 3: Stop — ask operator to commit

---

## Spec coverage checklist

| Spec requirement | Task |
| --- | --- |
| Schemas + ValidationStep reuse | 1 |
| belt_version reject on write | 2 |
| CRUD / attach evidence | 2 |
| Seal gates + ValidationStep on advance | 3 |
| Query counsel vs private_commerce | 4 |
| Export markdown | 4 |
| Growth mint stub | 4 |
| Seed DTC + explicit working_premise | 5 |
| HTTP API | 6 |
| Counselor tools + instruction | 7 |
| `npm run test:ledger` | 8 |
| Spine pointer | 9 |
| No progress UI / no firehose wire / no private-commerce module | Out of scope (enforced by non-goals) |

## Self-review notes

- No TBD placeholders in tasks.  
- `advanceLane` always records seal ValidationStep on sealed attempts (pass or fail).  
- Commit steps are staged only — operator must request commits.  
- Private commerce **query module** remains a later plan; this plan only enforces sealed-only query mode for that future consumer.
