# Case Map Primer Packages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the freeform Case Map kanban with packet-first primer packages (schema, seeds for packs 1–4, authenticated API, Case Map UI) wired to Register line hooks and silence-first epistemic bands.

**Architecture:** Zod contracts in `schemas/legalSchemas.ts`; seed JSON under `backend/core/legal/seeds/packages/`; loader + Fastify routes mirroring the Register module pattern; React `CaseBoard` becomes a package picker + step checklist. Evidence stays in the codebase but is no longer a peer workflow twin — Case Map owns procedure.

**Tech Stack:** TypeScript, Zod, Fastify, Vitest, React 19, existing `apiFetch` / `requireSession` patterns

## Global Constraints

- Product voice: Private Confidant — clarity, patience, silence-first; never notebook “flower / adversary” copy in UI or seed titles.
- Epistemic bands: `settled` | `institutional` | `contested` | `perilous`.
- Gate rule: inventory/explain `contested` with caveats; surface `perilous` as flags only — never as recommended playbooks.
- v1 ship packs only: `transition_essentials`, `securities_control`, `proper_debt_discharge`, `contract_navigation`.
- No vector / heat-map work in this plan (v2).
- No coaching of contested responsible-party / commercial-redemption fills as default procedure.
- TypeScript strict; no `any` in new files (cast Fastify decorations like existing modules if required).
- TDD: failing test first for each behavior task.
- Tests: `bun run test:unit` (Vitest).

## File Structure

| Path | Responsibility |
|------|----------------|
| `schemas/legalSchemas.ts` | Zod: `EpistemicBandSchema`, `PackageFormRefSchema`, `PackageLineSchema`, `PackageStepSchema`, `PrimerPackageSchema` |
| `backend/core/legal/seeds/packages/*.json` | One seed file per v1 pack |
| `backend/core/legal/seeds/packages/index.json` | Manifest listing package_ids + titles for catalog |
| `backend/core/legal/primerPackages.ts` | Load/validate seeds; list/get; test reset helper |
| `backend/modules/packages/routes.ts` | `GET /api/packages`, `GET /api/packages/:id` (session required) |
| `backend/app.ts` | Register package routes |
| `backend/tests/packages.test.ts` | Auth + catalog + band rules |
| `backend/core/legal/primerPackages.test.ts` | Loader / schema validation |
| `services/packagesClient.ts` | Frontend API client |
| `components/CaseBoard.tsx` | Replace kanban with package UI |
| `App.tsx` | Optional: soften Evidence nav label/order only if needed; keep route |

---

### Task 1: Zod package contracts

**Files:**
- Modify: `schemas/legalSchemas.ts` (append after Register section, before InterpretationLink or at end of form/document block — prefer after `RegisterProposal` schemas ~line 470)
- Test: `backend/core/legal/primerPackages.test.ts` (create; schema-only tests first)

**Interfaces:**
- Produces: `EpistemicBandSchema`, `PrimerPackageSchema`, types `EpistemicBand`, `PrimerPackage`, `PackageStep`

- [ ] **Step 1: Write the failing schema test**

Create `backend/core/legal/primerPackages.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PrimerPackageSchema } from '../../../schemas/legalSchemas';

describe('PrimerPackageSchema', () => {
  it('accepts a minimal valid package', () => {
    const parsed = PrimerPackageSchema.safeParse({
      package_id: 'transition_essentials',
      title: 'Transition Essentials',
      outcome: 'Sign and file without collapsing principal into debtor.',
      course_kind: 'primer',
      vector_ready: false,
      steps: [
        {
          id: 'te-1',
          title: 'Agent signature practice',
          order: 1,
          forms: [],
          lines: [
            {
              line_id: 'ucc-3-402-agent',
              text: 'Signature must show unambiguously that it is made on behalf of the represented person.',
              register_ref: 'signature_agency',
            },
          ],
          speed_bumps: ['Signing the ALL-CAPS name without agency capacity'],
          flags: [],
          epistemic: 'settled',
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects unknown epistemic band', () => {
    const parsed = PrimerPackageSchema.safeParse({
      package_id: 'x',
      title: 'X',
      outcome: 'o',
      course_kind: 'primer',
      vector_ready: false,
      steps: [
        {
          id: '1',
          title: 't',
          order: 1,
          forms: [],
          lines: [],
          speed_bumps: [],
          flags: [],
          epistemic: 'mythic',
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- backend/core/legal/primerPackages.test.ts`  
Expected: FAIL — `PrimerPackageSchema` not exported / not defined

- [ ] **Step 3: Add schemas to `schemas/legalSchemas.ts`**

```ts
export const EpistemicBandSchema = z.enum(['settled', 'institutional', 'contested', 'perilous']);
export type EpistemicBand = z.infer<typeof EpistemicBandSchema>;

export const PackageFormRefSchema = z.object({
  form_id: z.string().min(1),
  title: z.string().min(1),
  official_url: z.string().url().optional(),
  sensitivity: z.enum(['common', 'sparse', 'sensitive']).optional(),
}).strict();

export const PackageLineSchema = z.object({
  line_id: z.string().min(1),
  text: z.string().min(1),
  register_ref: z.string().optional(),
}).strict();

export const PackageStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  order: z.number().int().nonnegative(),
  forms: z.array(PackageFormRefSchema).default([]),
  lines: z.array(PackageLineSchema).default([]),
  evidence_hooks: z.array(z.object({
    kind: z.string().min(1),
    ref: z.string().min(1),
  }).strict()).optional(),
  speed_bumps: z.array(z.string()).default([]),
  flags: z.array(z.string()).default([]),
  epistemic: EpistemicBandSchema,
  delivery: z.object({
    method: z.string().optional(),
    destination: z.string().optional(),
  }).strict().optional(),
}).strict();

export const PrimerPackageSchema = z.object({
  package_id: z.string().min(1),
  title: z.string().min(1),
  outcome: z.string().min(1),
  course_kind: z.enum(['primer', 'advanced']),
  steps: z.array(PackageStepSchema).min(1),
  source_notebooks: z.array(z.string()).optional(),
  vector_ready: z.boolean().default(false),
}).strict();
export type PrimerPackage = z.infer<typeof PrimerPackageSchema>;
export type PackageStep = z.infer<typeof PackageStepSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit -- backend/core/legal/primerPackages.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add schemas/legalSchemas.ts backend/core/legal/primerPackages.test.ts
git commit -m "feat(packages): add PrimerPackage Zod contracts"
```

---

### Task 2: Seed JSON for packs 1–4 + loader

**Files:**
- Create: `backend/core/legal/seeds/packages/index.json`
- Create: `backend/core/legal/seeds/packages/transition_essentials.json`
- Create: `backend/core/legal/seeds/packages/securities_control.json`
- Create: `backend/core/legal/seeds/packages/proper_debt_discharge.json`
- Create: `backend/core/legal/seeds/packages/contract_navigation.json`
- Create: `backend/core/legal/primerPackages.ts`
- Modify: `backend/core/legal/primerPackages.test.ts`
- Modify: `backend/config.ts` — add `PRIMER_PACKAGES_DIR` default `backend/core/legal/seeds/packages`

**Interfaces:**
- Consumes: `PrimerPackageSchema`, `getConfig()`
- Produces: `listPrimerPackages(): PrimerPackage[]`, `getPrimerPackage(id: string): PrimerPackage`, `__resetPrimerPackagesCacheForTests()`

- [ ] **Step 1: Extend failing tests for loader**

Append to `primerPackages.test.ts`:

```ts
import { listPrimerPackages, getPrimerPackage, __resetPrimerPackagesCacheForTests } from './primerPackages';

describe('primerPackages loader', () => {
  beforeEach(() => {
    __resetPrimerPackagesCacheForTests();
  });

  it('lists the four v1 primer package_ids', () => {
    const ids = listPrimerPackages().map((p) => p.package_id).sort();
    expect(ids).toEqual([
      'contract_navigation',
      'proper_debt_discharge',
      'securities_control',
      'transition_essentials',
    ]);
  });

  it('loads transition_essentials with a settled signature step', () => {
    const pack = getPrimerPackage('transition_essentials');
    expect(pack.title).toBe('Transition Essentials');
    expect(pack.steps.some((s) => s.epistemic === 'settled' && s.lines.length > 0)).toBe(true);
  });

  it('marks commercial-redemption coaching steps as perilous or contested on debt discharge', () => {
    const pack = getPrimerPackage('proper_debt_discharge');
    const tagged = pack.steps.filter((s) => s.epistemic === 'perilous' || s.epistemic === 'contested');
    expect(tagged.length).toBeGreaterThan(0);
    expect(tagged.every((s) => s.flags.length > 0 || s.speed_bumps.length > 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL** (module missing)

Run: `bun run test:unit -- backend/core/legal/primerPackages.test.ts`

- [ ] **Step 3: Write seed files**

`index.json`:

```json
{
  "packages": [
    { "package_id": "transition_essentials", "file": "transition_essentials.json" },
    { "package_id": "securities_control", "file": "securities_control.json" },
    { "package_id": "proper_debt_discharge", "file": "proper_debt_discharge.json" },
    { "package_id": "contract_navigation", "file": "contract_navigation.json" }
  ]
}
```

Each pack JSON must pass `PrimerPackageSchema`. Minimum content rules:

**transition_essentials.json** — ≥3 steps including:
1. Agent signature (settled) — UCC 3-402 line text from schema test  
2. FOIA/ledger habit (institutional)  
3. Records inventory: SSN/EIN/addresses (institutional)

**securities_control.json** — ≥3 steps:
1. Identify instrument type (settled)  
2. Indorsement / without-recourse vocabulary (settled UCC mechanics)  
3. Contested “instrument discharge of public debt” leap (perilous) with flag citing IRM frivolous / fictitious instrument risk — inventory only

**proper_debt_discharge.json** — ≥4 steps:
1. Payoff (settled)  
2. Settlement / hardship (institutional)  
3. Dispute / validation (settled/institutional)  
4. Contested commercial-redemption theories (contested or perilous) + flags — no recommended playbook language

**contract_navigation.json** — ≥4 steps:
1. Identify parties (settled)  
2. Obligations & consideration (settled)  
3. Default / notice / cure (institutional)  
4. Remedies & filing hooks (institutional)

Use calm, neutral titles. No “sovereign / adversary / liberate” wording.

- [ ] **Step 4: Implement `primerPackages.ts`**

```ts
import fs from 'node:fs';
import path from 'node:path';
import { PrimerPackageSchema, type PrimerPackage } from '../../../schemas/legalSchemas';
import { getConfig } from '../../config';

type Manifest = { packages: Array<{ package_id: string; file: string }> };

let cache: PrimerPackage[] | null = null;

export function __resetPrimerPackagesCacheForTests() {
  cache = null;
}

function resolvePackagesDir(): string {
  const configured = getConfig().PRIMER_PACKAGES_DIR;
  return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
}

export function listPrimerPackages(): PrimerPackage[] {
  if (cache) return cache;
  const dir = resolvePackagesDir();
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8')) as Manifest;
  cache = manifest.packages.map((entry) => {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, entry.file), 'utf8'));
    return PrimerPackageSchema.parse(raw);
  });
  return cache;
}

export function getPrimerPackage(packageId: string): PrimerPackage {
  const found = listPrimerPackages().find((p) => p.package_id === packageId);
  if (!found) {
    throw new Error(`Primer package not found: ${packageId}`);
  }
  return found;
}
```

Add to `ConfigSchema` in `backend/config.ts`:

```ts
PRIMER_PACKAGES_DIR: z.string().default('backend/core/legal/seeds/packages'),
```

- [ ] **Step 5: Run tests — expect PASS**

Run: `bun run test:unit -- backend/core/legal/primerPackages.test.ts`

- [ ] **Step 6: Commit**

```bash
git add backend/config.ts backend/core/legal/primerPackages.ts backend/core/legal/primerPackages.test.ts backend/core/legal/seeds/packages
git commit -m "feat(packages): seed four primer packs and loader"
```

---

### Task 3: Authenticated package API routes

**Files:**
- Create: `backend/modules/packages/routes.ts`
- Modify: `backend/app.ts`
- Create: `backend/tests/packages.test.ts`

**Interfaces:**
- Consumes: `listPrimerPackages`, `getPrimerPackage`, `requireSession`
- Produces: `GET /api/packages` → `{ packages: PrimerPackage[] }`; `GET /api/packages/:id` → `PrimerPackage`

- [ ] **Step 1: Write failing route tests**

```ts
import argon2 from 'argon2';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';

const originalEnv = {
  ARBITER_DB_PATH: process.env.ARBITER_DB_PATH,
  ARBITER_SESSION_SECRET: process.env.ARBITER_SESSION_SECRET,
  ARBITER_SESSION_COOKIE: process.env.ARBITER_SESSION_COOKIE,
};

beforeEach(() => {
  process.env.ARBITER_DB_PATH = ':memory:';
  process.env.ARBITER_SESSION_SECRET = 'test-session-secret-12345';
  process.env.ARBITER_SESSION_COOKIE = 'arbiter_session';
});

afterEach(() => {
  process.env.ARBITER_DB_PATH = originalEnv.ARBITER_DB_PATH;
  process.env.ARBITER_SESSION_SECRET = originalEnv.ARBITER_SESSION_SECRET;
  process.env.ARBITER_SESSION_COOKIE = originalEnv.ARBITER_SESSION_COOKIE;
});

function readSessionCookie(setCookieHeader: string | string[] | undefined) {
  const headerValue = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  if (!headerValue) throw new Error('missing session cookie');
  return headerValue.split(';')[0];
}

async function login(app: Awaited<ReturnType<typeof createApp>>) {
  const passwordHash = await argon2.hash('secret-passphrase');
  (app as any).userRepository.insert({
    id: 'user-admin',
    username: 'admin',
    password_hash: passwordHash,
    role: 'admin',
    created_at: new Date().toISOString(),
    last_login_at: null,
    disabled_at: null,
  });
  const login = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username: 'admin', password: 'secret-passphrase' },
  });
  return readSessionCookie(login.headers['set-cookie']).split('=')[1];
}

describe('packages routes', () => {
  it('rejects unauthenticated catalog access', async () => {
    const app = await createApp();
    const response = await app.inject({ method: 'GET', url: '/api/packages' });
    expect(response.statusCode).toBe(401);
  });

  it('returns primer catalog for authenticated user', async () => {
    const app = await createApp();
    const token = await login(app);
    const response = await app.inject({
      method: 'GET',
      url: '/api/packages',
      cookies: { arbiter_session: token },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { packages: Array<{ package_id: string }> };
    expect(body.packages.map((p) => p.package_id)).toContain('contract_navigation');
  });

  it('returns 404 for unknown package id when authenticated', async () => {
    const app = await createApp();
    const token = await login(app);
    const response = await app.inject({
      method: 'GET',
      url: '/api/packages/does_not_exist',
      cookies: { arbiter_session: token },
    });
    expect(response.statusCode).toBe(404);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (404/401 wrong or route missing)

Run: `bun run test:unit -- backend/tests/packages.test.ts`

- [ ] **Step 3: Implement routes and register**

`backend/modules/packages/routes.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { getPrimerPackage, listPrimerPackages } from '../../core/legal/primerPackages';

export async function registerPackageRoutes(app: FastifyInstance) {
  app.get('/api/packages', async (request) => {
    await (app as any).requireSession(request);
    return { packages: listPrimerPackages() };
  });

  app.get('/api/packages/:id', async (request, reply) => {
    await (app as any).requireSession(request);
    const { id } = request.params as { id: string };
    try {
      return getPrimerPackage(id);
    } catch (error) {
      return reply.code(404).send({
        message: error instanceof Error ? error.message : 'Package not found',
      });
    }
  });
}
```

In `backend/app.ts`, after register routes:

```ts
import { registerPackageRoutes } from './modules/packages/routes';
// ...
await registerPackageRoutes(app);
```

- [ ] **Step 4: Run — expect PASS**

Run: `bun run test:unit -- backend/tests/packages.test.ts backend/core/legal/primerPackages.test.ts`

- [ ] **Step 5: Commit**

```bash
git add backend/modules/packages/routes.ts backend/app.ts backend/tests/packages.test.ts
git commit -m "feat(packages): add authenticated primer package API"
```

---

### Task 4: Frontend client + Case Map UI

**Files:**
- Create: `services/packagesClient.ts`
- Modify: `components/CaseBoard.tsx` (replace kanban implementation)
- Test: prefer a small vitest-free smoke via existing patterns; if no component test harness, add `backend/tests` only and manual checklist — **also** add a pure helper test if you extract `sortSteps(steps)`:

Optional extract in `components/caseMap/sortPackageSteps.ts` for testability.

**Interfaces:**
- Consumes: `GET /api/packages`, `GET /api/packages/:id` via `apiFetch`
- Produces: Case Map UI showing catalog → selected pack → ordered steps with epistemic badge, lines, forms, speed_bumps, flags

- [ ] **Step 1: Create client**

```ts
import type { PrimerPackage } from '../schemas/legalSchemas';
import { apiFetch } from './localApiClient';

export async function listPackages(): Promise<PrimerPackage[]> {
  const payload = await apiFetch<{ packages: PrimerPackage[] }>('/api/packages');
  return payload.packages;
}

export async function getPackage(packageId: string): Promise<PrimerPackage> {
  return apiFetch<PrimerPackage>(`/api/packages/${encodeURIComponent(packageId)}`);
}
```

- [ ] **Step 2: Rewrite `CaseBoard.tsx`**

Replace kanban with:

1. Header: “Case Map” / subtitle: “Primer packages — procedural goals”
2. Left or top: list of packages from `listPackages()` (title + outcome one-liner)
3. On select: load pack (already in list payload — use list data; no second fetch required unless you prefer get-by-id)
4. Render steps sorted by `order`:
   - title
   - epistemic badge (settled=neutral, institutional=muted, contested=amber caution, perilous=red “flag — not a playbook”)
   - lines as monospace / register-style quotes
   - forms as links if `official_url`
   - speed_bumps and flags as separate lists
5. Local checkbox state per step id in `useState<Record<string, boolean>>` (progress only; no backend persistence yet — YAGNI)
6. `data-testid="view-case-board"`, `data-testid="heading-case-board"`, `data-testid="package-card-<id>"`, `data-testid="package-step-<id>"`

Do not use flower/persona copy. For perilous steps, UI text must include: “Flagged — inventory only, not a recommended playbook.”

- [ ] **Step 3: Manual smoke**

Run backend + frontend:
```bash
bun run dev:backend
# separate terminal
bun run dev
```
Login → Case Map → open each of 4 packs → confirm steps and perilous wording.

- [ ] **Step 4: Run full unit suite**

Run: `bun run test:unit`  
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add services/packagesClient.ts components/CaseBoard.tsx
git commit -m "feat(case-map): render primer packages instead of kanban"
```

---

### Task 5: Spec status + light nav hygiene

**Files:**
- Modify: `docs/superpowers/specs/2026-07-21-case-map-primer-packages-design.md` — set Status to `Implemented (v1 schema + Case Map UI)`
- Modify: `docs/ui-inventory.md` — update Case Map description from kanban to packet-first
- Modify: `App.tsx` only if needed: keep Evidence nav; optionally move Case Map above Evidence (packet over whiteboard). Do **not** remove Evidence in this task.

- [ ] **Step 1: Update docs**

Case Map blurb: “Packet-first primer packages (transition procedure courses).”

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-07-21-case-map-primer-packages-design.md docs/ui-inventory.md App.tsx
git commit -m "docs: mark primer packages v1 implemented in inventory"
```

---

## Spec coverage check

| Spec requirement | Task |
|------------------|------|
| Zod package schema | Task 1 |
| Packs 1–4 seeds + loader | Task 2 |
| Epistemic bands + perilous flags in seeds | Task 2 |
| Authenticated API | Task 3 |
| Case Map UI = package picker + steps | Task 4 |
| Register line hooks field | Task 1–2 (`register_ref` / lines) |
| Silence-first / no perilous coaching in UI | Task 4 copy |
| Documentation spine full ingest/produce | Deferred (non-goal for this plan; produce already exists) |
| v2 vectors / heat map | Out of scope |
| Packs 5–6 (property tax, IRS intimacy) | Out of scope — next plan |
| Evidence demotion as full removal | Out of scope — hygiene only in Task 5 |

## Placeholder scan

No TBD steps. Seed content must be written fully in Task 2 (engineer fills concrete JSON meeting the minimum rules above).

---

**Plan complete and saved to `docs/superpowers/plans/2026-07-21-case-map-primer-packages.md`.**

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
