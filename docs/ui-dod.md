# ArbiterOS — UI Definition of Done

> Every UI change merged to `main` must satisfy **all** items in this checklist before the PR is considered complete.

---

## ✅ Checklist

### Responsiveness
- [ ] Renders correctly at **mobile** viewport (390 × 844 — iPhone-ish)
- [ ] Renders correctly at **tablet** viewport (768 × 1024)
- [ ] Renders correctly at **desktop** viewport (1280 × 800 and wider)
- [ ] No horizontal scroll on any viewport unless explicitly intentional (e.g. a data table)
- [ ] Sidebar collapses to icon-only on mobile (no text overflow)

### Keyboard Accessibility
- [ ] All interactive elements (buttons, inputs, links) are reachable via `Tab`
- [ ] Focus ring is **visible** on every focused element (not hidden by `outline: none`)
- [ ] Sidebar navigation buttons are keyboard-activatable (`Enter` / `Space`)
- [ ] Any modal/dialog traps focus while open and restores it on close
- [ ] Night-mode toggle is keyboard-accessible

### Loading States
- [ ] Every async operation shows a **loading indicator** (spinner, skeleton, or disabled state)
- [ ] The submit/send button is **disabled** while a request is in flight
- [ ] No UI element flashes blank before data loads

### Error States
- [ ] User-visible error message shown for any failed async call (not a silent `console.error`)
- [ ] Error state includes a **retry action** where applicable
- [ ] API key missing / mis-configured produces a helpful, actionable error (not a white screen)

### Empty States
- [ ] Every list, grid, or panel has a friendly **empty-state message** (not blank space)
- [ ] Chat history starts with a clear prompt to the user (not an empty box)
- [ ] Evidence board with zero nodes shows an onboarding hint

### Styling Consistency
- [ ] New colours use existing brand tokens (gold `#d4af37`, mahogany `#1e1410`, etc.)
- [ ] New typography follows existing scale (Merriweather for headings, Inter for body)
- [ ] No raw `px` colour values that diverge from the established palette

### `data-testid` Coverage
- [ ] Every new screen or significant container has a `data-testid` attribute
- [ ] Every new heading (`h1`–`h3`) in a view has a `data-testid`
- [ ] New interactive elements critical to user flow have a `data-testid`

### E2E Test Coverage
- [ ] Smoke tests pass: `npm run test:e2e`
- [ ] If a new view is added, a navigation test for it is added to `e2e/smoke.spec.ts`
- [ ] Visual snapshot baselines are updated if the layout changes: `npm run test:e2e -- --update-snapshots`

### Night Mode
- [ ] New components render acceptably in night-mode (no unreadable black-on-black text)
- [ ] Night-mode overlay does not obscure interactive elements (`pointer-events-none` preserved)

### Performance
- [ ] No new synchronous blocking operations on the main thread
- [ ] Large lists use virtualization or pagination (threshold: > 100 items)
- [ ] New images or assets are appropriately sized and format-optimised

### Code Quality
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] No new `any` types introduced without justification
- [ ] No new Zod schema bypasses (all AI I/O validated)

---

## 📋 PR Template Reminder

When opening a UI PR, include:
1. Screenshots at mobile + desktop (before / after if changing existing UI)
2. Which checklist items were verified manually
3. Which checklist items are covered by automated tests
