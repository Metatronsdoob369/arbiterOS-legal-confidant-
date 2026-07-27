# Hive Memory Vault — Design

**Date:** 2026-07-27  
**Status:** Approved for implementation planning (pending user review of this file)  
**Problem:** Agents invent private memory cubbies that die; Joe re-explains context every session. Prior engines (Clay/Firebase tripwire, Telekenesis, CIF vault, ECC sessions) never became a shared mesh.

## Goal

One obvious, human-legible memory store — a private GitHub repo of markdown (Obsidian-compatible, Obsidian optional) — that every agent doorway points at. Auto-follow old paths into the vault. No hard gate; the right place is the easy place.

Primary job for the next weeks: **query/synthesize across notes** (capture/resume underpins it; graph comes later).

## Non-goals (v1)

- Graphify, NocoDB, or Open Notebook as the hub
- Coding memory UI into Arbiter
- Bulk AI-session / NotebookLM ingest
- Redis/Tailscale memory sync (Telekenesis-style)
- Rebuilding Clay four-tier Firebase
- Requiring an Obsidian account (or Obsidian at all)

## Architecture

**Canonical store:** private GitHub repo = markdown vault. Local clone is live; `git pull` / commit / push is the mesh.

**Defaults (change at implement if desired):**

| Item | Default |
| --- | --- |
| Repo name | `hive-memory` (private) |
| Local clone | `~/Hive` |
| First project hub | `bond-issuance-hunt` |

### Vault layout

```
Hive/
  00-Director/                 # GLOBAL — auto-loaded every session
    Working-Style.md
    Memory-Protocol.md         # constitution
    Delegation-and-Agents.md
    Project-Roster.md          # one line per project
  10-Projects/
    <Project>/
      _<Project>-Hub.md        # CURRENT STATE only (overwrite, prune)
      …heavier notes…          # linked from hub, never auto-loaded
  20-Session-Log/
    SESSION_LOG.md             # append-only history
  90-Redirects/                # optional: old cubby → vault path map
```

### Layer jobs (do not blur)

| Layer | Job |
| --- | --- |
| Director | How Joe works; agent contract; roster |
| Project hub | Where this project is *right now* (~one screen) |
| Session log | History (append, absolute dates `YYYY-MM-DD`) |
| Live chat | Stays in the chat — not duplicated into vault |
| Arbiter ledger / intelligence-vault HANDOFF | Proof, hyps, seal status — **link** from hub, do not copy |

### Partner rules (Memory-Protocol)

1. Auto-loaded = compact; heavy = linked.
2. Hub = current state (overwrite) · `SESSION_LOG.md` = history (append) · board/chat = live talk. No duplicates.
3. Gotcha promotion on first occurrence — into an auto-loaded doc same session.
4. Append/merge; don’t proliferate twin notes. Absolute dates only.

## Doorways

| Surface | Mechanism |
| --- | --- |
| Claude Code | `~/.claude/CLAUDE.md` `@`-imports the four Director files (forward-slash, no-space paths) |
| Cursor / Arbiter / Codex | `AGENTS.md` (and Arbiter root as needed): session-start — read those N vault files before working |
| Telegram / OpenClaw | Workspace memory skill/README points at Hive clone; no separate store |
| Humans | Open the clone as a folder (Obsidian optional) |

Not a hard gate: agents can ignore the vault; structure + doorways + auto-follow make the correct path obvious.

## Auto-follow (old contacts → Hive)

| Old contact | Behavior |
| --- | --- |
| `NODE_OUT_Master/bloat/core_intelligence/session_management/CLAUDE_SESSION_STARTUP.js` | Rewritten or wrapped to load/print from `00-Director/` + relevant hub (no Firebase required for v1) |
| ECC `~/.claude/sessions` / homunculus | Remain coding instincts; Director clarifies hall memory = Hive |
| CIF / `open-model-contracts/src/memory-vault` | Default/config → Hive markdown, or stub pointing at clone |
| Telekenesis / agentic-memory | Dormant; README redirect only |
| Per-project stray `MEMORY.md` cubbies | Replace with pointer → `10-Projects/<that>/` |

## Wrap ritual

End of every real work session:

1. Prepend a short block to `SESSION_LOG.md` (`YYYY-MM-DD`, what mattered, what’s next).
2. Triage gotchas → promote into Director or hub same session if they cost time.
3. Prune hubs to ~one screen; move fat detail to linked notes.
4. `git pull` → commit → push.

Tiny sessions (no state change): skip wrap or one-line log only.

## Parallel sessions

- Pull before write.
- Milestone edits on hubs (CURRENT STATE bullets), not contested essay prose.
- Prefer one writer per hub file; log tolerates concurrent appends better.
- Roster stays one line per project.

No CRDT/Redis in v1.

## Error / degraded behavior

| Condition | Behavior |
| --- | --- |
| Vault missing / not cloned | Doorway docs state exact clone path; “do not invent a cubby” |
| Git conflict on hub | Pull; keep CURRENT STATE bullets |
| Agent creates new `MEMORY.md` elsewhere | Next pass: redirect stub; grow auto-follow list |
| Firebase / CIF / Telekenesis down | Irrelevant; Hive is disk + git |

## Success criteria (v1)

1. New Arbiter/Cursor session loads Director without Joe re-explaining working style or where memory lives.
2. Bond/legal hub answers “where are we?” in one screen; proof linked, not pasted.
3. Old tripwire path auto-follows into Hive without Firebase.
4. Human can read/edit the clone as markdown without a special app.
5. Wrap + push on one machine; pull on another sees the update.

## Relationship to existing systems

| System | Role after Hive |
| --- | --- |
| Arbiter `ledger.v1.json` | Case hyp / seal discipline — linked from hubs |
| intelligence-vault hunt HANDOFF | Hunt ops source of truth — linked from `bond-issuance-hunt` hub |
| book-pipeline / book-to-skill | Doctrine → skills feeder; skills may cite Hive, not replace it |
| Cartographer | Capability index — not research memory |
| Partner MindHive | Pattern source; Joe’s vault is separate unless they later choose to share |

## Implementation sketch (for planning skill — not executed here)

1. Create private `hive-memory` repo + local `~/Hive` with Director stubs + Memory-Protocol + Roster + one hub + empty session log.
2. Wire Claude `@import` and Arbiter/Cursor `AGENTS.md` session-start.
3. Auto-follow tripwire (+ optional redirect stubs for known cubbies).
4. Seed `bond-issuance-hunt` hub with CURRENT STATE + links to HANDOFF and ledger hyps.
5. Smoke: fresh session reads Director; second session after hub edit + push/pull sees update.

## Decisions locked in brainstorm

- Approach: MindHive-shaped vault (not Arbiter-ledger-only, not a new memory engine).
- Redirect model: **auto-follow** (old paths resolve into Hive), not a hard job gate.
- Four-tier Clay/Firebase schema: **not** adopted; partner three-layer vault + four protocol rules instead.
- Obsidian: optional viewer only.
