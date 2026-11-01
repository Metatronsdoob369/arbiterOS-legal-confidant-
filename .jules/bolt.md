## 2025-10-27 - [Avoid Date Parsing in Sort Loops]
**Learning:** Instantiating `new Date(string)` inside an array `.sort()` function call forces the JS engine to parse ISO 8601 strings and allocate objects O(N log N) times. In a React `useMemo`, this can block the main thread and cause noticeable lag when filtering large data lists like in `Library.tsx`.
**Action:** Always sort ISO 8601 timestamps using string comparison (`localeCompare` or `<`/`>`) rather than parsing them into Date objects.
