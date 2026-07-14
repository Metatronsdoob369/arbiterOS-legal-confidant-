## 2026-07-01 - [O(1) Node Lookup in EvidenceBoard]
**Learning:** O(N) array lookups within frequent render cycles (like drag operations) cause massive performance bottlenecks.
**Action:** Use `useMemo` with a Map to transform O(N) operations into O(1) lookups during frequent re-renders.
## 2026-07-01 - [O(1) Task Lookup in CaseBoard]
**Learning:** O(N) array filtering within render loops (like rendering drag-and-drop columns) causes massive performance bottlenecks, especially when the same filter is applied multiple times for counting and mapping.
**Action:** Use `useMemo` to group elements in O(N) time once per state change, allowing for O(1) lookups during render phases and avoiding repeated filtering.
## 2026-07-05 - [React.memo missing on heavy markdown lists]
**Learning:** Rendering complex markdown in a list without `React.memo` combined with a fast-changing state like an input field causes massive lag, because typing triggers a full re-parse and re-render of the entire chat history.
**Action:** Extract list items that do heavy rendering (like markdown parsing) into their own component and wrap them with `React.memo`. Ensure props like callbacks are wrapped in `React.useCallback` in the parent so they don't break memoization.
## 2026-07-06 - [Chained Array Methods on Unbounded Arrays in AuditLog]
**Learning:** Chaining array methods like `[...arr].reverse().filter().slice().map()` on unbounded lists like log entries causes massive O(N) memory allocations and multiple O(N) traversal passes, leading to severe garbage collection lag during frequent updates.
**Action:** Replace multiple chained O(N) passes with a single reverse `for` loop to accumulate filtered, mapped, and reduced state concurrently without allocating intermediate arrays.
