# 2026-03-31 Optimize Report Batch 3 Insert Builder Design

## Summary

Implement a narrow maintainability refactor that extracts the repeated `entries` insert column/value assembly shared by `addEntry()` and `restoreEntries()` into a single local helper. The goal is to remove duplicate SQL column/parameter construction while preserving current behavior exactly.

This batch intentionally avoids behavior cleanups, store refactors, or broader database API redesign.

## Goals

- Remove duplicated `entries` insert column/value assembly logic from `addEntry()` and `restoreEntries()`.
- Keep the existing runtime behavior unchanged, including old-schema compatibility branches.
- Preserve the current differences between callers such as `INSERT` vs `INSERT OR IGNORE`, timestamp source, and `changes()` handling.
- Keep the refactor local to `app/src/database/operations.ts` with focused regression coverage in `operations.test.ts`.

## Non-Goals

- Change `updateEntry()`.
- Change `upsertEntryTags()` behavior.
- Normalize additional runtime behavior differences between `addEntry()` and `restoreEntries()`.
- Redesign schema detection or migration logic.
- Split database logic into new files or modules.

## Approved Scope

Files expected to change:

- `app/src/database/operations.ts`
- `app/src/database/__tests__/operations.test.ts`

## Approaches Considered

### Approach A: Minimal local builder returning insert parts (recommended)

Add one file-local helper that receives the entry payload plus detected schema capabilities and returns:

- the insert column list
- the placeholder list
- the parameter array

`addEntry()` and `restoreEntries()` still own their outer SQL wrapper and caller-specific behavior.

Pros:

- Smallest safe edit surface.
- Removes the duplicate maintenance burden.
- Easy to verify by keeping existing tests green.

Cons:

- Still leaves two outer SQL wrappers in the callers.

### Approach B: Full `buildEntryInsertSql()` helper

Return complete SQL and params from one helper, with mode flags for caller differences.

Pros:

- Less duplication overall.

Cons:

- Couples caller-specific differences into one larger abstraction.
- Higher regression risk.

### Approach C: Broader write-path unification

Unify `addEntry()`, `restoreEntries()`, and maybe `updateEntry()` under one shared write model.

Pros:

- Most consistent long term.

Cons:

- Scope expands far beyond this batch.

## Chosen Approach

Use Approach A.

This removes the duplication we care about without turning the batch into a behavior refactor.

## Detailed Design

### 1. Extract local insert-part builder

Create one file-local helper in `operations.ts`, for example `buildEntryInsertParts(...)`, that produces the variable pieces now duplicated between `addEntry()` and `restoreEntries()`.

The helper should own:

- conditional column selection based on detected schema support
- matching placeholder generation
- parameter array assembly
- media-json vs legacy-media branch selection
- normalized tags JSON payload selection

The helper should not own:

- `INSERT` vs `INSERT OR IGNORE`
- caller-specific transaction / `changes()` logic
- `id` generation or restore-loop control flow

### 2. Keep caller-specific semantics outside the helper

`addEntry()` continues to:

- generate `id` and `timestamp`
- use plain `INSERT INTO entries`
- return the created `Entry`

`restoreEntries()` continues to:

- run inside its transaction loop
- use `INSERT OR IGNORE INTO entries`
- call `changes()` to determine whether tags should be synchronized
- preserve `created_at` / `updated_at` restore semantics

### 3. Preserve old-schema compatibility

The extracted helper must preserve the same branch behavior currently used for:

- `media_json`
- extended legacy media columns (`media_thumbnail`, `media_metadata`)
- older legacy media columns only
- optional sync and cloud metadata columns

No branch should be removed or behavior-flattened in this batch.

## Testing Strategy

Rely primarily on the existing `operations.test.ts` coverage for `addEntry()` and `restoreEntries()`, and add only the smallest regression assertions needed to prove the shared builder did not change caller behavior.

Validation targets:

- existing `addEntry` insert tests remain green for media-json and legacy branches
- existing `restoreEntries` tests remain green for inserted fields and timestamps
- at least one focused regression asserts that `addEntry()` and `restoreEntries()` still emit their respective outer SQL forms (`INSERT INTO` vs `INSERT OR IGNORE INTO`)

## Risks And Mitigations

### Risk: placeholder/value mismatch after extraction

Mitigation:

- keep builder output strictly as `{ columnsSql, placeholdersSql, values }`
- rely on existing SQL-shape assertions and targeted regression tests

### Risk: accidentally collapse caller-specific semantics

Mitigation:

- keep caller-owned differences outside the helper
- explicitly test `INSERT` vs `INSERT OR IGNORE` behavior remains intact

### Risk: old-schema branch regression

Mitigation:

- do not change branch selection rules
- keep existing branch-specific tests green

## Implementation Boundaries

- No new files.
- No new dependencies.
- No behavior cleanup beyond what is needed to preserve current outputs.
- No commit unless explicitly requested.

## Success Criteria

- The duplicated insert-part assembly in `addEntry()` and `restoreEntries()` is extracted into one file-local helper.
- Existing behavior remains unchanged.
- `operations.test.ts` stays green.
- `npm test -- --runInBand --runTestsByPath src/database/__tests__/operations.test.ts` passes.
