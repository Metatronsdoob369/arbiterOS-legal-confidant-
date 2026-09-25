# AGENTS.md — ArbiterOS & Hive Memory Doorway

## ⚖️ ArbiterOS Agent Instructions

Welcome, agent. You are working on **ArbiterOS** — a contract-first legal case-building tool and confidant.

### Core Directives

1. **Contracts > Prompts**:
   - All legal interactions and AI outputs are strictly bound by Zod schemas in `schemas/legalSchemas.ts`.
   - Never interpret law or invent statutory citations. Always retrieve law via tools (`consult_statute`, `retrieve_holdings`, `analyze_clause_risks`, `verify_negotiability`, `draft_verified_form`, `translate_register`).

2. **Airgapped MVP Architecture**:
   - Local Fastify backend on port 4881 (`backend/app.ts`, `backend/server.ts`).
   - SQLite persistence (`data/arbiter.db`) for user memories, processed files, and audit events.
   - Vite + React 19 frontend on port 3000 (or dev port).
   - Local Word `.docx` generation via `/api/drafts`. No external SaaS required.

3. **Performance & Reactivity Rules**:
   - When rendering heavy markdown or list items, wrap list items in `React.memo` and memoize callbacks with `React.useCallback`.
   - Use `useMemo` with Map for O(1) lookups in render-heavy views (e.g. `EvidenceBoard.tsx`, `CaseBoard.tsx`).
   - Maintain the performance journal in `.jules/bolt.md`.

---

## 🐝 Hive Memory Vault Protocol (Karpathy Method)

All agent memory lives in the canonical Hive Vault (`~/Hive` / `hive-memory`).

### Memory Protocol Rules
1. **Auto-Loaded = Compact; Heavy = Linked**:
   - Read `00-Director/` files and the relevant project hub on session start.
2. **Raw Stream → Distilled Synthesis (Karpathy Method)**:
   - `20-Session-Log/SESSION_LOG.md`: Append-only raw session history.
   - `10-Projects/<Project>/_<Project>-Hub.md`: Distilled, current-state-only knowledge page (~1 screen). Overwrite and prune.
   - `00-Director/`: Global working style, delegation rules, and roster.
3. **Never Invent a Separate Cubby**:
   - Do not create stray `MEMORY.md` or isolated memory files. Always auto-follow into `~/Hive`.
4. **Wrap Ritual**:
   - Prepend short log block to `20-Session-Log/SESSION_LOG.md` (`YYYY-MM-DD`, what mattered, what's next).
   - Promote critical learnings or gotchas into Director/Hub notes immediately.
