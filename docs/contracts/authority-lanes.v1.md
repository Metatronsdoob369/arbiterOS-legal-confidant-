# Authority Lanes v1

Companion to [`silence-first.v1.md`](./silence-first.v1.md).  
Where each kind of authority lives in ArbiterOS, and how silence applies.

---

## Lane map

| Lane | Product surface | Tool / API | Engine | Silence |
| --- | --- | --- | --- | --- |
| **Statute / code** | Counsel + Private | `consult_statute` → `/api/legal/query` | [`lawCorpusGateway`](../../backend/core/legal/lawCorpusGateway.ts) (optional `LAW_CORPUS_URL`) | Hard — no cite if `silence.silenced` |
| **Holdings / opinions** | Counsel + Private | `retrieve_holdings` → `/api/common-law/query` | [`commonLawEngine`](../../backend/core/legal/commonLawEngine.ts) (Qdrant / seed) | Hard on “the holding is…”; empty or weak-only under strict ⇒ silenced |
| **Register** | Private only | `translate_register`, research, propose | Register lexicon pack | Not primary law — clarify / propose; do not cite as statute |
| **Library working set** | Library UI today | `/api/memories` | SQLite memories | Soft — agents do not see it until attach-to-turn (future L1) |

WhiteGlove the **harness** may implement the statute/corpus_shard lane (SimHash + Hamming + BLAKE2b). Arbiter talks to it only over HTTP via the law-corpus boundary — it does not embed the agent loop.

---

## Opinions / common law

- Stay on the **common-law spectral path** (embeddings + holdings + `interpretation_links`).
- Do **not** force opinions through WhiteGlove SimHash first.
- Both statute and holdings lanes must emit the **same silence-first envelope** so the validation gate and system prompt treat “no authority” uniformly.
- Evidence schemas already allow `opinion` / `holding` kinds — wire silence into those claims; do not add a third RAG stack.

---

## What agents may do when silenced

| Allowed | Forbidden |
| --- | --- |
| Say the corpus was silent / no match | Invent a UCC/USC/CFR cite |
| Procedural / plain-language navigation | Assert “the holding is…” with no non-silenced holding |
| Register mirror and propose stubs (Private) | Treat register senses as enacted law |
| Qualify with uncertainty markers | Paste fabricated opinion text |

---

## Env (statute lane)

Prefer `LAW_CORPUS_URL` (and `LAW_CORPUS_COLLECTION`).  
Aliases still accepted: `LAWLIBRA_URL`, `WHITEGLOVE_URL`.
