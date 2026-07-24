# Growth — Stage Machine (Status Upgrades → Stairway)

**Date:** 2026-07-23  
**Status:** Approved design (spec review pending)  
**Replaces UI surface:** Case Map (`CaseBoard`)  
**Related:** Case Map primer packages (`2026-07-21-case-map-primer-packages-design.md`), brand kit (gunmetal / silver / champagne), mock: `docs/design/growth-preview.html`

---

## Problem

Case Map dumps the full package catalog and every step at once. It reads as intimidating procedure before the user understands what the surface is for. The product need is a **procedural prep / goal path** — low sensory first, progressive reveal, personality that makes people stay long enough to meet the novel human/AI legal collaboration approaches.

## Goal

Rename and reshape the surface into **Growth**: a stage machine that invites curiosity, lets the user pick a **vehicle** (specific goal), then reveals a solemn **Stairway** climb (guided stepper) with clarity — not legal advice.

## Non-goals (v1)

- Mario-style overworld map
- Literal Freemasonry engraving / lodge branding
- Full upload/routing architecture
- Populating every possible vehicle under every area
- Changing Counsel / Private Confidant composer behavior

## Approach

**Stage machine (single Growth view).** Stages replace each other with deliberate dissolve/hand-off. Interaction patterns may reference folder / glass-tile / stepper components, but are restyled to the Arbiter brand (slow, metal, not cartoon).

## Information architecture

| Stage | Name | What the user sees | Job |
|-------|------|--------------------|-----|
| 0 | Landing | Two large folders: **Status Upgrades** + **Stairway** (quiet) | Invite |
| 1 | Areas | Cards = umbrella areas / departments | Orient |
| 2 | Vehicles | Glass tiles = specific Status Upgrade goals in that area | Pick a vehicle |
| 3 | Stairway | Soft-hybrid ascent; landings labeled for this climb | Quest has started |
| 4 | Climb | Counted stepper (Next / Previous) | Arrival |

**Nav label:** Case Map → **Growth**.

**Primary path:** Status Upgrades. Stairway folder on landing is visible for symmetry/symbol; early open shows a tease only (“Choose a Status Upgrade to begin the climb”) — no empty stepper until a vehicle is selected.

**Back:** Every stage has an obvious Back that restores the previous stage.

## Hierarchy (names)

- **Growth** — sidebar / surface
- **Status Upgrades** — folder; shelf of destinations that, when executed, are net-positive vehicles
- **Area cards** — umbrella disciplines (e.g. Contract Navigation)
- **Vehicles (glass tiles)** — specific goals inside a discipline (e.g. negotiating a contract at an automotive dealership)
- **Stairway** — post-vehicle path reveal + procedure climb (tasteful symbolism, de-signed — signs without costume)

## Motion and materials

- Folder open ~400–600ms ease; cards/tiles settle calmly
- Unselected peers **dissolve** (opacity + light blur/scale) when a card or vehicle is chosen
- Goal → Stairway: short solemn hand-off (fade + soft rise), no bounce
- Stepper: horizontal slide; progress markers in silver; champagne sparingly for complete/arrival
- Folders: large, gunmetal, silver rim
- Cards: sharp quiet panels (title + one-line outcome)
- Vehicles: glass/metal hybrid in silver/gunmetal — **no rainbow gradients**
- Stairway: dark field, luminous stair silhouette; engraving *atmosphere* + brand forms (soft hybrid)

## Data mapping (v1)

| Concept | Source |
|---------|--------|
| Area cards | Existing primer packages (`PrimerPackage`) |
| Vehicles | ≥1 primary goal per area (pack title/outcome). Expand via thin overlay map or future `goals[]` / `vehicles[]` on package. Contract Navigation–style multiples are the expansion pattern. |
| Stairway landings + stepper steps | Package `steps[]` in `order` |
| Step content | Existing step fields: title, lines, forms, speed_bumps, flags, epistemic, delivery |

**Schema:** Prefer additive later (`goals[]` under package). Do not block UI on a full schema migration; a client-side overlay map is acceptable for v1 extras.

**Voice:** Clarity and direction. Speed bumps (not “traps” in UI). Lexicon-highlighted form areas guide toward/away by application of clarity — **not legal advice**.

## Components (implementation shape)

- Replace Case Map nav + `CaseBoard` shell with Growth stage controller
- Brand-aligned Folder (large, slow), Area Card, Vehicle tile, Stairway reveal, Stepper climb
- Reuse package list/fetch APIs already used by Case Map (`listPackages` / package by id)
- Preserve test IDs where practical; add Growth-specific `data-testid`s for stages
- Mock reference: `docs/design/growth-preview.html` (click order is canonical)

## Error handling

- Package load failure: calm error on Areas stage (same spirit as current Case Map error)
- Missing vehicle overlay: fall back to single primary vehicle from package outcome
- Empty steps: do not enter Climb; show calm empty on Stairway

## Testing

- Stage transitions: 0→1→2→3→4 and Back at each step
- Dissolve only unselected peers; selection persists into next stage
- Stairway tease does not start Climb
- Stepper cannot skip required Next path (indicators may allow revisit of prior steps only if product later opts in; v1 default matches mock: sequential Next/Previous)
- Nav shows **Growth**; Case Map label removed

## Success criteria

- Opening Growth is not intimidating: landing is two folders only
- User can explain the funnel: area → vehicle → stairway → climb
- Existing primer package content remains reachable through the climb
- Visual personality is present without cartoon chrome or costume symbolism

---

## Decisions locked in brainstorming

1. Surface name: **Growth** (curiosity over jargon)
2. Approach: stage machine
3. Vehicles are first-class after area cards (glass tiles)
4. Stairway appears after vehicle selection (soft hybrid reveal)
5. Click-through mock order approved as canonical
