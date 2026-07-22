# Case Map Primer Packages + Documentation Spine

**Date:** 2026-07-21  
**Status:** Draft for review  
**Product:** ArbiterOS Legal Confidant  
**Related:** Register Mirror (Private Confidant), silence-first authority lanes, Unconfused Man research ingest

---

## 1. Problem

Case Map and Evidence currently compete as peer nav areas with overlapping “build the case” demos and little product distinction. Documentation is not one surface — it is three spines (ingest, curate, produce) that float off Counsel without owning procedure.

Research notebooks (especially *The Unconfused Man and his Person*) already encode the missing unit: **named form/procedure packages** with destinations, accompanying docs, and exact verbiage — not a second whiteboard.

## 2. Decision

**Packet-first Case Map.** A Case Map goal is a **named package** (primer course), not a freeform kanban twin of Evidence.

| Surface | Owns |
|---------|------|
| **Documentation** | Ingest (notebooks + public forms), curate (Library + form catalog), produce (gated fill/export) |
| **Case Map** | Procedural goals = packages; steps, speed bumps, flags |
| **Register** | Exact “lines” that make forms/filings sing |
| **Evidence** | Authority cites behind a step (optional graph) — demoted as peer of Case Map |
| **Gate** | Epistemic bands; does not coach `perilous` as recommended action |

Evidence remains useful as an authority graph for cites; it is **not** a full peer app area for v1 clothes.

## 3. Package schema (v1)

Each package is a JSON (Zod) contract, seedable from research tables like *Relevant Forms and Package Requisites*.

```ts
type EpistemicBand = 'settled' | 'institutional' | 'contested' | 'perilous';

type PackageStep = {
  id: string;
  title: string;
  order: number;
  forms: Array<{ form_id: string; title: string; official_url?: string; sensitivity?: 'common' | 'sparse' | 'sensitive' }>;
  lines: Array<{ line_id: string; text: string; register_ref?: string }>; // Register hooks
  evidence_hooks?: Array<{ kind: string; ref: string }>;
  speed_bumps: string[];
  flags: string[];
  epistemic: EpistemicBand;
  delivery?: { method?: string; destination?: string };
};

type PrimerPackage = {
  package_id: string;
  title: string;
  outcome: string;           // one sentence: what “done” means
  course_kind: 'primer' | 'advanced';
  steps: PackageStep[];
  source_notebooks?: string[];
  vector_ready: boolean;     // false until v2 chunking
};
```

**Gate rule:** Private may inventory and explain `contested` steps with silence-first caveats. Steps tagged `perilous` surface as **flags** (e.g. IRM frivolous / fictitious instrument screens), not as recommended playbooks.

## 4. Primer set (value-add starter)

v1 ships these named packs as transition-procedure courses:

| # | `package_id` | Title | Outcome (sketch) |
|---|--------------|-------|------------------|
| 1 | `transition_essentials` | Transition Essentials | Records/status hygiene: what you hold, agent signature duality, FOIA/ledger habit |
| 2 | `securities_control` | Securities Control | Control of commercial paper you already touch: notes, indorsement vocabulary, HIDC basics, UCC-1/3 awareness |
| 3 | `proper_debt_discharge` | Proper Debt Discharge | Legitimate discharge paths (payoff, settlement, dispute, statutory redemption/bankruptcy where applicable); contested commercial-redemption theories tagged, not coached |
| 4 | `contract_navigation` | Contract Navigation | Read, classify, and walk a contract: parties, obligations, default, notice, remedy — with register lines and form hooks where filings attach |
| 5 | `property_tax_procedure` | Property Tax Procedure | Assessment protest, pay-under-protest/refund, redemption petitions (e.g. Alabama Code 40 paths) as procedural map |
| 6 | `irs_form_intimacy` | IRS Form Intimacy (8xxx focus) | Catalog + sensitivity bands for sparse/sensitive form ranges; official PDF access |

**v1 ship target:** packs **1–4** (Essentials, Securities, Debt Discharge, **Contract Navigation**).  
**Next primers:** 5–6 once schema + Case Map UI consume packs.

Adding a new pack after this lands = new seed JSON + optional Register lines + optional Library sources — not a new app area.

## 5. Documentation spine (all three)

| Spine | v1 behavior |
|-------|-------------|
| **Ingest** | Upload/notebook import into Library/artifacts; public IRS/state form PDFs via official URLs |
| **Curate** | Form catalog + package index; Library as soft working set |
| **Produce** | Existing gated form→docx path; extend toward package artifact export later |

Contract Navigation especially bridges **produce** (what you sign/file) and **Case Map** (how you walk the agreement).

## 6. Extensibility and the recursive loop

**Yes — once the schema is in, adding packs gets cheaper.**  
New value = content (steps, forms, lines, bands), not architecture.

**Recursive loop (v1.5 → v2):**

```
research / notebook / FOIA
        ↓
  package + register seed
        ↓
  Case Map run (user completes steps)
        ↓
  audit / outcomes / failed gates
        ↓
  retag epistemic bands + speed bumps
        ↓
  (v2) chunk → vectors → heat map
        ↓
  Private navigates denser terrain
```

Each loop improves Private’s map of “what’s hot, thin, contested, perilous” without inventing a second Case Map. Vectors are **heat over the same package graph**, not a parallel ontology.

## 7. v2 Private heat map (out of scope for code now)

- Embed package / step / form / line chunks  
- Heat = density × trust tier × epistemic band  
- Advanced Private answers: which pack step am I on; what nearby knowledge is sparse or flagged  

## 8. Nav / clothes implications (later implementation)

- Demote or fold Evidence as peer of Case Map  
- Case Map UI = package picker + step checklist (not generic kanban)  
- Register Mirror supplies lines referenced by steps  
- Do not rename “documentation” into a seventh nav until the three spines have a single entry

## 9. Non-goals (v1)

- Full practice-management matter OS  
- Coaching perilous instruments as recommended procedure  
- Shipping vector index / heat map UI  
- Replacing Counsel; packs hang off Case Map + Documentation

## 10. Open follow-ups

- Exact seed content for packs 1–4 (sourced from notebooks + `.gov` forms)  
- Zod schemas colocated with `legalSchemas` / register contracts  
- Import path from `open-notebook-domicile` exports without inheriting LLM stigma voice  

## 11. Approval

Approved direction (2026-07-21 conversation): packet-first Case Map; primer packages as transition courses; **Contract Navigation** added; recursive ingest→retag→vector loop as the compounding path for v2 Private.
