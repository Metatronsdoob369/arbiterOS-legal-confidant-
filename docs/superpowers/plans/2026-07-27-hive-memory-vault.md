# Hive Memory Vault Implementation Plan

> **Goal:** Create the canonical markdown Hive Memory Vault (`~/Hive` / `hive-memory` repo) and wire agent doorways (`AGENTS.md`, `CLAUDE.md`) so all agents auto-follow the Karpathy-distillation memory protocol (raw session logs + distilled compact current-state Director/Hub notes).

---

## Architecture & Layout

Canonical Memory Vault structure:
```
Hive/
  00-Director/                 # GLOBAL — auto-loaded every session
    Working-Style.md
    Memory-Protocol.md         # constitution (Karpathy distillation rules)
    Delegation-and-Agents.md
    Project-Roster.md          # one line per project
  10-Projects/
    arbiteros/
      _arbiteros-Hub.md        # CURRENT STATE only (overwrite & prune)
    bond-issuance-hunt/
      _bond-issuance-hunt-Hub.md
  20-Session-Log/
    SESSION_LOG.md             # append-only history log
  90-Redirects/                # path map for legacy memory cubbies
```

---

## Tasks

### Task 1: Create Hive Memory Vault Plan & Director Stubs
- Create `docs/superpowers/plans/2026-07-27-hive-memory-vault.md`.
- Establish the four Director markdown files (`Working-Style.md`, `Memory-Protocol.md`, `Delegation-and-Agents.md`, `Project-Roster.md`).

### Task 2: Create Root Doorways (`AGENTS.md` & `CLAUDE.md`)
- Create `AGENTS.md` at repository root defining agent contracts, memory doorways, and session startup protocols.
- Create `CLAUDE.md` at repository root with `@import` pointers to `~/Hive/00-Director/`.

### Task 3: Seed Project Hubs and Session Log
- Seed `10-Projects/arbiteros/_arbiteros-Hub.md` and `10-Projects/bond-issuance-hunt/_bond-issuance-hunt-Hub.md`.
- Create append-only `20-Session-Log/SESSION_LOG.md`.

---

## Verification
- Confirm file creation using `list_files` and `read_file`.
- Verify doorways load Director files and point to `~/Hive`.
