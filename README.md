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
| `draft_verified_form` | Generates validated legal forms (Promissory Notes, Security Agreements, etc.) |

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

## 🔧 De-Googled Setup

**Zero Google dependencies.** The AI provider is configurable.

### Prerequisites
- Node.js 18+
- An API key for your preferred provider

### Quick Start

```bash
# 1. Install
npm install

# 2. Configure your AI provider
cp .env.example .env.local

# 3. Edit .env.local with your provider details:
#    OPENAI_API_KEY=sk-...           # OpenAI
#    AI_BASE_URL=http://localhost:11434/v1  # Ollama
#    AI_MODEL=gpt-4o                 # or llama3, mistral, etc.

# 4. Run
npm run dev
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | Your API key (works with any OpenAI-compatible provider) |
| `AI_BASE_URL` | `https://api.openai.com/v1` | API endpoint. Change for Ollama, OpenRouter, etc. |
| `AI_MODEL` | `gpt-4o` | Primary model for legal counsel |
| `AI_SHADOW_MODEL` | Same as `AI_MODEL` | Heavy model for Shadow Counsel mode |
| `AI_CRITIC_MODEL` | Same as `AI_MODEL` | Model for the compliance auditor |

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

## 📁 Project Structure

```
arbiterOS-legal-confidant/
├── App.tsx                    # Main router + night mode + mahogany UI
├── index.html                 # HTML root with gold selection highlights
├── index.tsx                  # React entry
├── types.ts                   # Core TypeScript types
├── schemas/
│   └── legalSchemas.ts        # Zod schemas (the chastity belt)
├── services/
│   ├── aiProvider.ts          # De-Googled, provider-agnostic AI service
│   ├── legalEngine.ts         # Verifiable law database + validation
│   └── audio.ts               # TTS audio processing
├── components/
│   ├── LegalAdvisor.tsx       # Main chat (mahogany + large bar)
│   ├── EvidenceBoard.tsx      # Visual whiteboard for case building
│   ├── Library.tsx            # Legal reference storage
│   ├── CaseBoard.tsx          # Kanban case management
│   ├── ImageGen.tsx           # Legal concept visualizer
│   ├── AuditLog.tsx           # Governance ledger + telemetry
│   ├── ArbiterBadge.tsx       # Animated badge
│   └── ThemeToggle.tsx        # Theme toggle component
├── contexts/
│   └── AuditContext.tsx       # Audit state management
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
- **Zod** — Runtime schema validation (the real MVP)
- **Tailwind CSS** — Utility styling
- **Styled Components** — Component-scoped animations
- **Recharts** — Telemetry visualization
- **No Google SDK** — By choice

---

*"I don't give legal advice. I build cases. There's a difference, and if you can't see it, you probably need me."*

⚖️
