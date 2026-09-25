# CLAUDE.md — Claude Code Hive Doorway

@docs/hive/00-Director/Working-Style.md
@docs/hive/00-Director/Memory-Protocol.md
@docs/hive/00-Director/Delegation-and-Agents.md
@docs/hive/00-Director/Project-Roster.md

## ArbiterOS Quick Reference

- **Dev server**: `npm run dev` (starts Fastify backend on 4881 & Vite frontend on 3000)
- **Seed admin**: `npm run seed:admin`
- **Unit tests**: `npm run test:unit`
- **Type check**: `./node_modules/.bin/tsc --noEmit` or `npx tsc --noEmit`
- **E2E tests**: `npm run test:e2e`

### Architecture
- **Contracts > Prompts**: Zod schemas in `schemas/legalSchemas.ts` govern all AI tool calls.
- **Airgapped backend**: Fastify server in `backend/app.ts` using SQLite in `data/arbiter.db`.
- **Hive Vault**: Canonical Director notes in `docs/hive/00-Director/` (and local clone `~/Hive`).
