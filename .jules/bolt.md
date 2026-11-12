## 2024-11-12 - Optimize String Timestamp Sorting
**Learning:** `localeCompare` is significantly slower in V8 than standard relational operators for string comparison due to Unicode Collation Algorithm overhead.
**Action:** When sorting ISO 8601 timestamps, prefer `>` and `<` operators instead of `localeCompare` for improved performance.
