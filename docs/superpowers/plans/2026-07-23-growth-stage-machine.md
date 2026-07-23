# Growth Stage Machine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the noisy Case Map dump with the Growth stage machine (Status Upgrades → area cards → vehicle tiles → Stairway → counted climb) while keeping primer package APIs and step content.

**Architecture:** Pure stage/vehicle helpers under `components/growth/` drive a single `GrowthBoard` view. Existing `listPackages()` feeds area cards; a thin client-side vehicle overlay supplies ≥1 goal tile per area (Contract Navigation ships sample multiples). Presentational folder/card/tile/stair/stepper pieces use brand tokens and CSS motion only (no new animation libraries). Internal `View.CASE_BOARD` / `case_board` route key stays for e2e stability; user-facing copy becomes Growth.

**Tech Stack:** TypeScript, React 19, Vitest, Playwright, existing `packagesClient` / `PrimerPackage` schema, brand tokens in `components/brand/tokens.ts`

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-23-growth-stage-machine-design.md` — follow verbatim for stages, names, and non-goals.
- Mock order is canonical: `docs/design/growth-preview.html`.
- Voice: clarity / speed bumps — never “legal advice”; no notebook flower/adversary copy.
- Brand: gunmetal / silver / champagne; slow motion; no rainbow glass gradients; no cartoon bounce.
- No `framer-motion` / `motion` dependency in v1 — CSS transitions only.
- TypeScript strict; no `any` in new files.
- TDD: failing test first for pure logic; e2e updated for Growth chrome.
- Tests: `npm run test:unit` (Vitest); e2e: `npm run test:e2e` (Playwright).
- Do not migrate package JSON schema in v1 unless a task explicitly adds optional `goals[]` (prefer overlay map).

## File Structure

| Path | Responsibility |
|------|----------------|
| `components/growth/stages.ts` | Stage enum, transition helpers, back targets |
| `components/growth/vehicles.ts` | Vehicle overlay map + fallback from `PrimerPackage` |
| `components/growth/stages.test.ts` | Stage machine unit tests |
| `components/growth/vehicles.test.ts` | Vehicle resolution unit tests |
| `components/growth/GrowthFolder.tsx` | Large brand folder control |
| `components/growth/GrowthAreaCard.tsx` | Area (package) card |
| `components/growth/GrowthVehicleTile.tsx` | Glass/metal goal tile |
| `components/growth/GrowthStairway.tsx` | Soft-hybrid stair reveal + Begin |
| `components/growth/GrowthStepper.tsx` | Counted Next/Previous climb |
| `components/growth/GrowthBoard.tsx` | Stage controller + data load |
| `components/CaseBoard.tsx` | Re-export `GrowthBoard` (keep import path in `App.tsx`) |
| `App.tsx` | Nav label **Growth** (testid keys unchanged) |
| `e2e/smoke.spec.ts` | Heading/copy expectations for Growth |
| `docs/ui-inventory.md` | Case Map → Growth |
| `README.md` | Case Map section → Growth |

---

### Task 1: Stage machine helpers

**Files:**
- Create: `components/growth/stages.ts`
- Create: `components/growth/stages.test.ts`

**Interfaces:**
- Produces:
  - `export type GrowthStage = 0 | 1 | 2 | 3 | 4`
  - `export const GROWTH_STAGE_LABELS: Record<GrowthStage, string>`
  - `export function previousGrowthStage(stage: GrowthStage): GrowthStage | null`
  - `export function canEnterClimb(hasVehicle: boolean, stepCount: number): boolean`

- [ ] **Step 1: Write the failing test**

Create `components/growth/stages.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  GROWTH_STAGE_LABELS,
  canEnterClimb,
  previousGrowthStage,
  type GrowthStage,
} from './stages';

describe('previousGrowthStage', () => {
  it('returns null on landing', () => {
    expect(previousGrowthStage(0)).toBeNull();
  });

  it('walks back one stage at a time', () => {
    const path: GrowthStage[] = [4, 3, 2, 1, 0];
    for (let i = 0; i < path.length - 1; i += 1) {
      expect(previousGrowthStage(path[i]!)).toBe(path[i + 1]!);
    }
  });
});

describe('canEnterClimb', () => {
  it('requires a vehicle and at least one step', () => {
    expect(canEnterClimb(false, 3)).toBe(false);
    expect(canEnterClimb(true, 0)).toBe(false);
    expect(canEnterClimb(true, 2)).toBe(true);
  });
});

describe('GROWTH_STAGE_LABELS', () => {
  it('names the five stages for UI chrome', () => {
    expect(GROWTH_STAGE_LABELS[0]).toMatch(/Landing/i);
    expect(GROWTH_STAGE_LABELS[2]).toMatch(/Vehicle/i);
    expect(GROWTH_STAGE_LABELS[3]).toMatch(/Stairway/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- components/growth/stages.test.ts`

Expected: FAIL (module not found / exports missing)

- [ ] **Step 3: Write minimal implementation**

Create `components/growth/stages.ts`:

```ts
export type GrowthStage = 0 | 1 | 2 | 3 | 4;

export const GROWTH_STAGE_LABELS: Record<GrowthStage, string> = {
  0: 'Landing',
  1: 'Areas',
  2: 'Vehicles',
  3: 'Stairway',
  4: 'Climb',
};

export function previousGrowthStage(stage: GrowthStage): GrowthStage | null {
  if (stage === 0) return null;
  return (stage - 1) as GrowthStage;
}

export function canEnterClimb(hasVehicle: boolean, stepCount: number): boolean {
  return hasVehicle && stepCount > 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- components/growth/stages.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/growth/stages.ts components/growth/stages.test.ts
git commit -m "feat(growth): add stage machine helpers"
```

---

### Task 2: Vehicle overlay resolution

**Files:**
- Create: `components/growth/vehicles.ts`
- Create: `components/growth/vehicles.test.ts`

**Interfaces:**
- Consumes: `PrimerPackage` from `schemas/legalSchemas`
- Produces:
  - `export type GrowthVehicle = { id: string; label: string; areaId: string }`
  - `export function vehiclesForPackage(pkg: PrimerPackage): GrowthVehicle[]`

- [ ] **Step 1: Write the failing test**

Create `components/growth/vehicles.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { PrimerPackage } from '../../schemas/legalSchemas';
import { vehiclesForPackage } from './vehicles';

const basePackage = (package_id: string, title: string, outcome: string): PrimerPackage => ({
  package_id,
  title,
  outcome,
  course_kind: 'primer',
  vector_ready: false,
  steps: [
    {
      id: 's1',
      title: 'Step one',
      order: 1,
      forms: [],
      lines: [],
      speed_bumps: [],
      flags: [],
      epistemic: 'settled',
    },
  ],
});

describe('vehiclesForPackage', () => {
  it('returns Contract Navigation sample vehicles', () => {
    const vehicles = vehiclesForPackage(
      basePackage('contract_navigation', 'Contract Navigation', 'Read a contract in sequence.'),
    );
    expect(vehicles.length).toBeGreaterThanOrEqual(2);
    expect(vehicles.some((v) => /dealership|auto/i.test(v.label))).toBe(true);
    expect(vehicles.every((v) => v.areaId === 'contract_navigation')).toBe(true);
  });

  it('falls back to a single primary vehicle for unknown areas', () => {
    const vehicles = vehiclesForPackage(
      basePackage('transition_essentials', 'Transition Essentials', 'Organize identity and records.'),
    );
    expect(vehicles).toHaveLength(1);
    expect(vehicles[0]?.id).toBe('transition_essentials-primary');
    expect(vehicles[0]?.label).toContain('Transition Essentials');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- components/growth/vehicles.test.ts`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Create `components/growth/vehicles.ts`:

```ts
import type { PrimerPackage } from '../../schemas/legalSchemas';

export type GrowthVehicle = {
  id: string;
  label: string;
  areaId: string;
};

const OVERLAY: Record<string, Array<{ id: string; label: string }>> = {
  contract_navigation: [
    { id: 'cn-auto-dealer', label: 'Auto dealership negotiation' },
    { id: 'cn-service-msa', label: 'Service / MSA review' },
    { id: 'cn-lease-read', label: 'Lease walkthrough' },
    { id: 'cn-general', label: 'General contract sequence' },
  ],
};

export function vehiclesForPackage(pkg: PrimerPackage): GrowthVehicle[] {
  const overlay = OVERLAY[pkg.package_id];
  if (overlay && overlay.length > 0) {
    return overlay.map((item) => ({
      id: item.id,
      label: item.label,
      areaId: pkg.package_id,
    }));
  }

  return [
    {
      id: `${pkg.package_id}-primary`,
      label: `${pkg.title} — primary path`,
      areaId: pkg.package_id,
    },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- components/growth/vehicles.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/growth/vehicles.ts components/growth/vehicles.test.ts
git commit -m "feat(growth): resolve status-upgrade vehicles from overlay"
```

---

### Task 3: Presentational Growth chrome

**Files:**
- Create: `components/growth/GrowthFolder.tsx`
- Create: `components/growth/GrowthAreaCard.tsx`
- Create: `components/growth/GrowthVehicleTile.tsx`

**Interfaces:**
- Consumes: `brand` from `../brand/tokens`
- Produces: `GrowthFolder`, `GrowthAreaCard`, `GrowthVehicleTile` React components

- [ ] **Step 1: Write a smoke import test (failing until files exist)**

Create `components/growth/chrome.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('growth chrome modules', () => {
  it('exports folder, area card, and vehicle tile', async () => {
    const folder = await import('./GrowthFolder');
    const card = await import('./GrowthAreaCard');
    const tile = await import('./GrowthVehicleTile');
    expect(typeof folder.GrowthFolder).toBe('function');
    expect(typeof card.GrowthAreaCard).toBe('function');
    expect(typeof tile.GrowthVehicleTile).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- components/growth/chrome.test.ts`

Expected: FAIL (cannot find module)

- [ ] **Step 3: Implement the three components**

`GrowthFolder.tsx` — button with large gunmetal folder silhouette, props:

```ts
export type GrowthFolderProps = {
  title: string;
  subtitle: string;
  quiet?: boolean;
  onClick: () => void;
  'data-testid'?: string;
};
```

Visual: match mock (tab + front flap, hover lift ~6px, silver rim). Use `brand` tokens. `quiet` reduces opacity to ~0.55.

`GrowthAreaCard.tsx`:

```ts
export type GrowthAreaCardProps = {
  title: string;
  outcome: string;
  dissolving?: boolean;
  onClick: () => void;
  'data-testid'?: string;
};
```

`GrowthVehicleTile.tsx`:

```ts
export type GrowthVehicleTileProps = {
  label: string;
  dissolving?: boolean;
  onClick: () => void;
  'data-testid'?: string;
};
```

Glass tile: gunmetal edge + frosted silver face; label under tile; no colorful gradients. `dissolving` applies CSS class that fades/blurs/scales down (~520ms).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- components/growth/chrome.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/growth/GrowthFolder.tsx components/growth/GrowthAreaCard.tsx components/growth/GrowthVehicleTile.tsx components/growth/chrome.test.ts
git commit -m "feat(growth): add folder, area card, and vehicle tile chrome"
```

---

### Task 4: Stairway reveal + Stepper climb

**Files:**
- Create: `components/growth/GrowthStairway.tsx`
- Create: `components/growth/GrowthStepper.tsx`
- Modify: `components/growth/chrome.test.ts` (extend imports)

**Interfaces:**
- Consumes: `PackageStep` from schemas; `brand` tokens
- Produces: `GrowthStairway`, `GrowthStepper`

- [ ] **Step 1: Extend failing import assertions**

Add to `chrome.test.ts`:

```ts
  it('exports stairway and stepper', async () => {
    const stair = await import('./GrowthStairway');
    const stepper = await import('./GrowthStepper');
    expect(typeof stair.GrowthStairway).toBe('function');
    expect(typeof stepper.GrowthStepper).toBe('function');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- components/growth/chrome.test.ts`

Expected: FAIL on new imports

- [ ] **Step 3: Implement Stairway + Stepper**

`GrowthStairway.tsx` props:

```ts
export type GrowthStairwayProps = {
  goalLabel: string;
  steps: Array<{ id: string; title: string; order: number }>;
  onBegin: () => void;
};
```

- Dark field, luminous landings labeled from step titles (shortened if needed)
- Soft champagne glow near top
- Primary button “Begin the climb” → `onBegin`
- Root `data-testid="growth-stairway"`

`GrowthStepper.tsx` props:

```ts
export type GrowthStepperProps = {
  steps: PackageStep[];
  currentIndex: number;
  onBack: () => void;
  onNext: () => void;
};
```

- Dot indicators + connectors (silver active, champagne complete)
- Body: step title, first register line text if present, speed bump callout if present
- Footer: Previous (hidden/disabled on index 0), Next (label “Arrival” on last step)
- Root `data-testid="growth-stepper"`
- No green filled CTA — silver border gunmetal button

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- components/growth/chrome.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/growth/GrowthStairway.tsx components/growth/GrowthStepper.tsx components/growth/chrome.test.ts
git commit -m "feat(growth): add stairway reveal and counted stepper"
```

---

### Task 5: GrowthBoard stage controller

**Files:**
- Create: `components/growth/GrowthBoard.tsx`
- Create: `components/growth/GrowthBoard.test.ts` (pure selection helpers if extracted; otherwise behavioral notes via e2e in Task 7)
- Modify: `components/CaseBoard.tsx` to re-export GrowthBoard

**Interfaces:**
- Consumes: `listPackages`, `vehiclesForPackage`, stage helpers, chrome components
- Produces: `GrowthBoard` default export used as Case Map view

- [ ] **Step 1: Write failing test for step sort helper used by board**

Add to `components/growth/stages.test.ts` (or new `GrowthBoard` helper file):

If sorting lives in board, extract:

```ts
// components/growth/sortSteps.ts
import type { PackageStep } from '../../schemas/legalSchemas';

export function sortPackageSteps(steps: PackageStep[]): PackageStep[] {
  return [...steps].sort((a, b) => a.order - b.order);
}
```

Test:

```ts
import { describe, expect, it } from 'vitest';
import { sortPackageSteps } from './sortSteps';

describe('sortPackageSteps', () => {
  it('orders by order ascending without mutating input', () => {
    const input = [
      { id: 'b', title: 'B', order: 2, forms: [], lines: [], speed_bumps: [], flags: [], epistemic: 'settled' as const },
      { id: 'a', title: 'A', order: 1, forms: [], lines: [], speed_bumps: [], flags: [], epistemic: 'settled' as const },
    ];
    const sorted = sortPackageSteps(input);
    expect(sorted.map((s) => s.id)).toEqual(['a', 'b']);
    expect(input[0]?.id).toBe('b');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- components/growth/sortSteps.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement sortSteps + GrowthBoard**

`GrowthBoard.tsx` state:

```ts
const [stage, setStage] = useState<GrowthStage>(0);
const [packages, setPackages] = useState<PrimerPackage[]>([]);
const [error, setError] = useState<string | null>(null);
const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
const [selectedVehicle, setSelectedVehicle] = useState<GrowthVehicle | null>(null);
const [stepIndex, setStepIndex] = useState(0);
const [dissolvingIds, setDissolvingIds] = useState<string[]>([]);
```

Behavior:
- Mount: `listPackages()` → set packages / error
- Stage 0: two `GrowthFolder`s — Status Upgrades → stage 1; Stairway quiet → set lede/tease text only (do not advance)
- Stage 1: map packages to `GrowthAreaCard`; on click set dissolving peers ~480ms then `selectedPackageId` + stage 2
- Stage 2: `vehiclesForPackage(selected)`; tile click dissolves peers → set vehicle + stage 3
- Stage 3: `GrowthStairway` with sorted steps; Begin only if `canEnterClimb`; then stage 4 `stepIndex=0`
- Stage 4: `GrowthStepper`; Next increments until last; Previous decrements; Back control uses `previousGrowthStage`
- Header: “Growth”, champagne eyebrow “Private Confidant”
- Testids: keep `view-case-board` and `heading-case-board` on root/heading for e2e, visible heading text **Growth**; also `data-testid="growth-stage-{n}"` on active stage wrapper

Replace `components/CaseBoard.tsx` body with:

```ts
export { GrowthBoard as CaseBoard } from './growth/GrowthBoard';
```

(or default export match whatever `App.tsx` imports today)

- [ ] **Step 4: Run unit tests**

Run: `npm run test:unit -- components/growth/`

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add components/growth/GrowthBoard.tsx components/growth/sortSteps.ts components/growth/sortSteps.test.ts components/CaseBoard.tsx
git commit -m "feat(growth): wire GrowthBoard stage controller as Case Map view"
```

---

### Task 6: Nav copy + docs inventory

**Files:**
- Modify: `App.tsx` (NavItem label `Case Map` → `Growth`)
- Modify: `docs/ui-inventory.md`
- Modify: `README.md` Case Map section title/body → Growth (keep technical package wording)

- [ ] **Step 1: Apply copy changes**

In `App.tsx`, change only the visible label:

```tsx
label="Growth"
```

Keep `data-testid="nav-btn-case_board"` and `View.CASE_BOARD`.

Update `docs/ui-inventory.md` Case Map rows to Growth / stage machine description.

Update README section heading from Case Map to Growth; describe Status Upgrades → Stairway briefly; link the design spec.

- [ ] **Step 2: Grep for leftover user-facing “Case Map”**

Run: `rg -n "Case Map" README.md docs/ui-inventory.md App.tsx components/`

Expected: no user-facing leftovers in those paths (spec/plan history may still say Case Map)

- [ ] **Step 3: Commit**

```bash
git add App.tsx docs/ui-inventory.md README.md
git commit -m "docs(ui): rename Case Map chrome to Growth"
```

---

### Task 7: E2E smoke alignment

**Files:**
- Modify: `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: existing login helpers; GrowthBoard testids

- [ ] **Step 1: Update navigation expectation**

Keep `nav-btn-case_board` / `view-case_board`. Ensure `heading-case-board` remains and assert visible text:

```ts
await expect(page.getByTestId('heading-case-board')).toHaveText(/Growth/i);
```

Add a focused flow test:

```ts
test('Growth funnel reaches stairway from Status Upgrades', async ({ page }) => {
  await page.getByTestId('nav-btn-case_board').click();
  await page.getByTestId('growth-folder-status-upgrades').click();
  await page.getByTestId(/growth-area-/).first().click();
  await page.getByTestId(/growth-vehicle-/).first().click();
  await expect(page.getByTestId('growth-stairway')).toBeVisible();
});
```

Wire those testids in `GrowthBoard` / chrome if not already present from Task 5.

- [ ] **Step 2: Run e2e smoke (requires app)**

Run: `npm run test:e2e -- e2e/smoke.spec.ts`

Expected: PASS (or fix selectors until PASS)

- [ ] **Step 3: Commit**

```bash
git add e2e/smoke.spec.ts components/growth/
git commit -m "test(e2e): cover Growth status-upgrade funnel"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Nav Growth | 6 |
| Stage 0 two folders | 3, 5 |
| Status Upgrades → area cards | 5 |
| Vehicles after card (dissolve) | 2, 3, 5 |
| Stairway after vehicle (soft hybrid) | 4, 5 |
| Counted stepper climb | 4, 5 |
| Back restores previous stage | 1, 5 |
| Stairway tease without climb | 5 |
| Primer packages as areas | 5 |
| Vehicle overlay / primary fallback | 2 |
| Package steps as climb | 5 |
| Brand / no rainbow / CSS only | 3, 4 |
| Mock order canonical | 5, 7 |
| Clarity not legal advice (speed bumps) | 4 |
| Out of scope: Mario map, engraving clone, upload arch | — (not planned) |

## Placeholder / consistency self-review

- No TBD steps; vehicle overlay IDs are explicit.
- `GrowthStage` 0–4 matches spec tables.
- CaseBoard re-export keeps `App.tsx` import path stable.
- E2E keeps `case_board` testids; visible copy is Growth.
