# Common Law Spectral Layer

## Purpose

Under common law, **the holding is the law**. Statutes are raw material; judicial interpretation + treatment history (Shepardizing) create binding force.

This layer elevates interpretation from free-form LLM text into a **first-class, Zod-validated, spectral object** (`HoldingRef` + `InterpretationLink`). The AI may only request and compose these objects. The Validation Gate (R5) enforces them.

## Components

| File | Role |
|------|------|
| `schemas/legalSchemas.ts` | `HoldingRefSchema`, `InterpretationLinkSchema`, `TreatmentType`, `CourtLevel`, extended `Claim` + `EvidenceRef` |
| `services/commonLawEngine.ts` | Retrieval, weight computation, Qdrant wiring, seed fallback, `retrieveAndLink` |
| `services/validationGate.ts` | R5 common-law rule |
| `services/aiProvider.ts` | New tools: `retrieve_holdings`, `link_interpretation` |

## Data Flow

```
query / statute
  → CaseLawModernBERT embed (local sidecar :4881)
  → Qdrant search (collection: case-law-holdings)
  → hydrate HoldingRef[] + recompute stare_decisis_weight
  → linkInterpretation → InterpretationLink
  → attach to Claim.interpretation_link
  → Validation Gate R5
```

## Shepardizing / Treatment Graph

- Nodes = opinions / holdings
- Edges = treatment (followed | distinguished | overruled | ...)
- Weight = court_level × recency_decay × product(treatment_multipliers)
- Negative treatments (overruled, vacated, reversed, superseded) can drive weight → 0

Seeded with high-value UCC / IRC / FTC holdings for offline operation.

## Error Handling (Fail-Closed)

| Failure | Behavior |
|---------|----------|
| Embed timeout / unavailable | CommonLawError → seed fallback + ValidationStep |
| Qdrant down / collection missing | Same |
| Schema violation on payload | Drop point, continue |
| Zero holdings after filters | `synthesis = insufficient_authority`, gate blocks high-severity |
| Graph inconsistency | Treated as SCHEMA_VIOLATION / empty |

All operational failures produce a `ValidationStep` receipt. No silent degradation.

## Environment Variables

```bash
VITE_QDRANT_URL=http://localhost:6333
VITE_COMMON_LAW_COLLECTION=case-law-holdings
VITE_EMBED_ENDPOINT=http://localhost:4881/embed   # CaseLawModernBERT-large sidecar
```

## Bootstrap Qdrant Collection (operator)

```bash
# Create collection (vector size must match CaseLawModernBERT-large, typically 1024)
curl -X PUT 'http://localhost:6333/collections/case-law-holdings' \
  -H 'Content-Type: application/json' \
  -d '{
    "vectors": { "size": 1024, "distance": "Cosine" }
  }'
```

Payload schema per point: full HoldingRef fields (without embedding; vector is separate).

## Next Steps

1. Spin up embed sidecar (transformers + CaseLawModernBERT-large or Ollama-compatible).
2. Offline embed COLD subset / CourtListener bulk → upsert to Qdrant.
3. Wire CourtListener treatment graph for live Shepardizing updates.
4. Add jurisdiction filters + multi-state support.

## Philosophy

> The future is not prompted; it is Contracted.
> Interpretation is no longer a vibe. It is a spectral object with provenance, weight, and a gate that can reject it.
