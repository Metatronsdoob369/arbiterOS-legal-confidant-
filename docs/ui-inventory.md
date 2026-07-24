# ArbiterOS UI Inventory

> Phase 0 baseline — captured April 2026

---

## 1. Screens / Views

ArbiterOS is a **single-page app** with no client-side router.  
View switching is handled by a `View` enum in `App.tsx` via `useState`.

| View enum value | Sidebar label | Component file | `data-testid` (nav btn) | `data-testid` (container) |
|---|---|---|---|---|
| `advisor` | Counsel | `components/LegalAdvisor.tsx` | `nav-btn-advisor` | `view-advisor` |
| `case_board` | Growth | `components/CaseBoard.tsx` | `nav-btn-case_board` | `view-case_board` |
| `evidence` | Evidence | `components/EvidenceBoard.tsx` | `nav-btn-evidence` | `view-evidence` |
| `library` | Library | `components/Library.tsx` | `nav-btn-library` | `view-library` |
| `studio` | Forensics | `components/ImageGen.tsx` | `nav-btn-studio` | `view-studio` |
| `audit` | Ledger | `components/AuditLog.tsx` | `nav-btn-audit` | `view-audit` |

### Component responsibilities

| Component | Responsibility |
|---|---|
| `LegalAdvisor` | Main chat interface — sends legal queries, uploads documents, plays TTS audio, runs the Arbiter audit |
| `EvidenceBoard` | Interactive SVG canvas — drag/connect evidence nodes, witnesses, statutes, arguments |
| `Library` | Knowledge-base CRUD — store, pin, tag, and search legal references |
| `CaseBoard` | Growth stage machine — Status Upgrades → area cards → vehicle tiles → Stairway → counted climb; reuses primer package APIs |
| `ImageGen` | Legal concept visualizer — generates diagrams via the AI image API |
| `AuditLog` | Governance ledger — Recharts telemetry, compliance controls, full audit trail |
| `ArbiterBadge` | Animated status badge used inside `LegalAdvisor` |

---

## 2. Shell / Layout (`App.tsx`)

| Element | `data-testid` | Notes |
|---|---|---|
| Outermost app div | `app-root` | Full viewport flex container |
| Sidebar `<aside>` | `sidebar` | Mahogany panel; collapses to icon-only on mobile |
| Logo / night-mode button | `night-mode-toggle` | Click toggles reading-lamp overlay |
| Sidebar `<nav>` | `sidebar-nav` | Contains all six nav buttons |
| Nav buttons | `nav-btn-{view}` | One per view enum value (see table above) |
| View container `<div>` | `view-{currentView}` | Dynamic — reflects the active view key |

Each view component also exposes a root-level `data-testid`:

| Component root testid | Heading testid |
|---|---|
| `view-legal-advisor` | _(no top-level h2; uses ArbiterBadge)_ |
| `view-evidence-board` | `heading-evidence-board` |
| `view-library` | `heading-library` |
| `view-case-board` | `heading-case-board` |
| `view-image-gen` | `heading-image-gen` |
| `view-audit-log` | `heading-audit-log` |

---

## 3. High-level Data Flow

```
User action
    │
    ▼
Component (e.g. LegalAdvisor)
    │
    ├─► services/aiProvider.ts        — OpenAI-compatible API calls (chat, audit, image)
    │       └─► process.env.OPENAI_API_KEY / AI_BASE_URL / AI_MODEL (Vite define)
    │
    ├─► services/legalEngine.ts       — Hardcoded statute DB; no network call
    │       └─► returns ValidationStep[], InstrumentTerms, etc.
    │
    ├─► services/validationGate.ts    — Deterministic gate (pass/soften/block/repair)
    │       └─► no model calls; pure function on DraftResponse + GateInputState
    │
    ├─► services/audio.ts             — TTS decoding + AudioContext playback
    │
    └─► contexts/AuditContext.tsx     — Global audit log state (React Context + useState)
            └─► read by AuditLog, written by LegalAdvisor / ImageGen
```

**Schemas** (`schemas/legalSchemas.ts`): All AI I/O is validated through Zod schemas before use.  
**Types** (`types.ts`): Core shared types (`Message`, `Role`, `AuditEntry`, `ImageSize`).

---

## 4. Styling Approach Summary

| Mechanism | Where used | Notes |
|---|---|---|
| **Tailwind CSS (CDN)** | `index.html` `<script src="https://cdn.tailwindcss.com">` | Utility classes throughout all components |
| **Inline styles** | `App.tsx`, `LegalAdvisor.tsx`, `EvidenceBoard.tsx`, `Library.tsx` | Used heavily for brand colours (`#0d0806`, `#d4af37`, `#3d2b1f`) and gradients |
| **`styled-components`** | `ArbiterBadge.tsx` | Keyframe animations via `createGlobalStyle` / `styled` |
| **Google Fonts (CDN)** | `index.html` | Merriweather (headings) + Inter (body) |

### Colour tokens (informal)

| Token | Value | Usage |
|---|---|---|
| Dark background | `#0d0806` | App background |
| Mahogany sidebar | `#1e1410` / `#150d08` | Sidebar gradient |
| Gold accent | `#d4af37` | Nav active state, headings |
| Leather text | `#e8dcc8` | Default body text |
| Border | `#3d2b1f` | Sidebar/panel dividers |
| Muted text | `#8b7355` | Secondary labels |
