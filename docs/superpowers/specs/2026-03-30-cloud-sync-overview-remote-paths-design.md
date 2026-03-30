# 2026-03-30 Cloud Sync Overview Remote Paths Design

## Summary

Fix `app/src/services/cloudSyncOverviewService.ts` so relative server media paths like `/api/media/...` are treated as remote resources, not local filesystem paths, when computing local media byte totals.

This change is intentionally narrow. It adds the missing path classification and a focused regression test, without changing other sync overview behavior.

## Goals

- Stop counting `/api/media/...` paths as local media files.
- Preserve current handling of absolute remote URLs (`http://` and `https://`).
- Keep all other local-media aggregation behavior unchanged.
- Add a precise regression test that locks the new remote-path rule.

## Non-Goals

- Redesign sync overview data shape.
- Refactor all remote/local media-path classification logic across the app.
- Change cloud sync overview UI behavior.
- Touch unrelated sync services or stores.

## Current State

`cloudSyncOverviewService.ts` uses `isRemoteUrl()` to decide whether media URIs should be skipped when summing local media bytes.

Current behavior:

```ts
const isRemoteUrl = (uri: string): boolean => /^https?:\/\//i.test(uri.trim());
```

This correctly excludes absolute remote URLs, but it does not exclude relative server paths like:

- `/api/media/photo-1`
- `/api/media/thumb-1`

As a result, those paths are treated as local filesystem URIs and passed to `FileSystem.getInfoAsync`, which can inflate or distort `local.mediaBytes`.

## Chosen Approach

Extend the existing URI classifier so it also recognizes `/api/media/...` as remote.

This is preferred over a larger path-normalization refactor because:

- the bug is localized to one predicate
- the desired behavior is easy to express with a focused test
- the change has low blast radius

## Detailed Design

### 1. Expand `isRemoteUrl()`

Update the predicate in `app/src/services/cloudSyncOverviewService.ts` so it returns `true` for:

- `http://...`
- `https://...`
- `/api/media/...`

The implementation can stay as a compact regex-based helper.

Expected behavior:

- local `file:///...` URIs are still measured
- `/api/media/...` URIs are skipped
- absolute `http(s)` URIs are skipped

### 2. Add a focused regression test

In `app/src/services/__tests__/cloudSyncOverviewService.test.ts`, add a regression test that provides mixed media entries containing:

- one relative `/api/media/...` photo URI and thumbnail
- one local `file:///...` voice URI

The test should assert that only the local file contributes to `snapshot.local.mediaBytes`, and that `FileSystem.getInfoAsync` is called only for the local file.

## Testing Strategy

Use the existing `cloudSyncOverviewService` unit test file. No broader integration test is needed for this change.

Relevant verification targets:

- `app/src/services/__tests__/cloudSyncOverviewService.test.ts`
- `npm run verify`

## Risks And Mitigations

### Risk: regex matches too broadly

Mitigation:

- keep the rule narrowly scoped to `/api/media` only
- validate with a focused unit test using both remote and local paths

### Risk: future relative remote paths use a different prefix

Mitigation:

- this change intentionally fixes the currently observed `/api/media` case only
- broader path classification can be handled later if new prefixes appear

## Implementation Boundaries

The implementation should remain minimal:

- Only change `cloudSyncOverviewService.ts` and its unit test file.
- Do not touch other sync services.
- Do not change unrelated tests.

## Success Criteria

- `/api/media/...` URIs no longer contribute to `local.mediaBytes`.
- Local file URIs still contribute as before.
- The new regression test passes.
- Project verification remains green.
