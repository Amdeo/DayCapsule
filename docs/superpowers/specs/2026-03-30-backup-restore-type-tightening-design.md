# 2026-03-30 Backup Restore Type Tightening Design

## Summary

Remove the last remaining production `as any` usages in `app/src/components/backup-page/useBackupPageController.ts` by tightening the backup import types passed through `SyncService`, `restoreEntries`, and `updateEntry`.

This change is intentionally narrow. It does not redesign backup import behavior, change restore flow semantics, or attempt to solve all remaining type looseness in the backup system.

## Goals

- Remove the two remaining production `as any` usages in `useBackupPageController.ts`.
- Align `UseBackupPageControllerOptions` with the real downstream contracts already used by the store and data source.
- Make the backup import media payload shape explicit enough that controller code can update restored media without type escapes.
- Preserve current import behavior, including old single-object media compatibility.

## Non-Goals

- Rewrite the backup file format.
- Refactor backup import architecture beyond what is needed to remove the unsafe casts.
- Change `apiClient.ts` multipart upload typing.
- Clean up test-only `as any` usages.

## Current State

`useBackupPageController.ts` still has two production casts:

```ts
const insertedIds = await restoreEntries(data.entries as any);
...
await updateEntry(entry.id as string, {
  media: entry.media as any,
});
```

However, the actual downstream contracts are already narrower:

- `entryStore.restoreEntries(entries: Entry[]): Promise<string[]>`
- `entryStore.updateEntry(id: string, updates: Partial<Entry>): Promise<void>`
- `localDataSource.restoreEntries(entries: Entry[]): Promise<string[]>`
- `localDataSource.updateEntry(id: string, updates: Partial<Entry>): Promise<void>`

The main reason casts remain is that `SyncService.BackupData.entries` is currently typed too loosely as:

```ts
Partial<Entry & { media: any }>[]
```

and `extractMediaFromZip()` internally treats `media` as `any` to support both old single-object and new array-shaped backup media.

## Chosen Approach

Introduce a small backup-specific entry type in `SyncService` that models the actual import format more explicitly:

- backup entries are still partial because imports may omit optional fields
- `media` may be absent, a single media-like object, or an array of media-like objects

Then make `extractMediaFromZip()` return a controller-friendly array of backup entries where `media` is normalized to `MediaInfo[] | undefined` before the controller consumes it.

With that change in place, `useBackupPageController.ts` can use the real contracts:

- `restoreEntries(entries: Entry[])`
- `updateEntry(id: string, updates: Partial<Entry>)`

without `as any`.

This approach is preferred because it removes the unsafe casts at the source of the looseness while keeping old backup media compatibility behavior intact.

## Detailed Design

### 1. Backup entry types in `SyncService`

Define a backup-specific media shape and backup-specific entry shape near `BackupData`.

The entry type should:

- include the fields needed for restore
- keep optionality appropriate for imported data
- allow `media` in two input forms:
  - legacy single object
  - current array form

The goal is not to perfectly model every historical backup variant, only to represent the shapes that current code already supports.

### 2. Normalize media shape in `extractMediaFromZip()`

`extractMediaFromZip()` currently already normalizes `e.media` into an array internally.

Keep that behavior, but make the return type explicit so the controller receives entries whose `media` field is either:

- `undefined`
- or a normalized `MediaInfo[]`

This allows `useBackupPageController.ts` to update restored media with `Partial<Entry>` directly.

### 3. Controller option contract tightening

In `useBackupPageController.ts`, change:

- `restoreEntries: (entries: any) => Promise<string[]>`
- `updateEntry: (id: string, updates: any) => Promise<void> | void`

to the real contract:

- `restoreEntries: (entries: Entry[]) => Promise<string[]>`
- `updateEntry: (id: string, updates: Partial<Entry>) => Promise<void> | void`

Then remove the two `as any` usages and pass typed values directly.

### 4. Preserve restore behavior

Behavior must remain unchanged:

- canceled import still exits quietly
- partial media restore failure still shows the existing partial-restore alert
- zero restored entries still skips media extraction
- restored media arrays still persist via `updateEntry`

Existing `BackupPage.test.tsx` coverage already exercises these flows and should continue to pass.

## Testing Strategy

Prefer the existing backup-page tests because they already cover:

- import parse failure
- user-canceled import
- partial media restore failure
- zero restored entries
- successful restored media persistence

Add or adjust tests only if the new types require a small fixture update to match the tightened contracts.

Expected verification scope:

- `app/src/components/__tests__/BackupPage.test.tsx`
- `npm run typecheck`
- `npm run verify`

## Risks And Mitigations

### Risk: breaking support for old single-object media backups

Mitigation:

- keep normalization logic in `extractMediaFromZip()`
- explicitly support both single-object and array media input forms in backup-specific types

### Risk: tightening controller input types too aggressively

Mitigation:

- align controller options with the real store/data-source contracts already in use
- keep imported entry shape partial where needed

### Risk: scope expands into broader backup refactoring

Mitigation:

- limit changes to `SyncService` type definitions, normalization return types, and `useBackupPageController.ts`
- do not redesign import architecture or unrelated services

## Implementation Boundaries

The implementation should remain minimal:

- No backup-format migration.
- No behavior changes to import/export flows.
- No changes to `apiClient.ts`.
- No cleanup of unrelated test-only casts.

## Success Criteria

- `useBackupPageController.ts` no longer contains production `as any` usages.
- `restoreEntries` and `updateEntry` are typed to their real contracts.
- `SyncService` still supports both legacy single-object media and current array media in imported backups.
- Relevant backup-page tests and project verification pass.
