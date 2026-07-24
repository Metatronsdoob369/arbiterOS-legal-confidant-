# Silence-First — Extraction Notes

**Status:** Deferred until a second product needs a shared import path.

## Current home (v1)

- Philosophy: [`silence-first.v1.md`](./silence-first.v1.md)
- Lanes: [`authority-lanes.v1.md`](./authority-lanes.v1.md)
- JSON Schema: [`silence-first.v1.schema.json`](./silence-first.v1.schema.json)
- Zod: [`schemas/silenceFirst.ts`](../../schemas/silenceFirst.ts)

## When to extract

Publish to `open-model-contracts` or `@domicile/contracts` when **WhiteGlove** (or another tool) needs the same import rather than copying files.

## WhiteGlove mapping (future)

| WhiteGlove today | Silence-first envelope |
| --- | --- |
| `silencePolicy: strict` | `silence_policy: "strict"` |
| Hamming ratio > threshold | `silenced: true`, `metric: "hamming_ratio"` |
| `/query` hit | `found: true`, `silenced: false`, `authority_kind: "corpus_shard"` |

Arbiter’s `lawCorpusGateway` already accepts optional upstream `silenced` / `hamming_ratio` fields.
