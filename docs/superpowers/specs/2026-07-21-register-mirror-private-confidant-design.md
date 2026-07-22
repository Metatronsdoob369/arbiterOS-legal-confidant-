# Register Mirror — Private Confidant Design

Date: 2026-07-21  
Status: Implemented (v1)  
Scope: Private, non-production specialty

## Intent

ArbiterOS already retrieves statute and holdings. The private confidant specialty adds a **bilingual register layer**: treat plain English and institutional / statutory legalese as different languages, and **mirror the user’s usage** before distinguishing senses.

Posture: patience and clarity — not a boss, not advocacy theater.

## Architecture

```text
book-pipeline (producer)
  integrations/schema/register_lexicon.schema.json
  library/new/lexicon/private-confidant.v1.json
        │
        ▼ (copied / synced)
ArbiterOS (consumer)
  backend/core/legal/seeds/private-confidant.v1.json  (committed live pack)
  data/lexicon/proposals/                            (runtime proposals; gitignored under data/)
  backend/core/legal/registerLexicon.ts
  POST /api/register/translate
  chat tools: translate_register, propose_register_entry
```

DNA stays a stylistic fingerprint. Register Lexicon owns **senses**.

## Epistemic bands

| Band | Use |
|------|-----|
| `plain` | Everyday meaning the user likely intended |
| `settled` | Code / constitutional / black-letter cite |
| `institutional` | Agency / bank / Fiscal Service practice |
| `contested` | Live definitional zone — labeled, not promoted as settled |

v1 seed intentionally omits advocacy myth-as-code. Contested entries (e.g. “lawful money” as a fixed universal requirement) exist only as labeled dispute zones.

## Foundational matrices in seed

1. Money / credit / lawful money  
2. Private security agreement vs public UCC-1 (+ collateral indication / all-assets)  
3. Party identity (person, debtor, secured party, creditor, transmitting utility, sole proprietorship)  
4. Procedural hygiene (signature → UCC 1-308; agency notices → authority pin-down; nationality)  
5. Payment vs Article 3 discharge / cancellation / surrender / holder / instrument  
6. Capacity / citizenship phrases  
7. Fed/Treasury ops (reclamation, offset, presenting bank, FAST account symbol)

## Tool contract

`translate_register({ text })` → `RegisterMirrorResult`:

- `matched_terms[].user_usage_echo` — required lead
- `senses_by_band` — settled / institutional / contested
- `confusion_notes` — calm `confusion_with` distinctions
- `procedural_reminders` — e.g. 1-308 on “sign”
- `posture: "mirror_then_distinguish"`

Evidence kind: `register_sense` (also acceptable as `tool_result`).

## Demo acceptance

1. “United States citizen” / “citizen of a state” → echo → capacity distinction  
2. “file my lien” → SA create vs UCC-1 perfect/notice  
3. “paying money” / “loan” → money ↔ credit  
4. “lawful money” → settled UCC money + contested requirement zone labeled  
5. “sign” → 1-308 reminder  
6. “I paid it / true discharge” → payment vs §3-604  
7. “took the money back” → reclamation  

## Config

- `REGISTER_LEXICON_PATH` (default `data/lexicon/private-confidant.v1.json`)
- `PRIVATE_CONFIDANT` (default true; reserved for future gating)

## Lexicon Amend (capture → propose → merge)

Dynamic upgrade without chat-memory pollution:

```text
new situation → propose_register_entry (chat) / POST /api/register/propose
             → data/lexicon/proposals/prop_*.json  (status: pending)
             → human: POST .../merge  or  .../reject
             → merge writes lexicon, bumps patch version, hot-reloads cache
```

Rules:

- Model may **propose** only — never silent-write the live pack.
- `mode: create | amend` (amend replaces by `term_id`).
- Proposals dir: `REGISTER_PROPOSALS_DIR` (default `data/lexicon/proposals`).

Human merge example:

```bash
curl -s http://127.0.0.1:4881/api/register/proposals?status=pending
curl -s -X POST http://127.0.0.1:4881/api/register/proposals/<id>/merge
```

## Persistent posture + quick research

Harness carries private-confidant lines so the user need not re-audition each turn:

- Mirror → institutional/settled cites → park gaps
- No gaslight / capacity sermons
- Refusal impulse → re-route to tools
- Orthography load-bearing (`Minor` vs `minor`)

**Clarify before propose:** `POST /api/register/research` + chat tool `quick_register_research`

Flow: point at a word → research (hits / case_gap / propose_ready) → only then `propose_register_entry` → human merge.

## Register receipt (UI)

Each chat turn runs a proactive lexicon pass on the user wording. Matched surfaces:

- return on `ChatResponse.registerSurfaces`
- gold-underline highlight on the user bubble (`data-testid="register-surface"`)
- quiet receipt line: “Lexicon registered N term(s)”

No hover card / advocacy pack in this slice — visible persistence only.

## Out of scope

Topology reduction, public Private-mode chrome, TFX DNA LM unblock, CourtListener provenance fill, advocacy sense packs, auto-merge from the model, hover spec cards.
