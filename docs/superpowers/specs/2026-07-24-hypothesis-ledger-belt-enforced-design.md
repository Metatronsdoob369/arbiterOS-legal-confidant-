# Private Confidant — Hypothesis Ledger (Belt-Enforced)

Date: 2026-07-24  
Status: Approved (2026-07-24) — minor nits folded in  

Depends on: [Cockpit Contract](./2026-07-23-private-confidant-cockpit-contract-design.md), [Knowledge Architecture](./2026-07-23-private-confidant-knowledge-architecture-design.md), [Growth Stage Machine](./2026-07-23-growth-stage-machine-design.md)  
Product name: **Private Confidant (Pcon)** / Counselor

## Intent

A **pre-truth / strategy ledger**: room for claims *before* they become true.

Operator and Counselor use it to:

- Hold intentional path (e.g. DTC Trust + clearinghouse study) without sealing the whole jotting map  
- Attach situation-bound evidence under the **chastity belt**  
- Climb toward **proven + explainable + procedurally validated as legally executable**  
- Eventually mint **Growth** instructional steps only from sealed material  

**Pater familias:** help understand hard institutional systems *now*. Seal is for act-confidence and Growth mint — **not** a permission slip to research.

## Design laws

1. **Nothing is automatic truth** because it was written down. Truth is *achieved*.  
2. **Skip ≠ seal.** Upper-map items may be `working_premise` (path context) without becoming sealed.  
3. **Research-first.** Study targets need no seal.  
4. **Procedural potential** is the home-run intermediate category; nodes do not die for failing a gate.  
5. **Chastity belt co-evolves with the product.** Every new ledger/API envelope gets a Zod (or contract) schema **and** a validation-pipeline (or TS equivalent) check. API firehose must not bypass the belt.  
6. **Code ≠ situation-truth.** Enacted text is evidence; court opinion / applied posture in *this* situation is required for executable seal (with proof + explainability + procedure).  
7. **Drafting stays auditable.** Private commerce / drafts consume **sealed** ledger material (and belt-validated holdings), not raw corpus dumps.

## Architecture

```text
Hypothesis Ledger
  ├── Case / Strategy        (goal, focus, next intentional move)
  ├── Candidates             (claims under pressure)
  ├── Evidence compartments  (belt-validated refs only)
  └── Seal / mint receipts   (ValidationStep audit)

Evidence layers (on-demand, MCP-shaped — do not weigh the prompt)
  ├── Enacted text           (US Code / Congress API slots — later wire)
  ├── Opinions               (Google Drive corpus → indexed consult; existing caslaw path)
  ├── Institutional procedure (TFX spine, DTC public rules, etc.)
  └── Cold map               (burns / myth-as-settled)

Growth (deferred UI; mint stub only in v1)
  └── Receives only sealed_executable with provenance
```

Warm spine / cold map remain as in Knowledge Architecture. Ledger is the **third positive store**: candidates climbing toward seal.

## Stages (lane) vs disposition

Do not collapse these.

| Field | Values | Meaning |
| --- | --- | --- |
| **lane** | `working_premise` \| `study` \| `procedural_potential` \| `sealed_executable` \| `parked` \| `burned` | Where the claim sits on the climb |
| **disposition** | `open` \| `supported` \| `refuted` \| `archived` | How evidence pressure currently reads |

Rules:

- `working_premise` — operator path trust; unsealed; do not re-litigate every turn  
- `study` — active research (e.g. DTC + clearinghouse); Counselor helps; no seal required  
- `procedural_potential` — proven/explainable enough to chase executable procedure; home-run category  
- `sealed_executable` — all three gates passed; may mint Growth; may feed private-commerce / drafts  
- `parked` / `burned` — silence or cold-map; still auditable; not dead inventory  
- Disposition `refuted` does **not** delete the node; prefer `burned` + cold-map link when myth-as-settled

### Seal gates (all required for `sealed_executable`)

1. **Proven** — evidence refs hold under belt schemas  
2. **Explainable** — operator can walk the logic without mysticism  
3. **Procedurally validated as legally executable** — situation-bound procedure and/or applied opinion posture for *this* matter — not Code-alone  

Optional later: “two votes” weighting when executable — leave unspecified in v1.

## Core data model (belt schemas)

Canonical home: `schemas/hypothesisLedger.ts` (extends / reuses `ValidationStepSchema` from `schemas/legalSchemas.ts`).

```typescript
// Illustrative — implementation follows this shape

export const EvidenceRefSchema = z.object({
  type: z.enum([
    'holding',
    'statute',
    'opinion',
    'drive',
    'procedure',
    'spine',
    'cold_map',
    'other',
  ]),
  ref: z.string().min(1),
  weight: z.number().min(0).max(1).optional(),
  epistemic_ceiling: z
    .enum(['plain', 'settled', 'institutional', 'contested'])
    .optional(),
});

export const HypothesisSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3),
  claim: z.string().min(1),
  lane: z.enum([
    'working_premise',
    'study',
    'procedural_potential',
    'sealed_executable',
    'parked',
    'burned',
  ]),
  disposition: z.enum(['open', 'supported', 'refuted', 'archived']),
  confidence: z.number().min(0).max(1),
  evidence_refs: z.array(EvidenceRefSchema).default([]),
  tags: z.array(z.string()).default([]),
  case_id: z.string().optional(),
  provenance: z.object({
    source: z.string(),
    timestamp: z.string().datetime(),
    validation_steps: z.array(ValidationStepSchema),
  }),
  seal: z
    .object({
      proven: z.boolean(),
      explainable: z.boolean(),
      legally_executable: z.boolean(),
      sealed_at: z.string().datetime().optional(),
      sealed_by: z.string().optional(),
    })
    .optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CaseStrategySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3),
  goal: z.string().min(1),
  focus_hypothesis_ids: z.array(z.string().uuid()).default([]),
  working_premise_ids: z.array(z.string().uuid()).default([]),
  next_intentional_move: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const LedgerEnvelopeSchema = z.object({
  schema_version: z.literal('0.1.0'),
  belt_version: z.string().min(1),
  cases: z.array(CaseStrategySchema).default([]),
  hypotheses: z.array(HypothesisSchema),
  audit_trail: z.array(z.string()).default([]),
});
```

**Belt rule:** if it ain’t parseable by these schemas (and linked evidence schemas), it ain’t real for counsel/draft consumption.

## Tools (belt-gated)

| Tool | Behavior |
| --- | --- |
| `ledger_upsert_case` | Create/update strategy; Zod parse before write |
| `ledger_create_hypothesis` | Zod parse; default lane `study` or `working_premise` by flag; emit ValidationStep |
| `ledger_attach_evidence` | Requires schema-valid evidence ref (holding / statute / opinion / procedure / spine / cold_map) |
| `ledger_advance_lane` | Enforces transitions; `sealed_executable` only if all three seal gates true + receipts |
| `ledger_query` | By default: study + procedural_potential + sealed (and optional premises). **Draft / private-commerce consumers** may only pull `sealed_executable` |
| `ledger_export` | Markdown (+ optional .docx later) with full provenance — v1 markdown sufficient |
| `consult_cold_map` | Existing; burns link into `burned` / evidence_refs |

No unvalidated “AI insight” writes. Model proposes; belt validates; human seal for executable.

### Store write path — `belt_version`

- Canonical current belt version is a single constant (e.g. `LEDGER_BELT_VERSION = '0.1.0'` matching `schema_version` initially, or an independent string if schemas evolve separately).  
- **Reject** envelope writes whose `belt_version` is older / unknown than the store’s current constant.  
- Bumps to schemas that change validation semantics require a belt_version bump and a migration note (v1: no silent coerce).

### `ledger_advance_lane` — gate vote receipt

Every successful (or rejected) advance toward / into `sealed_executable` must append a `ValidationStep` that records the three gate votes, e.g.:

- `rule_id`: `ledger.seal_gates`  
- `passed`: all three true  
- `details`: structured summary of `proven` / `explainable` / `legally_executable` votes  
- `evidence_source`: hypothesis id + evidence_ref ids considered  

## Validation pipeline integration

Every new envelope / tool result type must:

1. Pass its Zod (or Python contract) schema  
2. Appear as a **required check** in:
   - ArbiterOS: Vitest schema/fixture tests for ledger envelopes via **`npm run test:ledger`** (peer entrypoint to book-pipeline `python3 tools/validate_pipeline.py`)  
   - book-pipeline: extend `tools/validate_pipeline.py` only when producer-side contracts are involved; otherwise document `test:ledger` as the TS peer  
3. Emit durable **ValidationStep** receipts into `provenance.validation_steps` / audit trail  

CI posture: local default + strict mode where MCP/firehose surfaces exist (`--require-mcp` pattern for Python; `test:ledger` in CI for ArbiterOS).

## Seed case (v1 operate path)

**Case goal:** Restructure businesses / trusts; understand DTC + clearinghouse; locate what is knowable about holders/funding — **study first**.

| Item | Lane |
| --- | --- |
| State-as-corp, Vital Stats, Treasury-as-trust (jotting upper map) | `working_premise` (unsealed) |
| **Explicit test fixture premise:** e.g. title `Upper map: Treasury as trust company (working premise)` — claim states path context only, not sealed | `working_premise` — **required in seed + unit tests** so lane distinction is exercised |
| DTC Trust + Clearing House | `study` (live focus) |
| Downstream SSN/trust/distribution claims | Later; only after DTC findings earn gates |

Operate **without** a full progress UI: chat + ledger records + strategy `next_intentional_move`. Progress visual = deferred killer veneer.

## Evidence layers (MCP-shaped)

| Source | Storage / access | Role |
| --- | --- | --- |
| Congress.gov API | Tool slot + key | Legislative process text |
| US Code (OLRC) | Tool slot / browse | Enacted Code text |
| Opinions / caselaw | **Google Drive** corpus → indexed consult (existing caslaw/Drive bootstrap) | Situation-bound opinion layer |
| TFX / Pacioli / LII pointers | Warm spine | Procedure / orientation |
| Cold map | Existing | Negative cartography |

Hits attach as `evidence_refs` only after belt parse. Never auto-seal.

## Private commerce nest

- Entries tagged `private-commerce` (and/or case-linked) that reach `sealed_executable` are the **only** ledger material drafting / sensitive commerce query may consume.  
- Drafting UI does **not** get raw corpus access for those flows — sealed ledger (+ belt-validated holding refs) only.  
- **Private commerce query** remains the major product gap *after* ledger scaffold: situation-bound holdings into counsel/drafts, still under the belt.

## Growth mint (stub)

- Interface only in v1: `mint_growth_step(hypothesis_id)` rejects unless `lane === sealed_executable` and seal gates + receipts present.  
- No auto-publish. No fake climb content.

## Non-goals (v1)

- Full real-time progress / case-map UI  
- Rich biographical metadata graph UI (optional outward facets later)  
- Live world mutation / “pull distributions” automation  
- Unvalidated AI writes  
- External SaaS drafting  
- Treating working premises as sealed because they are “obvious”  
- Replacing chastity belt with raw API dumps  
- Re-ingesting opinion corpus locally instead of Drive-first

## Success (spec / scaffold)

- Spec approved and cross-linked from cockpit + knowledge architecture  
- Schemas + ValidationStep reuse committed  
- Counselor can upsert case, create study hypothesis, attach belted evidence, query without sealing  
- Seal path refuses Code-alone / premise-alone  
- Vitest (and pipeline peer) fails if envelope schemas drift  
- Growth stays empty until a real seal exists  

## Implementation note

This document is **design only**. Next step after approval: `writing-plans` → implementation plan (schemas, store, tools, tests, seed DTC case). No progress UI in that first plan unless explicitly added later.
