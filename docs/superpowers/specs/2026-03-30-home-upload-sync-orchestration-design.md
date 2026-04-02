# Home Upload Sync Orchestration Design

## Summary

This batch extracts the most coupled upload/sync coordination logic out of `app/app/(tabs)/index.tsx` without changing the Home screen UI structure. The goal is to make `HomeScreen` thinner by moving queue callback wiring, cloud-sync-indicator refresh triggering, and upload enqueue decisions into a small orchestration service that the screen can call.

The design is intentionally narrow. It does not attempt to redesign the entire Home screen into a large coordinator, and it does not touch the recording/editor UI composition. It only targets the upload/sync side effects that currently make the screen responsible for too much non-visual coordination.

## Goals

- Reduce `HomeScreen`'s direct responsibility for upload/sync orchestration.
- Centralize queue-callback-to-entry-state updates and cloud sync indicator refresh triggers.
- Centralize upload enqueue decisions for voice/photo cloud mode paths.
- Preserve current runtime behavior and screen-level public behavior.

## Non-Goals

- No broad Home screen coordinator rewrite.
- No UI structure changes to `Timeline`, `Sidebar`, or `TextEditor` composition.
- No major refactor of recording flow outside the upload/sync boundaries needed by this batch.
- No changes to queue implementations themselves beyond what is required to keep current APIs compatible.

## Current Problem

`app/app/(tabs)/index.tsx` currently mixes UI composition, media flow control, and upload/sync side-effect orchestration in one file. The highest-value non-visual coupling appears in three places:

1. queue callback registration for voice/photo uploads
2. repeated cloud sync indicator refresh triggers after queue state transitions
3. inline enqueue decision-making in photo/voice cloud-mode flows

This makes `HomeScreen` harder to reason about because upload lifecycle policy is embedded directly in the page. It also makes tests more coupled to the screen file than they need to be.

## Proposed Approach

### 1. Extract a small Home upload/sync orchestration service

Create a focused service module under `app/src/services/` whose job is to coordinate Home-screen-specific upload/sync behavior. This module should own:

- wiring upload queue callbacks to entry store updates
- triggering cloud sync indicator refresh after relevant transitions
- deciding when to enqueue photo/voice uploads in cloud-mode paths

This service should not own rendering, screen state, or editor visibility.

### 2. Keep `HomeScreen` as a thin composition and invocation layer

`HomeScreen` should still:

- assemble UI components
- invoke media services
- pass handlers into `Timeline`

But it should no longer contain the detailed queue callback registration objects or duplicate refresh logic inline. Instead, it should delegate those orchestration responsibilities to the extracted service.

### 3. Prefer pure/focused functions over a stateful class

For this batch, the orchestration layer should be built from small exported functions rather than a large mutable class. A likely split is:

- one function to register/configure queue callbacks for Home screen behavior
- one function to resolve upload enqueue behavior for photo/voice cloud-mode paths
- one or more small helpers for applying entry sync state transitions

This keeps the extraction minimal and easier to test in isolation.

### 4. Preserve current queue and store integration points

The service should adapt to existing integrations rather than forcing a larger rewrite. It should keep using:

- `configureVoiceUploadQueueCallbacks`
- `configurePhotoUploadQueueCallbacks`
- `enqueueVoiceUpload`
- `enqueuePhotoUpload`
- `useEntryStore.setState(...)`
- `useCloudSyncIndicatorStore.getState().refresh()`

The point is to move orchestration policy out of the screen, not to redesign the underlying queue/store systems in this batch.

## Files In Scope

### Directly modified

- `app/app/(tabs)/index.tsx`
- new focused service file under `app/src/services/` for Home upload/sync orchestration
- new service test file under `app/src/services/__tests__/`

### Likely read for context

- `app/src/services/voiceUploadQueue.ts`
- `app/src/services/photoUploadQueue.ts`
- `app/src/store/cloudSyncIndicatorStore.ts`
- `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts`
- `app/app/(tabs)/__tests__/index.photo.test.ts`
- `app/src/components/__tests__/timeline/timeline.home.sync-status.test.tsx`

## Testing Strategy

The implementation must follow TDD.

Minimum required proof for this batch:

- one focused service test proving queue callback wiring updates entry sync states and refreshes the cloud sync indicator
- one focused service test proving enqueue decisions stay correct for photo and/or voice cloud-mode paths
- existing Home screen tests covering voice/photo cloud mode continue to pass
- full `pnpm run verify` passes

The tests should prove behavior through the extracted orchestration API, not by requiring the entire screen to be mounted for every branch.

## Risks And Mitigations

### Risk: extraction becomes a disguised large coordinator refactor

If too many Home responsibilities are moved at once, this batch will become larger than intended.

Mitigation:

- keep scope limited to upload/sync coordination only
- leave recording and editor flow structure mostly intact
- move only the repeated queue/refresh/enqueue policy code

### Risk: behavior drift in sync status transitions

The queue callback registration currently updates entry sync status in-place in the screen. Moving it out could accidentally alter transition behavior.

Mitigation:

- encode the transition behavior in focused service tests before/while extracting
- keep exact state mappings the same unless a bug is intentionally being fixed

### Risk: screen remains too coupled after extraction

This batch is small, so `HomeScreen` will still keep other orchestration concerns.

Mitigation:

- accept this as a focused first extraction
- make the new service boundary clear enough that later recording/media extractions can build on it

## Success Criteria

This batch is complete when all of the following are true:

- `HomeScreen` no longer directly owns the queue callback wiring details for upload/sync state transitions
- cloud sync indicator refresh triggering for upload queue transitions is centralized in the extracted service
- upload enqueue decisions for the targeted photo/voice cloud-mode paths are centralized in the extracted service
- existing Home voice/photo cloud-mode tests pass
- full `pnpm run verify` passes
