# 2026-03-30 Type Safety And Timeline Dedupe Design

## Summary

This change set makes two focused code health improvements without changing product behavior:

1. Remove unsafe `as any` assertions from the identified production code paths in `src/utils/fileSystem.ts` and `src/database/operations.ts`.
2. Remove the duplicate root-level timeline empty-state and section-header implementations, keeping `src/components/timeline-v2/` as the single source of truth.

The work is intentionally narrow. It does not change storage formats, database schema behavior, or timeline UX.

## Goals

- Improve type safety in production code.
- Eliminate duplicate timeline component implementations.
- Preserve all existing behavior visible to users.
- Keep the change small enough to validate with targeted tests.

## Non-Goals

- Implement storage available-space detection.
- Perform hook performance refactors.
- Restructure unrelated component directories.
- Change timeline visuals or interaction behavior.

## Current State

### Production `as any` usage

The approved cleanup scope covers these production locations:

- `app/src/utils/fileSystem.ts`
- `app/src/database/operations.ts`

In `fileSystem.ts`, `FileSystem.getInfoAsync()` results are accessed through `as any` only to read `size`.

In `operations.ts`, entry media is currently normalized with expressions of the form:

- `Array.isArray(entry.media) ? entry.media[0] : entry.media as any`

Given the declared type of `Entry.media` is `MediaInfo[] | undefined`, these assertions are broader than necessary.

### Duplicate timeline components

There are two copies of both of the following components:

- `TimelineEmptyState`
- `TimelineSectionHeader`

Runtime code uses the `timeline-v2` variants, while tests still reference the root-level copies. This creates maintenance overhead and makes behavior drift possible.

## Chosen Approach

Use `timeline-v2` as the canonical implementation and remove the unused root-level duplicates.

For type cleanup, replace broad `as any` assertions with explicit narrowing that matches the real runtime shapes already supported by the code.

This approach is preferred because it removes duplication directly instead of hiding it behind re-exports, while keeping behavior unchanged.

## Detailed Design

### 1. File system type narrowing

`getFileInfo()` and `getDirectorySize()` will continue using `expo-file-system/legacy` exactly as they do now.

The implementation will stop casting the full info object to `any`. Instead, it will read `size` through a narrow local type such as an optional `size` field on the returned object. The code will still fall back to `0` when the size is unavailable.

Behavioral expectation:

- Existing files report the same size values as before.
- Missing files still return `exists: false` and `size: 0`.
- Directory traversal behavior remains unchanged.

### 2. Database media normalization

Legacy insert/update paths in `operations.ts` only need the first media item when writing compatibility columns such as `media_uri`, `media_type`, `media_duration`, `media_thumbnail`, and `media_metadata`.

The new code will normalize media by reading the first item directly from `MediaInfo[] | undefined`, without trying to support a non-array branch through `as any`.

Behavioral expectation:

- If `media` is missing or empty, legacy columns are written as `null` exactly as they are today.
- If `media` exists, the first item still drives legacy compatibility writes.
- No JSON serialization or column-selection logic changes.

### 3. Timeline component deduplication

Keep these files as the only implementations:

- `app/src/components/timeline-v2/TimelineEmptyState.tsx`
- `app/src/components/timeline-v2/TimelineSectionHeader.tsx`

Remove these duplicate root-level files:

- `app/src/components/TimelineEmptyState.tsx`
- `app/src/components/TimelineSectionHeader.tsx`

Tests that currently import the root-level files will be updated to import the canonical `timeline-v2` files instead.

Behavioral expectation:

- Timeline empty state content and section header rendering remain the same for the live code path.
- Tests validate the canonical implementation rather than an unused duplicate.

## Testing Strategy

This work will follow TDD for the touched behavior:

1. Update or add targeted tests so they point at the canonical `timeline-v2` components.
2. Run the targeted tests and confirm failures occur for the expected reason after removing or redirecting duplicate implementations.
3. Make the minimal production changes to restore green status.
4. Run the relevant targeted test files again.

Expected verification scope:

- Timeline component tests covering empty state and section header rendering.
- Any directly affected tests for database or file-system behavior if needed.
- TypeScript and existing test suites are the source of truth for regression detection.

## Risks And Mitigations

### Risk: hidden imports still rely on the root-level component paths

Mitigation:

- Search the codebase before deletion.
- Let test execution confirm that only the approved imports remain.

### Risk: file-system typing changes accidentally alter fallback behavior

Mitigation:

- Preserve the current `0` fallback semantics exactly.
- Keep the logic localized to the current helper functions.

### Risk: legacy media column writes drift from current behavior

Mitigation:

- Only replace the normalization expression, not the surrounding SQL or serialization logic.
- Validate the touched code paths with targeted tests and type checking.

## Implementation Boundaries

The implementation should remain minimal:

- No new abstractions unless required by tests.
- No broad refactor of timeline code.
- No unrelated cleanup of other `as any` usages outside the approved files.

## Success Criteria

- Production `as any` usage is removed from the approved locations in `fileSystem.ts` and `operations.ts`.
- Root-level duplicate timeline component implementations are removed.
- Tests point at the canonical `timeline-v2` components.
- Targeted verification passes without changing product behavior.
