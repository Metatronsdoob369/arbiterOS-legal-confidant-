# ArbiterOS Airgapped MVP Design

Date: 2026-07-03
Repo: `/Users/joewales/arbiterOS-legal-confidant-`
Status: Draft for review

## Objective

Define the first real MVP shape for ArbiterOS as an airgapped, single-machine deployment that supports local login, per-user persistence, and spectral-file workflows without collapsing WhiteGlove into the legal product.

This MVP is intentionally narrower than the earlier over-scoped backend plan. It does not require cloud auth, KMS, hosted databases, or a new private vector deployment. It should run locally, offline-first, and preserve a clean path to a future multi-user and multi-product platform.

## MVP Decisions

- Deployment model: airgapped local system
- Current operating mode: single operator on one machine
- Architecture target: multi-user capable from day one
- Auth model: fully local login with backend-managed sessions
- Primary structured storage: SQLite
- Retrieval/index layer: existing Qdrant remains in place
- Product scope: ArbiterOS is the legal product; WhiteGlove remains a separate modular agent system

## Non-Goals

- No hosted auth providers for the first demo
- No cloud-managed storage or key management
- No repo merge between WhiteGlove and ArbiterOS
- No requirement to stand up a new vector database if the current Qdrant deployment is usable
- No attempt to generalize every WhiteGlove capability into ArbiterOS before the legal MVP works

## System Shape

The MVP becomes a two-process local system:

`React/Vite UI -> local backend API -> SQLite + local artifact storage + Qdrant`

### Frontend

The existing React/Vite app remains the user-facing surface. It should stop owning sensitive state directly and instead call a local backend over `localhost`.

Responsibilities:

- show login screen before access to the legal workspace
- manage authenticated session state
- render user-scoped legal memory and processed-file records
- call backend endpoints for retrieval, file processing metadata, and audit-visible actions

### Backend

The backend becomes the trust boundary for the product.

Responsibilities:

- authenticate users
- issue and revoke sessions
- own all SQLite access
- manage user-scoped memory and processed-file records
- handle all Qdrant access on behalf of the frontend
- write audit events
- expose legal-domain endpoints without exposing WhiteGlove internals

The backend should be structured as a neutral core plus product modules, not as WhiteGlove embedded inside ArbiterOS.

## Product Boundary

WhiteGlove should remain a standalone modular agent system. ArbiterOS should reuse shared architectural patterns and shared infrastructure concepts, but it should not absorb WhiteGlove as an implementation dependency that owns the product.

Correct relationship:

- core platform -> ArbiterOS legal module
- core platform -> WhiteGlove module

Incorrect relationship:

- WhiteGlove inside ArbiterOS

This separation protects future modularity and keeps the legal product from becoming the accidental parent of every other spectral agent.

## Backend Structure

Recommended local structure inside this repo:

```text
backend/
  core/
    auth/
    sessions/
    storage/
    audit/
    qdrant/
    repositories/
  modules/
    legal/
      routes/
      services/
      contracts/
```

If WhiteGlove-specific runtime code is ever colocated later, it should live in its own module boundary and still depend on neutral core services. For the first MVP, WhiteGlove should remain in its own repo and only inform patterns and interfaces.

## Authentication Model

Authentication should be fully local.

### Users

Store users in SQLite with at least:

- `id`
- `username` or `email`
- `password_hash`
- `role`
- `created_at`
- `last_login_at`
- `disabled_at`

Passwords should be hashed with Argon2. Passwords are never stored reversibly.

### Sessions

Use backend-managed sessions rather than JWT as the primary mechanism for this MVP.

Rationale:

- simpler local revocation
- simpler airgapped deployment
- easier reasoning about server-side logout and session invalidation

The frontend receives a secure session cookie and uses it for authenticated requests.

### Roles

Start with two roles:

- `admin`
- `user`

Even if only one operator exists initially, every persisted domain record should include `user_id` so multi-user support is not a retrofit.

## Per-User Persistence

Per-user persistence means each user has:

- their own login identity
- their own session history
- their own memory/workspace entries
- their own processed-file records
- their own audit-visible actions

Shared corpora and retrieval indices remain global infrastructure, but product data stays user-scoped.

## Storage Model

Qdrant and processed files are separate layers.

### Qdrant

Qdrant is the shared retrieval/index layer.

- stores vectors and retrieval payloads
- is global to the machine
- is accessed only by the backend
- is configured per collection, not hardcoded into product-neutral core code

### SQLite

SQLite is the durable product-state store for:

- users
- sessions
- memory entries
- processed-file metadata
- audit events
- retrieval run metadata where needed

### Local Artifact Storage

Large files and generated artifacts should live on disk, not inside SQLite.

SQLite stores:

- owner
- domain
- stored path
- checksum
- MIME type
- status
- provenance pointers

Recommended artifact path pattern:

- `data/artifacts/legal/<userId>/...`
- future: `data/artifacts/whiteglove/<userId>/...`

## Domain-Neutral Data Model

Core records should stay neutral so WhiteGlove remains modular.

Recommended shared records:

- `users`
- `sessions`
- `memory_entries`
- `processed_files`
- `retrieval_runs`
- `audit_events`

Avoid product-coupled shared names such as:

- `whiteglove_memories`
- `legal_only_sessions`

Every persisted product record should carry at least:

- `user_id`
- `domain`

This allows ArbiterOS and future products to share the same core infrastructure without data model contamination.

## Processed Files Model

Recommended `processed_files` fields:

- `id`
- `user_id`
- `domain`
- `source_filename`
- `stored_path`
- `checksum`
- `mime_type`
- `processing_status`
- `qdrant_collection`
- `qdrant_point_ids` or `spectral_run_id`
- `created_at`
- `updated_at`

This model supports:

- reopening prior processed work
- linking artifacts to retrieval/index state
- attaching provenance to user-visible output
- future reprocessing without losing ownership history

## API Direction

The first MVP backend surface should be intentionally small.

Suggested initial endpoints:

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/session`
- `GET /memories`
- `POST /memories`
- `GET /processed-files`
- `POST /processed-files`
- `GET /processed-files/:id`
- `GET /health/retrieval`

Legal-domain retrieval or workbench routes should be exposed through the legal module, not through product-neutral core routes.

## Error Handling

Required MVP behavior:

- failed login returns a generic error without user enumeration
- corrupted or expired session forces logout and writes an audit event
- missing Qdrant collection returns degraded retrieval status instead of fabricated success
- missing local artifact marks the metadata record as broken or recoverable instead of silently disappearing

## Testing Strategy

Minimum test coverage for this slice:

### Unit

- password hashing and verification
- session creation and invalidation
- SQLite repository behavior
- path and ownership validation for stored artifacts

### Integration

- login flow
- create and read per-user memory entries
- create and read processed-file records
- retrieval health check behavior with and without Qdrant availability

### Contract

- legal module only exposes legal-domain records for the authenticated user
- shared core services stay domain-neutral

### Smoke

- app boots offline
- login works without internet
- backend can operate with SQLite and local storage only

## Migration Path

This MVP should optimize for SQLite now while preserving a clean later migration path to Postgres.

That means:

- repository interfaces should be explicit
- business logic should not depend on SQLite-specific calling patterns
- migrations should be defined cleanly enough to translate later
- session, memory, and processed-file schemas should already reflect multi-user reality

The future storage swap should be an infrastructure change, not a product rewrite.

## Risks and Guardrails

### Primary Risk

The main architectural risk is mixing WhiteGlove and ArbiterOS so tightly that WhiteGlove can no longer stand alone.

### Guardrails

- no WhiteGlove-specific naming in shared core tables
- no legal assumptions inside auth, storage, or Qdrant wrappers
- backend core knows nothing about law
- legal module depends on core, not the reverse
- Qdrant collections and domain behavior are configuration-driven

## Recommended MVP Sequence

1. Add local backend skeleton to the repo
2. Implement SQLite schema and repository layer
3. Implement local auth and server-managed sessions
4. Move per-user memory persistence behind backend APIs
5. Add processed-file registry and local artifact paths
6. Wrap Qdrant access behind backend adapters
7. Connect the existing frontend to the authenticated local API
8. Add offline smoke tests and auth/storage integration tests

## Final Design Statement

ArbiterOS should be implemented as a legal product on top of a neutral local backend core. That core owns auth, sessions, per-user persistence, local artifact storage, audit logging, and Qdrant access. WhiteGlove remains a separate modular agent system that can share patterns and, later, core infrastructure concepts, but it must not be embedded into ArbiterOS in a way that destroys its independence.
