# 2026-03-31 Optimize Report Batch 2 Tags Design

## Summary

Implement a narrow database write optimization focused only on tag upserts. The goal is to reduce SQL statement count inside `upsertEntryTags()` while keeping its external behavior unchanged for `addEntry`, `updateEntry`, and `restoreEntries`.

This batch intentionally avoids broader refactors such as SQL builder extraction, store decomposition, or FTS search work.

## Goals

- Reduce the number of SQL statements emitted by `upsertEntryTags()` for entries with multiple tags.
- Preserve the current dual-write behavior: JSON `tags` column plus normalized `tags` / `entry_tags` tables.
- Keep `addEntry`, `updateEntry`, and `restoreEntries` call sites unchanged.
- Preserve idempotency and current user-visible behavior.

## Non-Goals

- Rewrite `restoreEntries()` into a cross-entry batch pipeline.
- Refactor `addEntry` / `restoreEntries` shared SQL construction.
- Change tag search semantics.
- Introduce new dependencies or database features.
- Expand optimization to unrelated write paths.

## Approved Scope

Files expected to change:

- `app/src/database/operations.ts`
- Relevant existing tests in `app/src/database/__tests__/operations.test.ts`

## Approaches Considered

### Approach A: Minimal batch SQL inside `upsertEntryTags` (recommended)

Keep the helper signature unchanged, but replace per-tag `INSERT` loops with:

- one `DELETE FROM entry_tags WHERE entry_id = ?`
- one batched `INSERT OR IGNORE INTO tags (name) VALUES (...), (...), ...`
- one batched `INSERT OR IGNORE INTO entry_tags ... SELECT ... WHERE name IN (...)`

Pros:

- Smallest edit surface.
- Improves all current callers automatically.
- Easy to regression-test.

Cons:

- Still processes one entry at a time.

### Approach B: `restoreEntries`-specific batching

Add a second specialized helper only for restore flow, leaving `addEntry` and `updateEntry` unchanged.

Pros:

- Targets the hottest current path directly.

Cons:

- Duplicates tag-write logic.
- Makes future maintenance worse.

### Approach C: Global cross-entry tag batching

Collect all tags for all entries in `restoreEntries()` and write them in one larger pass.

Pros:

- Best raw throughput.

Cons:

- Significantly larger scope.
- Harder to reason about and validate.

## Chosen Approach

Use Approach A.

This is the smallest change that materially reduces statement count without branching the implementation by caller.

## Detailed Design

### 1. Deduplicate tags per entry

Before issuing SQL, normalize the input tags for one entry into a unique list while preserving the current call contract.

Design decisions:

- Treat duplicate tags in one entry as a single normalized tag write.
- If the deduplicated list is empty, only run the `DELETE` and return.

### 2. Batch insert into `tags`

Replace the current per-tag loop:

```sql
INSERT OR IGNORE INTO tags (name) VALUES (?)
```

with one dynamically-built statement:

```sql
INSERT OR IGNORE INTO tags (name) VALUES (?), (?), ...
```

Design decisions:

- Use positional placeholders only.
- Keep `INSERT OR IGNORE` semantics unchanged.

### 3. Batch insert into `entry_tags`

Replace the current per-tag association insert loop with one statement of the form:

```sql
INSERT OR IGNORE INTO entry_tags (entry_id, tag_id)
SELECT ?, id FROM tags WHERE name IN (?, ?, ...)
```

Design decisions:

- Use the entry id once for the full batched association insert.
- Preserve existing `INSERT OR IGNORE` behavior so reruns stay idempotent.

### 4. Caller behavior stays unchanged

`addEntry`, `updateEntry`, and `restoreEntries` should continue to call `upsertEntryTags()` exactly as they do today.

This batch optimizes the helper internals only.

## Testing Strategy

Use the existing `operations.test.ts` suite and update only the tag-write assertions that currently depend on the old per-tag loop shape.

Validation targets:

- `addEntry` with one tag still dual-writes normalized tags.
- `addEntry` with multiple tags emits one batched `INSERT OR IGNORE INTO tags` and one batched `INSERT OR IGNORE INTO entry_tags` instead of per-tag loops.
- `restoreEntries` with tagged entries remains green.
- Duplicate tags for a single entry do not generate duplicate placeholders/association attempts beyond the deduplicated set.

## Risks And Mitigations

### Risk: placeholder ordering bug in dynamic SQL

Mitigation:

- Keep placeholder generation local and deterministic.
- Assert SQL shape and parameters in focused tests.

### Risk: changed handling of duplicate tags

Mitigation:

- Explicitly define per-entry deduplication in this batch.
- Preserve `INSERT OR IGNORE` on both `tags` and `entry_tags` writes.

### Risk: accidental behavior change in callers

Mitigation:

- Do not change any caller signatures or call order.
- Keep the helper async contract the same.

## Implementation Boundaries

- No new helper abstractions outside what is needed for local SQL placeholder construction.
- No changes outside `operations.ts` and directly affected `operations.test.ts` coverage.
- No commit unless explicitly requested.

## Success Criteria

- `upsertEntryTags()` no longer loops over tags issuing `2N` insert statements.
- Existing callers continue to work without modification.
- Relevant `operations.test.ts` cases pass with updated SQL-shape expectations.
- `npm test -- --runInBand --runTestsByPath src/database/__tests__/operations.test.ts` passes.
