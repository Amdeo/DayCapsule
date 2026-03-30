# 2026-03-30 Low Risk As-Any Cleanup Design

## Summary

Remove a small, low-risk subset of remaining production `as any` usages by tightening icon-name types for `Ionicons` consumers and narrowing error-code access in the home screen recording flow.

This change set is intentionally narrow. It does not attempt a repository-wide `as any` cleanup and does not touch the higher-risk backup-import or multipart upload call sites.

## Goals

- Remove low-risk production `as any` usages that are caused by overly broad local types rather than unclear runtime behavior.
- Replace ad-hoc `as any` casts around `Ionicons` `name` props with proper compile-time icon-name typing.
- Replace `(error as any)?.code` accesses in the home screen with a small explicit narrowing helper.
- Preserve all existing runtime behavior.

## Non-Goals

- Clean up every remaining `as any` in the repository.
- Change backup import typing in `useBackupPageController.ts`.
- Change multipart upload typing in `apiClient.ts`.
- Refactor unrelated component structure or UI behavior.

## Approved Scope

### Icon-name cleanup

Files in scope:

- `app/src/components/settings-page/SettingRow.tsx`
- `app/src/components/fab-menu/FABMenuView.tsx`
- `app/src/components/timeline-v2/TimelineViewModeToggle.tsx`
- `app/src/components/settings-page/SettingsSegmentedSelector.tsx`
- `app/src/components/entry-card/entryCardAppearance.ts`
- `app/src/components/entry-card/EntryCardDefaultMeta.tsx`

These components currently pass icon names through `as any` when rendering `Ionicons`. The design change is to make the icon-related props and metadata use `ComponentProps<typeof Ionicons>['name']` directly, so the cast disappears at the usage site.

### Error-code narrowing

File in scope:

- `app/app/(tabs)/index.tsx`

This screen currently reads `error.code` via `(error as any)?.code` in two branches:

- `ACTIVE_RECORDING_IN_PROGRESS`
- `PERMISSION_DENIED`

The design change is to add a small local narrowing helper that safely reads a string error code from unknown values.

## Chosen Approach

Use type narrowing at the definition sites, not at the JSX call sites.

For icons, this means changing prop and metadata types to the actual `Ionicons` `name` type. For error-code access, this means introducing a tiny helper that inspects `unknown` errors and returns a string code only when present.

This approach is preferred because it removes the unsafe casts without changing runtime behavior, keeps the implementation local to the affected files, and avoids the broader data-shape work required by the higher-risk `as any` locations.

## Detailed Design

### 1. Shared icon-name typing

Where a component accepts an icon name or stores one in metadata, change the local type from `string` to:

```ts
type IoniconName = ComponentProps<typeof Ionicons>['name'];
```

or an equivalent imported alias that remains local to the file.

Expected effect:

- the compiler validates icon names where they are defined
- JSX call sites no longer need `as any`
- runtime rendering stays unchanged because the actual values remain the same

### 2. Entry-card sync-status metadata

`EntryCardSyncStatusMeta.iconName` is currently typed too broadly as `string | null`.

It should be narrowed to the same `Ionicons` name type union, preserving `null` when no icon is shown.

This makes the downstream render in `EntryCardDefaultMeta.tsx` type-safe without changing the sync-status mapping logic.

### 3. Home-screen error-code helper

Add a very small helper inside `app/app/(tabs)/index.tsx` that receives `unknown` and returns a string code only when:

- the value is an object
- it is not `null`
- it contains a `code` field whose value is a string

The recording-flow error branches will compare against that helper result instead of reading `(error as any)?.code` directly.

Expected effect:

- identical user-facing behavior for active-recording and permission-denied alerts
- removal of the two unsafe casts
- no change to logging or cleanup flow

## Testing Strategy

Prefer using existing tests that already cover the touched components and home-screen recording branches.

Expected validation targets:

- existing component tests that render the icon-bearing settings/timeline/entry-card components
- existing home-screen tests if they already exercise recording error handling
- if the error-code branches are not directly covered, add the smallest targeted regression test for that branch only

## Risks And Mitigations

### Risk: icon prop narrowing exposes incorrect icon-name strings

Mitigation:

- this is desirable compile-time feedback
- keep the runtime icon values unchanged unless the compiler identifies a bad name

### Risk: error helper changes control flow semantics

Mitigation:

- keep the helper minimal and local
- compare only exact string codes already used today
- preserve existing cleanup, logging, and alert ordering

### Risk: accidental expansion into higher-risk `as any` sites

Mitigation:

- explicitly exclude `useBackupPageController.ts` and `apiClient.ts` from this work item
- keep file scope limited to the approved list above

## Implementation Boundaries

The implementation should remain minimal:

- No new dependencies.
- No UI copy or interaction changes.
- No attempt to solve all remaining `as any` usages.
- No refactor of backup import or upload typing.

## Success Criteria

- The approved icon-rendering files no longer use `as any` for `Ionicons` names.
- `app/app/(tabs)/index.tsx` no longer uses `as any` for `error.code` access.
- Runtime behavior remains unchanged.
- Relevant tests and project verification pass.
