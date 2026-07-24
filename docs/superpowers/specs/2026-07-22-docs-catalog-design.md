# Modular Documentation Catalog

**Date:** 2026-07-22  
**Status:** Implemented (v1 scaffold + IRS forms ingest)  
**Product:** ArbiterOS Legal Confidant  
**Related:** Case Map primer packages, Documentation spine (ingest → curate → produce)

---

## 1. Decision

Documentation curation gets a **modular department catalog** separate from Case Map packages and from the user’s soft Library working set.

| Surface | Owns |
|---------|------|
| **Docs catalog** | Offline institutional corpora by department (forms, pubs, codes) |
| **Library** | User-curated working set; can pin catalog rows later |
| **Case Map packs** | Thin procedural courses that *reference* catalog IDs |

## 2. Departments (v1 scaffolding)

| `department_id` | Title | v1 status |
|-----------------|-------|-----------|
| `irs_treasury` | IRS / Treasury | **populated** — IRS forms corpus |
| `fred_fed` | FRED / Federal Reserve | stub |
| `ucc` | UCC | stub |
| `cfr` | Code of Federal Regulations | stub |

Each department is a module directory under `backend/core/legal/seeds/docs/` with `module.json` and optional `catalogs/*.index.json`.

## 3. IRS forms corpus

Source: [TrevorJS/irs-forms](https://huggingface.co/datasets/TrevorJS/irs-forms) (~2.9k rows).

- **Committed:** metadata index + short text preview (browse/search offline)
- **Local (gitignored):** full extracted text SQLite via `npm run ingest:irs-forms`
- Packs (e.g. `irs_form_intimacy`) stay curated; they do not dump the catalog

## 4. API (session required)

- `GET /api/docs/departments` — department registry
- `GET /api/docs/departments/:id` — module + catalog summaries
- `GET /api/docs/catalogs/:catalogId` — paginated/searchable entries
- `GET /api/docs/entries/:entryId` — entry detail (full text when local DB present)

## 5. UI

Library gains tabs: **Working set** | **Departments**. Departments lists the four modules; IRS/Treasury opens the forms catalog search.
