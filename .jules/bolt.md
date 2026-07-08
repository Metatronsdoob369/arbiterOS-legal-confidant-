## 2026-07-01 - [O(1) Node Lookup in EvidenceBoard]
**Learning:** O(N) array lookups within frequent render cycles (like drag operations) cause massive performance bottlenecks.
**Action:** Use `useMemo` with a Map to transform O(N) operations into O(1) lookups during frequent re-renders.

## 2026-07-05 - [React.memo missing on heavy markdown lists]
**Learning:** Rendering complex markdown in a list without `React.memo` combined with a fast-changing state like an input field causes massive lag, because typing triggers a full re-parse and re-render of the entire chat history.
**Action:** Extract list items that do heavy rendering (like markdown parsing) into their own component and wrap them with `React.memo`. Ensure props like callbacks are wrapped in `React.useCallback` in the parent so they don't break memoization.

## 2026-07-06 - [Avoid Redundant Array Filtering in Render Loops]
**Learning:** Redundant array `.filter()` calls inside a `.map()` loop during component rendering cause O(N*M) complexity, leading to severe layout thrashing and performance degradation, particularly during high-frequency events like drag-and-drop.
**Action:** Use `useMemo` to compute grouped representations of data (e.g., grouping by status) in a single O(N) pass, enabling O(1) lookups during the render cycle.
