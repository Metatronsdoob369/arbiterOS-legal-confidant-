## 2026-07-01 - [O(1) Node Lookup in EvidenceBoard]
**Learning:** O(N) array lookups within frequent render cycles (like drag operations) cause massive performance bottlenecks.
**Action:** Use `useMemo` with a Map to transform O(N) operations into O(1) lookups during frequent re-renders.
## 2026-07-01 - [O(1) Task Lookup in CaseBoard]
**Learning:** O(N) array filtering within render loops (like rendering drag-and-drop columns) causes massive performance bottlenecks, especially when the same filter is applied multiple times for counting and mapping.
**Action:** Use `useMemo` to group elements in O(N) time once per state change, allowing for O(1) lookups during render phases and avoiding repeated filtering.
## 2026-07-05 - [React.memo missing on heavy markdown lists]
**Learning:** Rendering complex markdown in a list without `React.memo` combined with a fast-changing state like an input field causes massive lag, because typing triggers a full re-parse and re-render of the entire chat history.
**Action:** Extract list items that do heavy rendering (like markdown parsing) into their own component and wrap them with `React.memo`. Ensure props like callbacks are wrapped in `React.useCallback` in the parent so they don't break memoization.
## 2026-07-06 - [React.memo missing on complex inline drag-and-drop nodes]
**Learning:** Rendering complex inline list items (like interactive nodes on a canvas) without `React.memo` during 60FPS drag operations causes massive O(N) React diff re-renders on every mouse movement, significantly hurting performance.
**Action:** Extract node UI elements into a separate component wrapped with `React.memo` and ensure stable callback references are passed using `React.useCallback`.
## 2026-07-07 - [Extract Heavy Chat Item into React.memo]
**Learning:** Rendering complex markdown inside a map function within a React component holding fast-changing state like text inputs causes massive re-renders and slowness. Using `React.memo` for the list item prevents this. Also, be sure to use `React.useCallback` for functions passed as props to avoid breaking memoization.
**Action:** Extract large elements rendered inside loops into their own component and wrap them with `React.memo` if their props don't frequently change. Ensure parent callbacks passed as props are wrapped in `React.useCallback`.
## 2026-10-22 - [O(N log N) Sorting in GrowthBoard]
**Learning:** Re-computing expensive derived state like sorting (`sortPackageSteps` which is O(N log N)) on every render during state transitions (like stage or step index changes) causes unnecessary performance overhead.
**Action:** Use `useMemo` to memoize derived state calculations, ensuring they only recalculate when their specific dependencies change. Also wrap handler functions in `useCallback` so they can be safely passed to child components.
## 2026-10-25 - [React.memo missing on large list elements]
**Learning:** Rendering complex items inside a map loop without `React.memo` causes O(N) re-renders, resulting in slow updates when fast-changing state like a search input updates. Furthermore, inline filter operations like counting items (`items.filter(...).length`) within a render loop adds unneeded O(N) overhead.
**Action:** Extract loop contents into a separate component, wrap it with `React.memo`, and make sure child event handlers passed as props use `React.useCallback`. Use `React.useMemo` for any derived values that require iterative operations on data sets.
