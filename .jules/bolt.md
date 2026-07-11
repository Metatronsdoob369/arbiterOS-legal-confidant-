## 2026-07-01 - [O(1) Node Lookup in EvidenceBoard]
**Learning:** O(N) array lookups within frequent render cycles (like drag operations) cause massive performance bottlenecks.
**Action:** Use `useMemo` with a Map to transform O(N) operations into O(1) lookups during frequent re-renders.
## 2026-07-01 - [O(1) Task Lookup in CaseBoard]
**Learning:** O(N) array filtering within render loops (like rendering drag-and-drop columns) causes massive performance bottlenecks, especially when the same filter is applied multiple times for counting and mapping.
**Action:** Use `useMemo` to group elements in O(N) time once per state change, allowing for O(1) lookups during render phases and avoiding repeated filtering.
## 2026-07-05 - [React.memo missing on heavy markdown lists]
**Learning:** Rendering complex markdown in a list without `React.memo` combined with a fast-changing state like an input field causes massive lag, because typing triggers a full re-parse and re-render of the entire chat history.
**Action:** Extract list items that do heavy rendering (like markdown parsing) into their own component and wrap them with `React.memo`. Ensure props like callbacks are wrapped in `React.useCallback` in the parent so they don't break memoization.
## 2026-07-11 - [React.memo missing on draggable nodes in EvidenceBoard]
**Learning:** Rendering nodes without `React.memo` while handling `onMouseMove` events for drag-and-drop causes a massive performance bottleneck. The parent component re-renders every time the mouse moves, forcing React to do a full DOM reconciliation on all non-moving nodes, changing rendering complexity from O(Nodes + Connections) to O(1) per frame for non-moving nodes when memoized.
**Action:** Extract node components in canvas/drag-and-drop UIs and wrap them in `React.memo()`. Make sure event handler props are stabilized with `useCallback` to prevent breaking memoization during rapid re-renders.
