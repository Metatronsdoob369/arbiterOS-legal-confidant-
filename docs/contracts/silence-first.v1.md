# Silence-First Philosophy Contract v1

## Document Metadata

- **Contract Name:** `SilenceFirstV1`
- **Scope:** Portable authority-retrieval posture for any product that must not invent law, medicine, or other corpus-backed claims
- **Status:** Normative for ArbiterOS adoption; extractable to OMC / `@domicile/contracts`
- **Canonical Runtime Validator:** Zod (`schemas/silenceFirst.ts`)
- **Machine Schema:** [`silence-first.v1.schema.json`](./silence-first.v1.schema.json)

---

## Purpose

Silence-first is a **philosophy exchange**: a small contract other tools can import without depending on any single harness (WhiteGlove, Arbiter, spectral-terrain).

It separates:

| Artifact | Owns |
| --- | --- |
| **This contract** | When an agent may assert authority; the result envelope |
| **Retrieval engines** | How similarity is computed (SimHash/Hamming/BLAKE2b, cosine, strength bands) |
| **Product UX** | Counsel vs Private vs medical role — when to ask retrieval at all |

**Rule:** If retrieval is silenced for a claim, the model must **not invent** that authority. Procedural / plain-language help may continue.

---

## Normative Concepts

### `authority_kind`

| Kind | Meaning | Typical lane |
| --- | --- | --- |
| `statute` | Code / regulation text | Law corpus |
| `holding` | Case holding / opinion excerpt | Common-law spectral |
| `corpus_shard` | Generic shattered vault shard | WhiteGlove / private corpus |
| `working_set` | User-curated notes (Library) | Soft — only if attached |
| `register` | Lexicon sense (plain vs institutional) | Private register — not primary law |

### `silence_policy`

- **`strict`** — Below threshold ⇒ `silenced: true`; no LLM fallback on that authority claim.
- **`permissive`** — May return low-confidence hits with `silenced: false` and explicit weak score; product still should label uncertainty.

### Result envelope

Every authority retrieval (statute, holding, shard) **must** emit:

```ts
{
  found: boolean;
  silenced: boolean;
  reason: string;
  authority_kind: AuthorityKind;
  silence_policy: SilencePolicy;
  score?: number;
  metric?: "hamming_ratio" | "cosine" | "strength" | "unknown";
  citation?: string;
  title?: string;
  text?: string;
  provenance?: string;
}
```

- `found && !silenced` — usable as citeable authority for hard claims.
- `silenced` — agent may say “corpus silent / no match,” may help procedurally, **must not** fabricate the cite.
- Engines choose `metric`; the contract does **not** require SimHash. WhiteGlove may use `hamming_ratio`; common-law may map `strength` to a numeric score.

---

## Authority lanes (ArbiterOS)

See [`authority-lanes.v1.md`](./authority-lanes.v1.md).

Summary:

1. **Statute / code** — `consult_statute` → law corpus gateway (optional HTTP upstream).
2. **Holdings / opinions** — `retrieve_holdings` → CommonLawSpectral (Qdrant / seed).
3. **Register** — Private lexicon tools (clarify / propose; not cite-as-law).
4. **Library working set** — attach later; soft silence only when attached.

WhiteGlove the **product** remains the harness for private mappable corpora. Arbiter **imports this philosophy** and calls lanes; it does not embed the WhiteGlove agent loop.

---

## Non-goals

- Does not require SimHash, Hamming, or BLAKE2b inside every consumer.
- Does not replace product system prompts wholesale.
- Does not forbid companion / diligence chat when authority is silent.
- Does not merge statute and opinion into one index.

---

## Extraction path

1. Stabilize here (Arbiter `docs/contracts` + Zod).
2. When a second product needs a shared import, copy/publish to `open-model-contracts` or `@domicile/contracts`.
3. WhiteGlove maps existing `silencePolicy` + Hamming threshold onto this envelope.

---

## Versioning

- `contract_version`: `"1.0"`
- Breaking envelope field changes bump major; additive optional fields are minor.
