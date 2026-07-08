## 2026-07-01 - [O(1) Node Lookup in EvidenceBoard]
**Learning:** O(N) array lookups within frequent render cycles (like drag operations) cause massive performance bottlenecks.
**Action:** Use `useMemo` with a Map to transform O(N) operations into O(1) lookups during frequent re-renders.

## 2024-05-18 - [ReactMarkdown Re-mounting with Inline Components]
**Learning:** Passing an inline object with inline functions to the `components` prop of `ReactMarkdown` causes React to completely unmount and remount all markdown elements on every render (because the component references change). In a chat interface where the parent component re-renders frequently (e.g., on every keystroke in a text input), this creates a severe O(N) performance bottleneck that destroys typing responsiveness.
**Action:** Always extract the `components` object and its custom renderers outside the component body (or wrap in `useMemo`) so their references remain stable across renders.
