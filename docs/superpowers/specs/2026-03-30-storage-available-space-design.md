# 2026-03-30 Storage Available Space Design

## Summary

Implement the existing `available` field in `app/src/utils/fileSystem.ts#getStorageStats()` so it returns real available-space bytes when the underlying Expo file-system API can provide them, and keeps the current sentinel value `-1` when that information is unavailable.

This change is intentionally narrow. It does not redesign the storage stats model, add new dependencies, or expand UI to display available space.

## Goals

- Replace the current placeholder `available: -1` with a real value when the platform API supports it.
- Preserve the existing `available: number` contract.
- Keep `-1` as the explicit "unknown / unavailable" sentinel.
- Add focused tests for both success and fallback behavior.

## Non-Goals

- Change the type of `available` to `null` or another union shape.
- Add new native modules or third-party packages just for disk-space reporting.
- Update `BackupPage`, `SettingsPage`, or other UI to show available space.
- Refactor unrelated file-system helpers.

## Current State

`getStorageStats()` currently aggregates local storage usage across media and database directories, then returns:

- `photoSize`
- `voiceSize`
- `databaseSize`
- `cacheSize`
- `totalSize`
- `available`

The first five values are computed from directory sizes. The last field is still hardcoded:

```ts
available: -1, // TODO: 实现可用空间查询
```

Current callers only use `totalSize`, so implementing `available` is a data-layer improvement with no expected UI behavior change.

## Chosen Approach

Use the current Expo file-system package already present in the app to query available disk space, without introducing any new dependency.

`getStorageStats()` will continue computing directory usage exactly as it does today. After the existing directory-size aggregation, it will query the available-space value from the file-system API and include that byte count in the returned object.

If the API does not expose a usable number on the current platform, or if the lookup fails, the function will preserve the existing sentinel semantics and return `-1` for `available`.

This approach is preferred because it keeps the implementation local, preserves the current API contract, and avoids unnecessary surface-area changes in consumers.

## Detailed Design

### 1. Internal available-space helper

Add a small helper inside `app/src/utils/fileSystem.ts` that reads available space from the current Expo file-system module.

The helper should:

- read the exposed disk-space field from the existing module
- return the numeric byte count when it is present and valid
- return `-1` when the field is absent, non-numeric, or an exception occurs

The helper remains internal to `fileSystem.ts` because no other module currently needs this behavior.

### 2. `getStorageStats()` integration

`getStorageStats()` will keep its existing directory-size aggregation logic unchanged.

After the current `Promise.all` block for directory sizes completes, it will retrieve the available-space value and set:

```ts
available: <real byte count or -1>
```

No other return fields or fallback branches should change.

### 3. Error handling semantics

There are two distinct error-handling paths:

- If directory-size aggregation fails, the function should continue to use the current catch block behavior and return all-zero sizes with `available: 0`, preserving the existing overall failure contract.
- If only the available-space lookup fails while directory sizes succeed, the function should still return the correct size totals and set `available: -1`.

This distinction preserves current behavior while making the new field more useful.

## Testing Strategy

Add focused tests in `app/src/utils/__tests__/fileSystem.test.ts` for:

1. available space successfully reported by the file-system module
2. available space unavailable, causing fallback to `-1`
3. existing directory-size aggregation continuing to work alongside the new lookup

The tests should use the existing `expo-file-system/legacy` mock and extend it only as much as needed to represent the exposed available-space field.

## Risks And Mitigations

### Risk: the Expo file-system API shape differs across platforms or versions

Mitigation:

- treat the field as optional
- validate that the value is numeric before returning it
- fall back to `-1` when unavailable

### Risk: changing `available` semantics could accidentally affect callers

Mitigation:

- keep the field type as `number`
- keep `-1` as the only sentinel for "unknown"
- do not change any current UI consumer in this work item

### Risk: broad refactoring around storage stats

Mitigation:

- keep changes limited to `fileSystem.ts` and its test file
- do not redesign `getStorageStats()` or related UI controllers

## Implementation Boundaries

The implementation should remain minimal:

- No new package installation.
- No changes outside `app/src/utils/fileSystem.ts` and `app/src/utils/__tests__/fileSystem.test.ts` unless tests require a tiny adjustment.
- No UI updates to display available space.

## Success Criteria

- `getStorageStats()` returns real available-space bytes when the current file-system API exposes them.
- `getStorageStats()` returns `-1` when available-space information is not obtainable but other stats still compute normally.
- Existing size aggregation behavior remains unchanged.
- Focused tests cover both the real-value and fallback cases.
