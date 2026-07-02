## 2026-07-01 - [O(1) Node Lookup in EvidenceBoard]
**Learning:** O(N) array lookups within frequent render cycles (like drag operations) cause massive performance bottlenecks.
**Action:** Use `useMemo` with a Map to transform O(N) operations into O(1) lookups during frequent re-renders.

## 2026-07-02 - Canvas Dragging Re-render Bottleneck
**Learning:** In interactive canvas components (like `EvidenceBoard`), dragging a single node updates a shared `nodes` array state. By default, this causes React to re-render *all* child nodes, even those that haven't moved.
**Action:** Extract individual nodes into their own components and wrap them in `React.memo()`. Crucially, ensure all event handlers passed to them are memoized using `useCallback` (employing functional state updates to keep dependencies minimal) to prevent `React.memo` from being broken by unstable references.
