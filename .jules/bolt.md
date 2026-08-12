## 2026-07-01 - [O(1) Node Lookup in EvidenceBoard]
**Learning:** O(N) array lookups within frequent render cycles (like drag operations) cause massive performance bottlenecks.
**Action:** Use `useMemo` with a Map to transform O(N) operations into O(1) lookups during frequent re-renders.
## 2026-07-01 - [O(1) Task Lookup in CaseBoard]
**Learning:** O(N) array filtering within render loops (like rendering drag-and-drop columns) causes massive performance bottlenecks, especially when the same filter is applied multiple times for counting and mapping.
**Action:** Use `useMemo` to group elements in O(N) time once per state change, allowing for O(1) lookups during render phases and avoiding repeated filtering.
## 2026-07-05 - [React.memo missing on heavy markdown lists]
**Learning:** Rendering complex markdown in a list without `React.memo` combined with a fast-changing state like an input field causes massive lag, because typing triggers a full re-parse and re-render of the entire chat history.
**Action:** Extract list items that do heavy rendering (like markdown parsing) into their own component and wrap them with `React.memo`. Ensure props like callbacks are wrapped in `React.useCallback` in the parent so they don't break memoization.
## 2026-07-06 - [React.memo missing on draggable Evidence nodes]
**Learning:** During drag operations, state updates (`setNodes`) trigger full re-renders of all nodes. Without `React.memo`, O(N) nodes are re-rendered 60 times a second, causing lag. However, extracting to `React.memo` is completely ineffective if the callbacks (like `onMouseDown` or `onClick`) are recreated every render or depend on the rapidly changing array (e.g. `nodes` or `nodeMap`).
**Action:** Extract node rendering to a `React.memo` component (`MemoizedNode`). Ensure all passed callbacks are stabilized with `useCallback`. To eliminate dependency on the changing `nodes` state, modify callbacks to accept node-specific data (like `nodeX`, `nodeY`) as arguments directly from the child component.
