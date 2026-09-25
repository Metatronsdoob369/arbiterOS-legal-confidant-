# _arbiteros-Hub.md — ArbiterOS Current State

## Current State (2026-09-22)

- **Status**: Airgapped v1 MVP Shippable.
- **Backend**: Fastify on port 4881 (`backend/app.ts`), SQLite database (`data/arbiter.db`), cookie auth.
- **Frontend**: Vite + React 19 on port 3000.
- **Views**: Counsel, Private Confidant, Growth, Evidence Board, Library, Forensics, Governance Ledger.
- **Optimizations**: `ChatMessageItem` wrapped in `React.memo` with memoized callbacks in `components/LegalAdvisor.tsx`.
- **Doorways**: `AGENTS.md` and `CLAUDE.md` connected to `docs/hive/00-Director/`.
