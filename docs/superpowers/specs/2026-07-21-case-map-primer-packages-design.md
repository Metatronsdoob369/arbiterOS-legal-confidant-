# Case Map Primer Packages + Documentation Spine

**Date:** 2026-07-21  
**Status:** Implemented (v1 schema + Case Map UI)  
**Product:** ArbiterOS Legal Confidant  
**Related:** Register Mirror (Private Confidant), silence-first authority lanes, Unconfused Man research ingest

---

## 1. Problem

Case Map and Evidence currently compete as peer nav areas with overlapping “build the case” demos and little product distinction. Documentation is not one surface — it is three spines (ingest, curate, produce) that float off Counsel without owning procedure.

**Core failure mode:** documentation *floats* without dictating proper procedure. Unthinking use of forms/notes without a packet leaves the user with artifacts and no walk.

Research notebooks (especially *The Unconfused Man and his Person*) already encode the missing unit: **named form/procedure packages** with destinations, accompanying docs, and exact verbiage — not a second whiteboard. Persona-generated notes in those notebooks are flowerly and often stigma-colored; we keep the **mechanics** (forms, lines, packages, IRM traps), discard the sermon.

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

**Gate rule (silence-first shield):** Private may inventory and explain `contested` steps with silence-first caveats. Steps tagged `perilous` surface as **flags** — especially IRM **frivolous return** and **fictitious instrument** screens — not as recommended playbooks. Informed, not ensnared: the user sees the trap map without being coached into automated retaliation paths.

## 4. Primer set (value-add starter)

v1 ships these named packs as transition-procedure courses.

### 4.1 Pack mechanics (from persona cross-ref; rhetoric stripped)

| # | `package_id` | Title | Outcome + mechanics |
|---|--------------|-------|---------------------|
| 1 | `transition_essentials` | Transition Essentials | **Duality of status / records hygiene.** Enforce agent/representative signature practice (UCC 3-402: signature shows unambiguously it is made on behalf of the represented person). FOIA/ledger habit to track the commercial entity’s paper trail. Outcome: user can sign and file without collapsing principal into debtor by accident. |
| 2 | `securities_control` | Securities Control | **Instruction-manual literacy for paper you already touch.** Indorsement vocabulary, Holder in Due Course (HIDC) basics, UCC-1/3 awareness, qualified indorsement concepts as *settled UCC mechanics* — with any “discharge the Fed via endorsement” leap tagged `contested`/`perilous`. Outcome: user can identify and control instruments, not invent value. |
| 3 | `proper_debt_discharge` | Proper Debt Discharge | **Legitimate paths first.** Payoff, settlement, dispute, statutory redemption/bankruptcy where applicable. Contested commercial-redemption theories inventoried and tagged, never coached as settled fact. Outcome: user knows which door is open without walking into IRM traps blind. |
| 4 | `contract_navigation` | Contract Navigation | **Walk adhesion and negotiated contracts.** Classify parties, obligations, default triggers, notice, remedy; hook register lines and filing forms where the agreement requires them. Bridges produce (what you sign/file) and Case Map (how you walk the agreement). |
| 5 | `property_tax_procedure` | Property Tax Procedure | Assessment protest, pay-under-protest/refund, redemption petitions (e.g. Alabama Code 40 paths) as procedural map + form packages. |
| 6 | `irs_form_intimacy` | IRS Form Intimacy (8xxx focus) | Catalog + sensitivity bands for sparse/sensitive ranges. **Named hook: Form 8822-B** (Change of Address or Responsible Party — Business) — official purpose and fill paths as `institutional`; contested “jurisdictional relocation / Treasury as responsible party” fills tagged `contested`/`perilous`, never default. |

**v1 ship target:** packs **1–4** (implemented).  
**Next primers:** packs **5–6** (`property_tax_procedure`, `irs_form_intimacy`) — **implemented** as seed JSON on the same loader/Case Map path.

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

## 10. Persona cross-ref — keep vs discard

| Keep (gold) | Discard (flower / stigma) |
|-------------|---------------------------|
| Floating docs without procedure is the failure mode | “Commercial matrix / unthinking masses” sermon |
| Packet ↔ Register lines as the walk | Liberation mythology as product voice |
| UCC 3-402 / agent signature as Transition Essential | “Insulate the sovereign man” as UI copy |
| Indorsement / HIDC / UCC-1/3 as Securities literacy | “Dismantle perpetual debt” as default claim |
| Legitimate discharge + tag contested | Coaching redemption theories as settled |
| Adhesion contract walk for Contract Navigation | Adversary cosplay in user-facing text |
| IRM frivolous/fictitious as perilous flags | Framing the product as warfare |
| 8822-B as named IRS intimacy hook | Defaulting contested responsible-party fills |

Product voice stays Private Confidant: clarity, patience, silence-first — not the notebook persona.

## 11. Open follow-ups

- Exact seed content for packs 1–4 (sourced from notebooks + `.gov` forms; strip persona voice on ingest)  
- Zod schemas colocated with `legalSchemas` / register contracts  
- Import path from `open-notebook-domicile` exports without inheriting LLM stigma voice  
- Seed Form 8822-B official instructions + contested-fill flag table under pack 6  

## 12. Approval

Approved direction (2026-07-21 conversation): packet-first Case Map; primer packages as transition courses; **Contract Navigation** added; recursive ingest→retag→vector loop as the compounding path for v2 Private. Persona cross-ref folded in as mechanics-only refinements (this revision).
