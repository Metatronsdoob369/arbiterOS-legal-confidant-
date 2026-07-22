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
