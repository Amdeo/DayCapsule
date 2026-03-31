# 2026-03-31 Optimize Report Batch 1 Design

## Summary

Implement a small, high-impact optimization batch that improves sync-query performance, prevents recorder leaks when the voice modal closes unexpectedly, reduces unnecessary Zustand-driven rerenders in the heaviest UI paths, and replaces low-value database-row `any` usage with explicit row typing.

This batch is intentionally narrow. It does not include the higher-cost tag upsert rewrite, store splitting, or FTS5 search work.

## Goals

- Add the missing `entries.sync_status` index used by sync and upload flows.
- Ensure closing the voice recorder modal always stops and discards any in-progress recording session.
- Reduce avoidable rerenders caused by whole-store Zustand subscriptions in the main timeline and entry-card hot paths.
- Replace `row: any` in database row conversion code with an explicit row shape.
- Preserve all existing user-visible behavior outside the approved cleanup semantics.

## Non-Goals

- Rewrite `upsertEntryTags` into a batch SQL implementation.
- Split `entryStore` into multiple stores.
- Introduce SQLite FTS5 or redesign search behavior.
- Change recorder UI copy, save flow, or modal layout.
- Refactor unrelated store consumers outside the approved hot paths.

## Approved Scope

Files expected to change:

- `app/src/database/sqlite.ts`
- `app/src/database/operations.ts`
- `app/src/components/voice-recorder/useVoiceRecorderController.ts`
- `app/src/components/Timeline.v2.tsx`
- `app/src/components/EntryCard.tsx`
- Relevant existing tests under `app/src/database/__tests__/` and `app/src/components/__tests__/`

## Approaches Considered

### Approach A: Minimal hot-path fixes only

Add the missing index, clean recorder teardown on modal close, tighten the two hottest `useEntryStore()` call sites, and type the database rows.

Pros:

- Lowest risk.
- Fast to validate.
- Directly addresses the highest-value findings.

Cons:

- Leaves other whole-store subscriptions in place.
- Does not address the larger tag-write bottleneck.

### Approach B: Broader store subscription cleanup

Apply selector cleanup to every component currently using `useEntryStore()` without selectors.

Pros:

- More comprehensive rerender reduction.

Cons:

- Larger edit surface.
- Higher regression risk for a first pass.
- Harder to verify as one batch.

### Approach C: Architectural cleanup batch

Combine the minimal fixes with tag batching and store decomposition.

Pros:

- More future-proof.

Cons:

- Scope expands significantly.
- Blends low-risk fixes with medium/high-risk refactors.
- Slower to review and harder to revert.

## Chosen Approach

Use Approach A.

This keeps the work aligned with the approved "high-return, low-risk" batch: fix the missing DB index, guarantee recorder cleanup when visibility changes, tighten the hottest whole-store subscriptions first, and improve typing in the DB mapping layer without changing behavior.

## Detailed Design

### 1. Sync-status index

Add:

```sql
CREATE INDEX IF NOT EXISTS idx_entries_sync_status ON entries(sync_status);
```

to the existing index initialization block in `app/src/database/sqlite.ts`.

Reasoning:

- `getEntriesBySyncStatus`, `getVoiceEntriesBySyncStatus`, and `getPhotoEntriesBySyncStatus` are used by cloud sync, upload queues, and first-page timeline loading.
- These queries currently filter on `sync_status` without a supporting index.
- A single-column index is the smallest safe fix and preserves migration simplicity.

### 2. Recorder teardown when modal closes

In `app/src/components/voice-recorder/useVoiceRecorderController.ts`, treat modal dismissal as cancellation, not completion.

Design decision:

- When `visible` becomes `false`, call `VoiceService.cancelRecording()` before resetting local state.
- The cleanup should also protect against component unmount while a recording is active.
- Do not call `stopRecording()` from visibility cleanup because closing the modal should discard the temporary recording instead of moving it into the finished state.

Expected result:

- No dangling microphone/recorder session after modal close.
- No saved recording produced from an implicit close action.

### 3. Selector tightening for hot UI paths

Replace whole-store subscriptions in the approved hot paths with narrow selectors.

Approved targets:

- `app/src/components/Timeline.v2.tsx`
- `app/src/components/EntryCard.tsx`

Design decision:

- Read only the state/actions each component actually needs.
- Prefer individual selectors or a shallow-selected object, depending on what keeps the component readable with the fewest edits.
- Do not broaden this pass into every existing `useEntryStore()` consumer.

Expected effect:

- Timeline rerenders stop reacting to unrelated store fields.
- Entry cards no longer subscribe to the full store just to access playback state/actions.
- This reduces unnecessary list churn without changing store behavior.

### 4. Explicit database row typing

In `app/src/database/operations.ts`, replace the low-value `row: any` inputs used by row normalization with an explicit row type that covers the fields currently read by:

- `getLegacyEntryMedia`
- `rowToEntry`

Design decision:

- Keep the row type local to the file.
- Type only the fields currently read by the conversion logic.
- Do not attempt a full rewrite of every SQL parameter array type in this batch.

Expected effect:

- Safer refactoring around DB mapping.
- Better compiler help when adding/removing columns referenced by row conversion.

## Testing Strategy

Use existing focused tests and add the smallest regression coverage needed for the new behavior.

Validation targets:

- `app/src/database/__tests__/operations.test.ts`
  - verify the schema initialization SQL includes the `sync_status` index.
  - keep existing CRUD and sync-status query coverage green.
- `app/src/components/__tests__/VoiceRecorder.test.tsx`
  - add coverage for dismissing the modal by toggling `visible` to `false` after recording has started.
  - verify `VoiceService.cancelRecording()` is called.
- Timeline and entry-card tests
  - keep relevant existing tests green after selector changes.
  - only add test updates if the selector refactor changes mocking requirements.

## Risks And Mitigations

### Risk: recorder cleanup runs when no recording is active

Mitigation:

- use `cancelRecording()` which already no-ops safely when no recorder exists.
- avoid introducing separate visibility-dependent branching in multiple places.

### Risk: selector refactor breaks tests that mock `useEntryStore()` loosely

Mitigation:

- update only the affected tests.
- keep the selectors simple and aligned with existing store field names.

### Risk: row typing becomes too strict for optional columns

Mitigation:

- mark optional database fields as optional or nullable in the local row type.
- limit typing to fields actually read in the conversion path.

## Implementation Boundaries

- No new dependencies.
- No commit unless explicitly requested.
- No changes outside the approved file set unless a directly affected test must be updated.
- No architecture refactor hidden inside this optimization batch.

## Success Criteria

- `sqlite.ts` initializes an index for `entries.sync_status`.
- Closing the voice recorder modal cancels any active recording session before local state reset.
- `Timeline.v2.tsx` and `EntryCard.tsx` no longer subscribe to the full `entryStore`.
- Database row mapping no longer uses `row: any` in the approved conversion helpers.
- Relevant tests pass.
