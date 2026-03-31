# 2026-03-31 Optimize Report Batch 6 FTS Content Design

## Summary

Implement the first phase of search optimization by introducing SQLite FTS5 for `entries.content` only. This phase does not index tags in FTS and does not change the existing exact tag-filter behavior based on `tags` / `entry_tags`.

The purpose of this phase is to replace the current `LIKE '%query%'` full scan on `content` with a dedicated full-text index while keeping the feature scope narrow and the semantics clear.

## Goals

- Add a local FTS5 index for `entries.content`.
- Make local search paths use FTS for content lookup.
- Preserve the existing normalized tag filter behavior in `getEntriesPage()`.
- Keep the first phase focused on local SQLite only.

## Non-Goals

- Do not index tags inside FTS in this phase.
- Do not redesign remote search API behavior in this phase.
- Do not remove existing `tags` / `entry_tags` normalized tag filtering.
- Do not introduce ranking, fuzzy matching tuning, or advanced tokenizer customization beyond what is required to ship phase 1.
- Do not change UI affordances or add a separate search mode selector in this phase.

## Approved Scope

Files likely to be involved in a future implementation plan:

- `app/src/database/sqlite.ts`
- `app/src/database/migration.ts`
- `app/src/database/operations.ts`
- related tests under `app/src/database/__tests__/`
- possibly Expo config if FTS capability verification reveals it is required explicitly for this app build

## Current State

### Local search today

`searchEntries(query)` currently does:

```sql
SELECT * FROM entries
WHERE content LIKE ? OR tags LIKE ?
ORDER BY timestamp DESC
LIMIT ?
```

`getEntriesPage({ search })` currently appends:

```sql
(e.content LIKE ? OR e.tags LIKE ?)
```

This means both local search entry points are currently full scans on `%query%` patterns.

### Tags today

Tag filtering is already modeled separately through normalized tables:

- `tags`
- `entry_tags`

`getEntriesPage({ tags })` uses exact tag matching with AND semantics through subqueries against those normalized tables.

This is already a separate semantic from free-text search.

## Approaches Considered

### Approach A: FTS for content only, keep tag filtering separate (recommended)

Add an FTS5 virtual table that mirrors `entries.content` and use it only for free-text search.

Pros:

- Clean semantics.
- Lowest maintenance cost.
- Fits the existing distinction between content search and exact tag filters.

Cons:

- A user searching a tag string through the search box will no longer match solely via the JSON `tags` column.

### Approach B: FTS for content plus flattened tags

Index `content` and flattened tags text in the same FTS table.

Pros:

- Closer to current user-visible search behavior.

Cons:

- Introduces a third representation of tag data.
- Higher sync and maintenance burden.

### Approach C: Keep LIKE search and only optimize around it

Avoid FTS and attempt smaller query-side optimizations.

Pros:

- Lowest migration complexity.

Cons:

- Does not solve the root performance problem for `%query%`.

## Chosen Approach

Use Approach A.

This keeps phase 1 simple: free-text search becomes content-only FTS, and exact tag filtering remains on the normalized relationship model.

## Detailed Design

### 1. Add an FTS5 virtual table for entry content

Create a table such as:

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
  entry_id UNINDEXED,
  content
);
```

Design decisions:

- `entry_id` is stored to map FTS rows back to `entries.id`.
- Only `content` is indexed in phase 1.
- Tags are intentionally excluded.

### 2. Backfill existing content into FTS

During migration/init for databases that do not yet have the FTS table:

- create `entries_fts`
- clear any partial content if needed
- backfill from existing `entries`

Example backfill shape:

```sql
INSERT INTO entries_fts (entry_id, content)
SELECT id, content FROM entries;
```

### 3. Keep FTS synchronized with entry writes

Future implementation should update the FTS table whenever local entry content changes.

Affected write paths:

- `addEntry()`
- `updateEntry()` when `content` changes
- `deleteEntry()`
- `restoreEntries()`

Phase 1 design preference:

- keep synchronization explicit in application SQL rather than using SQLite triggers, unless testing shows triggers are materially simpler and equally reliable in Expo SQLite for this codebase

Reasoning:

- this project already manages schema evolution and compatibility in application code
- explicit writes are easier to reason about in existing tests

### 4. Replace local content search with FTS lookup

`searchEntries(query)` should move from `LIKE` to an FTS query with row lookup.

Representative shape:

```sql
SELECT e.*
FROM entries e
JOIN entries_fts f ON f.entry_id = e.id
WHERE f.content MATCH ?
ORDER BY e.timestamp DESC
LIMIT ?
```

`getEntriesPage({ search })` should similarly intersect the existing filters with an FTS-backed content match instead of `(e.content LIKE ? OR e.tags LIKE ?)`. Exact tag filters remain unchanged and continue to apply through the normalized tables.

### 5. Semantics change in phase 1

This phase intentionally changes one aspect of current local search behavior:

- the search box will match `content`
- it will not match solely because the JSON `tags` column contains the text

Exact tag filtering remains available through the existing filter UI and normalized tag relations.

## Expo / Platform Constraints

The current Expo SQLite documentation indicates FTS5 support is available and controlled by the `enableFTS` config plugin option.

Design implication:

- before implementation, confirm the current app build configuration does not explicitly disable FTS
- if the project needs an explicit plugin declaration for reliability, include that in the implementation plan as a separately verified change

## Testing Strategy

Future implementation should cover:

- schema / migration creation of `entries_fts`
- backfill of pre-existing entries
- `searchEntries(query)` using FTS instead of `LIKE`
- `getEntriesPage({ search })` using FTS-backed content lookup
- `addEntry` / `updateEntry` / `deleteEntry` / `restoreEntries` keeping FTS synchronized
- preserving exact tag filter behavior in `getEntriesPage({ tags })`

## Risks And Mitigations

### Risk: FTS support differs by build configuration

Mitigation:

- verify Expo config before implementation
- add a focused migration/init test for FTS table creation

### Risk: content-only search surprises users who previously matched tags through free text

Mitigation:

- make the phase-1 semantic change explicit
- preserve tag filter UI unchanged

### Risk: FTS sync drift on write paths

Mitigation:

- explicitly enumerate and test all local write paths in the implementation plan

### Risk: Chinese tokenization expectations differ from default tokenizer behavior

Mitigation:

- treat tokenizer quality as a follow-up concern after basic FTS infrastructure lands
- do not over-scope phase 1 with custom tokenizer work

## Implementation Boundaries

- No tag text in FTS during phase 1.
- No remote API search redesign during phase 1.
- No ranking UI or advanced query syntax in phase 1.
- No commit unless explicitly requested.

## Success Criteria

- Local content search no longer relies on `%query%` scans.
- Exact tag filtering remains unchanged.
- FTS index creation and synchronization strategy are clearly defined.
- The phase-1 semantic change is explicit and accepted.
