# 2026-03-30 Sync Bootstrap Settlement Fixes Design

## Summary

Extract a small, independent fix from `spec/sync-settlement-test-granularity` that tightens two behaviors in `app/src/services/syncBootstrapService.ts`:

1. only show the photo-repair prompt when returned validation issues actually require a repair prompt
2. skip bootstrap media pre-upload for entries already marked for deletion

This change is intentionally narrow. It does not redesign sync bootstrap, cloud restore, or media upload flow beyond these two behavior corrections.

## Goals

- Restore precise repair-prompt gating during cloud bootstrap.
- Avoid bootstrap media uploads for entries that are already pending deletion or delete operations.
- Keep all other bootstrap state transitions and normalization behavior unchanged.
- Use existing `syncBootstrapService` tests to lock the corrected behavior.

## Non-Goals

- Refactor bootstrap architecture.
- Change import/export data normalization.
- Touch unrelated sync services, stores, or UI.
- Redesign media validation summary handling.

## Current State

The large unmerged branch contains two production behavior changes relative to current `main`:

1. **Repair prompt gating**

Current `main` behavior:

```ts
if (mediaValidationRun.issues.length > 0) {
  showPhotoRepairPrompt();
}
```

This shows the repair prompt for any non-empty issue list, including issues that are already `repair_pending` or otherwise do not require user intervention.

2. **Bootstrap pre-upload skipping**

Current `main` behavior only skips entries with:

- `syncStatus === 'pending_upload'`
- `syncStatus === 'uploading'`

It no longer skips entries that are already logically headed toward deletion, such as:

- `syncStatus === 'pending_delete'`
- `syncOp === 'delete'`
- `deleted === true`

That means first-cloud-backup bootstrap may still try to upload media for entries that should instead be deleted remotely.

## Chosen Approach

Apply the two behavior corrections directly inside the existing bootstrap flow, keeping the implementation local to `syncBootstrapService.ts`.

This is preferred over a larger extraction because:

- both fixes are already encoded in the large branch diff
- the behavior changes are small and independently testable
- existing `syncBootstrapService.test.ts` already contains the right seams to verify them

## Detailed Design

### 1. Prompt only on `repair_prompt_required`

Change the cloud-restore validation branch so it only calls `showPhotoRepairPrompt()` when at least one issue has:

```ts
issue.integrityStatus === 'repair_prompt_required'
```

This preserves existing validation-summary writes and issue replacement, but avoids prompting users for non-actionable states.

### 2. Restore delete-aware pre-upload skipping

When iterating local entries for the initial cloud backup path, restore the delete-aware skip condition.

Entries should be excluded from pre-upload if they are already effectively deletion-bound, using the existing helper:

```ts
shouldSkipBootstrapMediaUpload(entry)
```

This ensures bootstrap does not upload photo media for entries that are already pending delete or otherwise marked as deleted.

### 3. Keep the rest of bootstrap flow unchanged

Do not alter:

- initial sync state transitions
- entry normalization from cloud export
- media validation fallback summary behavior
- upload metadata shape
- writeback semantics for normal local photo bootstrap

This refactor is a small behavior correction, not a general cleanup.

## Testing Strategy

Use the existing `app/src/services/__tests__/syncBootstrapService.test.ts` file.

Relevant coverage already exists or should be minimally adjusted for:

- prompting only when an issue is actually `repair_prompt_required`
- skipping pre-upload for pending-delete/delete entries

Relevant verification targets:

- `app/src/services/__tests__/syncBootstrapService.test.ts`
- `npm run verify`

## Risks And Mitigations

### Risk: prompt gating becomes too strict

Mitigation:

- gate only on `repair_prompt_required`
- keep summary/issue store updates unchanged so other issue states remain visible to the app

### Risk: delete-aware skip also excludes valid upload cases

Mitigation:

- reuse the existing helper `shouldSkipBootstrapMediaUpload(entry)` instead of inventing a new rule
- rely on existing local-backup tests for normal upload behavior

### Risk: broader bootstrap behavior changes slip in

Mitigation:

- limit changes to the two identified conditions only
- verify with the existing focused service test file

## Implementation Boundaries

The implementation should remain minimal:

- Only change `syncBootstrapService.ts` and its unit test file.
- Do not change unrelated sync services.
- Do not refactor bootstrap structure or move code between files.

## Success Criteria

- `showPhotoRepairPrompt()` is only called when validation issues include `repair_prompt_required`.
- bootstrap pre-upload skips entries already marked for deletion.
- existing bootstrap behavior otherwise remains unchanged.
- focused service tests and full project verification pass.
