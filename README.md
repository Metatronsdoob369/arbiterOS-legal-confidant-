# ⚖️ ArbiterOS — Legal Confidant

### *The lawyer you wish you had. The chatbot they're afraid you'll build.*

> "I don't interpret law. I retrieve it, validate it, and serve it to you on a silver platter with a side of contempt for whoever wrote the contract you're about to shred."

---

## 🎭 What Is This?

ArbiterOS is a **contract-first legal case-building tool** that combines the dry wit of Sterling Archer with the ruthless precision of Billy McBride from *Goliath*.

It is **not** another "I'm not a lawyer" chatbot that regurgitates disclaimers while telling you nothing useful. It's a **legal weapon** — one that reads law through **Zod schemas** (not vibes), builds cases on an **evidence whiteboard**, and stores your ammunition in a **legal library**.

The AI doesn't interpret law. It can't. We put a chastity belt on it — typed contracts validated with Zod that define exactly what the AI reads and what it's allowed to say. If it ain't in the schema, it ain't real.

**Contracts > Prompts.** That's not a tagline. That's the architecture.

---

## 🏗️ Architecture DNA

This project carries the DNA of [Domicile](https://github.com/Metatronsdoob369/Domicile) and [Open Model Contracts](https://github.com/Metatronsdoob369/open-model-contracts):

- **Contract-First**: Every AI interaction is governed by a Zod schema, not a prayer.
- **Provider-Agnostic**: No Google. No surveillance. Works with OpenAI, Ollama, OpenRouter, or any OpenAI-compatible API. De-Googled by design.
- **Verifiable Law**: The `legalEngine.ts` is a hardcoded law database (the "Chastity Belt") — UCC, IRC, FTC rules. The AI reads structured data, not vibes.
- **Heuristic, Not Hallucinatory**: Risk analysis uses pattern matching against actual statute, not "I think this might be problematic."

---

## 🎨 The Aesthetic

Forget your minimalist SaaS dashboards. This is **mahogany and leather and gold**.

- **Mahogany sidebar** with brass fixtures
- **Leather-pad chat bar** — oversized, physical, heavy
- **Gold accents** everywhere — because if you're going to fight legal battles, you should look good doing it
- **Night Mode** 🪔 — Click the logo icon. A reading lamp lights up the chat box. Gold pull-string and all. It's an easter egg. You're welcome.
- **Brushed woodgrain textures** — because marble countertops and mahogany desks are where deals get done

---

## 🧰 Features

### 💬 Legal Counsel Chat
The main event. Ask it anything. Upload documents. Get clause-by-clause risk analysis with actual statute citations. The AI uses **6 verification tools** bound to the legal engine:

| Tool | What It Does |
|------|-------------|
| `verify_ordinary` | IRC 162(a) expense check by NAICS code |
| `verify_necessary` | Expense-to-revenue ratio analysis |
| `verify_negotiability` | UCC 3-104 negotiable instrument validation |
| `analyze_clause_risks` | USC/UCC/Common Law risk scanning |
| `consult_statute` | Retrieves raw statutory text from the Law Library |
| `draft_verified_form` | Generates validated legal forms (Promissory Notes, Security Agreements, etc.) via `/api/drafts` |
| `translate_register` | Private Register Mirror — echoes your wording, then maps plain English ↔ institutional/statutory senses (capacity, money/credit, lien vs UCC-1, payment vs discharge, Fed/Treasury ops) |
| `quick_register_research` | Clarify a term (case-aware, e.g. Minor vs minor) before proposing — pack hits, case_gap, propose_ready |
| `propose_register_entry` | Queues a lexicon amendment after research (human merge via `/api/register/proposals/:id/merge` — never silent-writes the live pack) |

### 📄 Local Word Export (SaaS-Free)
Drafting stays on the ArbiterOS backend — no OpenCase, Google Docs, or Word add-ins.

- Zod-contracted form templates (`FormGenerationSchema` discriminated union)
- Core commercial set: `nda`, `service_agreement`, `consulting_agreement`, `ip_assignment` (plus UCC instruments)
- R5 local validation stubs on commercial templates (CourtListener holdings deferred to spectral track)
- `POST /api/drafts/forms` — validate + render markdown draft
- `POST /api/drafts/export` — Word `.docx` only after validation passes
- `GET /api/drafts/:id/download` — authenticated artifact download
- Provenance slots reserved for upcoming spectral / CourtListener holdings

### 🔗 Evidence Board
A visual whiteboard for connecting the dots. Drag nodes around. Draw connections between evidence, witnesses, statutes, and arguments. Build your conspiracy — *ahem*, case — visually.

### 📚 The Library
Store quotes, law snippets, articles, books, papers. Pin the important stuff. Tag everything. Search it later when you need that one FTC citation you know you saved somewhere.

### 📋 Case Map (Kanban)
Organize your legal strategy with drag-and-drop columns: Discovery → Analysis → Drafting → Execution.

### 🗺️ Forensic Maps
Generate legal concept visualizations — Negotiability Flow, Corporate Veil, Security Interest, Chain of Title.

### 📊 Governance Ledger
Full audit trail with compliance scoring, telemetry charts, and jurisdiction controls.

---

## 🎨 Styling System

ArbiterOS uses a **local Tailwind CSS build pipeline** (no CDN). Styles are processed at build time via Vite + PostCSS.

Key files:
| File | Purpose |
|---|---|
| `tailwind.config.ts` | Extended theme: mahogany/leather/gold palette, Inter + Merriweather fonts, custom shadows/radii |
| `postcss.config.cjs` | PostCSS config wiring Tailwind + Autoprefixer |
| `src/styles/globals.css` | Tailwind directives + global body/font/selection/scrollbar/keyframe styles |
| `components/ui/` | Reusable Radix-based primitives: Button, IconButton, Card, Tooltip, Dialog, Spinner, Skeleton |

**Component utilities** (class merging):
- `clsx` + `tailwind-merge` via `components/ui/cn.ts`
- `class-variance-authority` for component variants

**Night Mode** is a unique overlay effect (not a full theme). It lives in:
- `contexts/NightModeContext.tsx` — React context + toggle hook
- `components/NightModeOverlay.tsx` — The lamp glow + pull-string overlay

---

## 🔧 Airgapped MVP Startup

**Zero Google dependencies.** The AI provider is configurable.

### Prerequisites
- Node.js 18+
- An API key for your preferred provider if you want live AI responses

### Quick Start

```bash
# 1. Install
npm install

# 2. Configure the local backend and provider env
cp .env.example .env

# 3. Load the env file into your shell
set -a
source .env
set +a

# 4. Seed the bootstrap admin
npm run seed:admin

# 5. Run the app
npm run dev
```

The backend listens on `http://localhost:4881` and the frontend runs on `http://localhost:4321`.

### Running E2E Tests

ArbiterOS uses [Playwright](https://playwright.dev/) for end-to-end tests.
Tests mock all AI/network calls, so **no API key is required**.

```bash
# Install Playwright browsers (first time only)
npx playwright install chromium

# Run the full e2e suite (starts the dev server automatically)
npm run test:e2e

# Run with the interactive Playwright UI
npm run test:e2e:ui

# Update visual snapshot baselines after intentional UI changes
npm run test:e2e:update-snapshots
```

The e2e config seeds the local admin account automatically before launch.

Test files live in the `e2e/` directory:
| File | What it covers |
|---|---|
| `e2e/smoke.spec.ts` | App loads · sidebar navigation · night-mode toggle |
| `e2e/visual.spec.ts` | Screenshot snapshots — desktop, mobile, night mode |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ARBITER_BACKEND_PORT` | `4881` | Local Fastify backend port |
| `ARBITER_DB_PATH` | `data/arbiter.db` | SQLite database file |
| `ARBITER_SESSION_COOKIE` | `arbiter_session` | Session cookie name |
| `ARBITER_SESSION_SECRET` | `replace-with-local-secret` | Backend cookie signing secret |
| `ARBITER_BOOTSTRAP_USERNAME` | `admin` | Local admin bootstrap username |
| `ARBITER_BOOTSTRAP_PASSWORD` | `secret-passphrase` | Local admin bootstrap password |
| `OPENAI_API_KEY` | — | Your API key (works with any OpenAI-compatible provider) |
| `AI_BASE_URL` | `https://api.openai.com/v1` | API endpoint. Change for Ollama, OpenRouter, etc. |
| `AI_MODEL` | `gpt-4o` | Primary model for legal counsel |
| `AI_SHADOW_MODEL` | Same as `AI_MODEL` | Heavy model for Shadow Counsel mode |
| `AI_CRITIC_MODEL` | Same as `AI_MODEL` | Model for the compliance auditor |
| `LAW_CORPUS_URL` / `VITE_LAW_CORPUS_URL` | `http://localhost:4880` | Optional law-corpus retrieval upstream (`WHITEGLOVE_URL` / `LAWLIBRA_URL` still accepted as aliases) |
| `VITE_QDRANT_URL` | `http://127.0.0.1:6333` | Local Qdrant endpoint for the CommonLawSpectralEngine |
| `VITE_COMMON_LAW_COLLECTION` | `case-law-holdings` | Local holdings collection name |
| `VITE_EMBED_ENDPOINT` | `http://127.0.0.1:4881/embed` | Local embed endpoint mounted on the ArbiterOS backend |
| `COMMON_LAW_QDRANT_URL` | `http://127.0.0.1:6333` | Backend Qdrant URL for holdings retrieval |
| `COMMON_LAW_COLLECTION` | `case-law-holdings` | Backend holdings collection name |
| `COMMON_LAW_VECTOR_SIZE` | `1024` | Embedding dimension used by the local common-law layer |
| `COMMON_LAW_AUTO_BOOTSTRAP` | `true` | Auto-seed the fallback holdings corpus when the collection is missing or empty |

### Provider Examples

```bash
# OpenAI
OPENAI_API_KEY=sk-...
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o

# Ollama (Local, truly private)
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=llama3.1

# OpenRouter (Multi-model)
OPENAI_API_KEY=sk-or-...
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=anthropic/claude-3.5-sonnet

# Together.ai
OPENAI_API_KEY=...
AI_BASE_URL=https://api.together.xyz/v1
AI_MODEL=meta-llama/Llama-3-70b-chat-hf
```

---

## 🧬 The Zod Schema Layer

The secret weapon. Every piece of legal data the AI touches is validated through Zod schemas in `schemas/legalSchemas.ts`:

- `ValidationStepSchema` — The atomic unit of proof
- `InstrumentTermsSchema` — UCC 3-104 instrument terms
- `ClauseAnalysisSchema` — Contract clause risk input
- `FormGenerationSchema` — Legal form generation parameters
- `AuditScoreSchema` — AI compliance scoring output
- `LibraryItemSchema` — Knowledge base entries
- `EvidenceNodeSchema` / `EvidenceConnectionSchema` — Evidence board graph

The AI gets structured data in, and structured data out. It doesn't get to "interpret" anything. That's the whole point.

---

## ⚖️ CommonLawSpectralEngine Local Setup

ArbiterOS now exposes the local CommonLawSpectralEngine directly from the backend:

- `POST http://127.0.0.1:4881/embed` — 1024-D local embed endpoint
- `GET /api/common-law/health` — collection health
- `POST /api/common-law/query` — holdings retrieval with interpretation links
- `POST /api/common-law/bootstrap` — create/seed the local fallback holdings collection

The local `/embed` path uses a fixed batch size of `8`. This is intentionally conservative and avoids dynamic batching so long-form opinions stay predictable on local hardware.

### Local bring-up

```bash
# 1. Verify Qdrant is reachable
curl -sS http://127.0.0.1:6333/collections

# 2. Bootstrap the holdings collection
npm run bootstrap:common-law

# 3. Start ArbiterOS
npm run dev
```

### Google Drive bootstrap

If you have a mounted Drive corpus, you can stream it directly into local Qdrant:

```bash
rclone mount gdrive: /mnt/gdrive --daemon
npm run bootstrap:caslaw-drive -- --drive-mount /mnt/gdrive/Caselaw --limit 5000
```

The Drive bootstrap supports `.parquet`, `.jsonl`, `.ndjson`, and `.json` inputs and normalizes non-numeric record IDs into deterministic Qdrant-safe UUIDs.

Topology mapping is not enabled yet. `backend/core/legal/commonLawEngine.ts` now exposes a `reduceToTopologyDim(embedding, targetDim = 8)` placeholder for the next phase, but current retrieval still operates on the full 1024-dimensional vectors.

### Browser / console checks

```js
await window.commonLawEngine.checkCollectionHealth()
await window.commonLawEngine.retrieveHoldings({
  query: 'negotiable instrument unconditional promise',
  statute: 'UCC 3-104',
})
```

If local Qdrant is down or the collection is empty, the engine falls back to a seeded in-memory holdings subset so retrieval still returns interpretation links and the validation gate can emit explicit failure steps instead of silently degrading.

---

## 📁 Project Structure

```
arbiterOS-legal-confidant/
├── App.tsx                    # Main router + night mode + mahogany UI
├── index.html                 # HTML root (no CDN scripts)
├── index.tsx                  # React entry — imports globals.css
├── tailwind.config.ts         # Design tokens: mahogany/leather/gold palette
├── postcss.config.cjs         # PostCSS wiring for Tailwind + Autoprefixer
├── types.ts                   # Core TypeScript types
├── src/
│   └── styles/
│       └── globals.css        # Tailwind directives + global body/scrollbar styles
├── schemas/
│   └── legalSchemas.ts        # Zod schemas (the chastity belt)
├── services/
│   ├── aiProvider.ts          # De-Googled, provider-agnostic AI service
│   ├── legalEngine.ts         # Verifiable law database + validation
│   └── audio.ts               # TTS audio processing
├── components/
│   ├── ui/                    # Reusable design system primitives
│   │   ├── Button.tsx         # Button with default/ghost/outline variants
│   │   ├── IconButton.tsx     # Icon-only button with gold/ghost variants
│   │   ├── Card.tsx           # Panel surface (default/elevated/flat)
│   │   ├── Tooltip.tsx        # Radix-based accessible tooltip
│   │   ├── Dialog.tsx         # Radix-based modal dialog
│   │   ├── Spinner.tsx        # Spinner + Skeleton loading states
│   │   ├── cn.ts              # clsx + tailwind-merge helper
│   │   └── index.ts           # Barrel export
│   ├── NavItem.tsx            # Sidebar nav button with active/inactive variants
│   ├── NightModeOverlay.tsx   # Reading-lamp overlay effect (not a theme switch)
│   ├── LegalAdvisor.tsx       # Main chat (mahogany + large bar)
│   ├── EvidenceBoard.tsx      # Visual whiteboard for case building
│   ├── Library.tsx            # Legal reference storage
│   ├── CaseBoard.tsx          # Kanban case management
│   ├── ImageGen.tsx           # Legal concept visualizer
│   ├── AuditLog.tsx           # Governance ledger + telemetry
│   └── ArbiterBadge.tsx       # Animated badge
├── contexts/
│   ├── AuditContext.tsx        # Audit state management
│   └── NightModeContext.tsx    # Night Mode toggle context + hook
└── LegalPackages/             # Extended legal schemas & auditor
```

---

## 🧠 Philosophy

> *"The future is not prompted; it is Contracted."*
> — Open Model Contracts

This isn't just another chatbot with a law skin. The entire architecture is built on a single principle: **AI should be a tool, not an oracle.** The moment you let an AI "interpret" law for a user, you've built a weapon for gaslighting the public.

ArbiterOS prevents that by design:
1. Law lives in a **verifiable database**, not in the model's training data
2. Every assertion is backed by a **tool call** to retrieve actual statute
3. **Zod schemas** define the shape of every input and output
4. The **Arbiter Critic** audits every response for compliance
5. The **Governance Ledger** creates an immutable record of every interaction

The AI has personality. It has wit. It does NOT have discretion over what the law says.

---

## 🌙 Easter Eggs

- **Night Mode**: Click the logo icon in the sidebar. A reading lamp with a gold pull-string lights up your chat. Because sometimes you need to read case law at 2 AM and you deserve ambiance.

---

## 🤝 Built With

- **React 19** + **TypeScript** — Because type safety is a legal requirement (in this codebase, anyway)
- **Vite** — Build tool
- **Tailwind CSS** (local build, no CDN) — Utility styling with mahogany/leather/gold design tokens
- **Radix UI** — Accessible headless primitives (Tooltip, Dialog, Tabs)
- **class-variance-authority** + **clsx** + **tailwind-merge** — Component variant system
- **Zod** — Runtime schema validation (the real MVP)
- **Styled Components** — Component-scoped animations (legacy; being phased out)
- **Recharts** — Telemetry visualization
- **No Google SDK** — By choice

---

*"I don't give legal advice. I build cases. There's a difference, and if you can't see it, you probably need me."*

⚖️
