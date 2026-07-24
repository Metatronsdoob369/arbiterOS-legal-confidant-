# CommonLawSpectralEngine Local Layer

## Purpose

This layer gives ArbiterOS a local common-law retrieval path that stays behind the ArbiterOS backend boundary instead of exposing Qdrant directly to the frontend.

It adds:

- `POST /embed` on the ArbiterOS backend (`127.0.0.1:4881`)
- `GET /api/common-law/health`
- `POST /api/common-law/query`
- `POST /api/common-law/bootstrap`

## Local Topology

- ArbiterOS frontend: `http://localhost:4321`
- ArbiterOS backend: `http://127.0.0.1:4881`
- Local Qdrant: `http://127.0.0.1:6333`
- Holdings collection: `case-law-holdings`
- Vector size: `1024`

## Retrieval Contract

`POST /api/common-law/query`

Request:

```json
{
  "query": "negotiable instrument unconditional promise",
  "statute": "UCC 3-104"
}
```

Response shape:

- `holdings[]`
- `interpretationLinks[]`
- `fallbackMode`
- `vectorSize`
- `collection`
- `silence` — Silence-First v1 envelope (`authority_kind: "holding"`). Empty or weak-only under strict policy ⇒ `silenced: true`.

See [`docs/contracts/silence-first.v1.md`](../contracts/silence-first.v1.md) and [`authority-lanes.v1.md`](../contracts/authority-lanes.v1.md).

The current local implementation uses a deterministic 1024-dimensional embedder so the full local flow works without an external model runtime.

The `/embed` route processes texts in fixed batches of `8`. Dynamic or text-length-based batching is intentionally avoided for now so local inference behavior stays predictable while the topology layer is still being mapped.

## Seed and Fallback Behavior

Bootstrap script:

```bash
npm run bootstrap:common-law
```

Google Drive bootstrap script:

```bash
rclone mount gdrive: /mnt/gdrive --daemon
npm run bootstrap:caslaw-drive -- --drive-mount /mnt/gdrive/Caselaw --limit 5000
```

Supported mounted input formats:

- `.parquet`
- `.jsonl`
- `.ndjson`
- `.json`

Behavior:

1. Ensure the `case-law-holdings` collection exists in local Qdrant.
2. Seed a small holdings corpus for UCC 3-104 and related common-law checks.
3. Fall back to the seeded in-memory corpus if local Qdrant is unavailable.

The Drive bootstrap path is separate from the small local seed path:

- `bootstrap:common-law` seeds the built-in starter subset
- `bootstrap:caslaw-drive` streams a mounted external corpus into the same collection

This keeps the validation layer from failing silently. If the collection is missing or empty, the system still produces explicit retrieval state and gate evidence.

Topology preparation is limited to a placeholder helper in `backend/core/legal/commonLawEngine.ts`:

- `reduceToTopologyDim(embedding, targetDim = 8)`

It is currently a no-op stub and is not part of live retrieval yet.

## Gate Integration

The validation gate now enforces R5:

- high-severity `legal_rule` claims need statute evidence or a strong holding
- high-severity `interpretation` claims need statute evidence or a strong interpretation link

If that support is missing, the gate blocks the response rather than letting a high-severity unsupported claim ship.

## Browser Console Checks

```js
await window.commonLawEngine.checkCollectionHealth()
await window.commonLawEngine.retrieveHoldings({
  query: 'negotiable instrument unconditional promise',
  statute: 'UCC 3-104',
})
```

## Verified Local State

As verified on July 16, 2026:

- local collection exists
- collection point count is `5`
- `/embed` returns 1024-dimensional vectors
- `/api/common-law/query` returns seeded holdings with `fallbackMode: "none"` once Qdrant is seeded

## Future Direction: Spectral Treatment Graph

Under common law, **the holding is the law**. Statutes are raw material; judicial
interpretation + treatment history (Shepardizing) create binding force. A richer
Zod-validated graph model for this already exists in `schemas/legalSchemas.ts`
(`HoldingRefSchema`, `TreatmentEdgeSchema`, `CourtLevelSchema`, `TreatmentTypeSchema`)
as a forward-looking extension, but is **not yet wired** into the live retrieval path
above — the live path uses the simpler `HoldingSearchResult` / `InterpretationLink`
(`holding_id`/`citation`/`relation`/`strength`) shapes instead.

Planned shape once wired:

```
query / statute
  → CaseLawModernBERT embed (local sidecar :4881)
  → Qdrant search (collection: case-law-holdings)
  → hydrate HoldingRef[] + recompute stare_decisis_weight
  → linkInterpretation → InterpretationLink (graph_weight / synthesis)
  → attach to Claim.interpretation_links[]
  → Validation Gate R5
```

Shepardizing / treatment graph:

- Nodes = opinions / holdings
- Edges = treatment (followed | distinguished | overruled | ...)
- Weight = court_level × recency_decay × product(treatment_multipliers)
- Negative treatments (overruled, vacated, reversed, superseded) can drive weight → 0

Next steps to land this:

1. Offline embed COLD subset / CourtListener bulk → upsert to Qdrant with full `HoldingRef` payloads.
2. Wire CourtListener treatment graph for live Shepardizing updates (`treatment_history`).
3. Compute `stare_decisis_weight` server-side and surface it on `HoldingSearchResult`.
4. Add jurisdiction filters + multi-state support.

> The future is not prompted; it is Contracted.
> Interpretation is no longer a vibe. It is a spectral object with provenance, weight, and a gate that can reject it.
