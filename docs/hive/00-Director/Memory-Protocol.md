# Memory-Protocol.md — Hive Memory Vault Constitution

## The Karpathy Method Memory Protocol

Memory is structured into two complementary layers:
1. **Raw Session Log Stream**: Append-only event history in `20-Session-Log/SESSION_LOG.md`.
2. **Distilled Synthesis (Wiki/Hubs)**: Compact, current-state-only knowledge pages in `10-Projects/<Project>/_<Project>-Hub.md` (~1 screen, pruned & overwritten) and `00-Director/` global notes.

## Partner Rules

1. **Auto-Loaded = Compact; Heavy = Linked**:
   - Only load Director files and the active project hub at session start. Link to detailed notes.
2. **Current State vs History**:
   - Hub = CURRENT STATE only. Overwrite as state changes.
   - Session Log = Append-only history with absolute dates (`YYYY-MM-DD`).
3. **Never Invent a Separate Memory Cubby**:
   - All agent memory auto-follows into `~/Hive` / `docs/hive/`. No stray `MEMORY.md` files.
4. **Wrap Ritual**:
   - End of work session: prepend summary to `SESSION_LOG.md`, promote gotchas into Director/Hub same session.
