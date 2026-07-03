## 2026-07-01 - [O(1) Node Lookup in EvidenceBoard]
**Learning:** O(N) array lookups within frequent render cycles (like drag operations) cause massive performance bottlenecks.
**Action:** Use `useMemo` with a Map to transform O(N) operations into O(1) lookups during frequent re-renders.
## 2026-07-03 - [O(1) Status Grouping in Render Loops]
**Learning:** Frequent input changes in a component with multiple array filters (like filtering tasks by columns) trigger redundant O(N) scans on every keystroke, leading to input lag.
**Action:** Use `useMemo` to group array items by a key into a dictionary (O(N) operation once per dependency change), and replace inline filters with O(1) property lookups during render.
