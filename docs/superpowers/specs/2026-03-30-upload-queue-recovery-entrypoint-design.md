# Upload Queue Recovery Entrypoint Design

## Summary

This batch creates a single service-level entrypoint for flushing pending upload queues so bootstrap-time and lifecycle-time recovery stop duplicating that logic. The goal is to keep the scope narrow: unify only the voice/photo queue flush entrypoint, without expanding into a higher-level recovery coordinator.

The result should be that `appBootstrapService` and `appLifecycleService` both depend on one focused upload recovery service instead of each directly importing and calling `flushPendingVoiceUploads()` and `flushPendingPhotoUploads()`.

## Goals

- Define one focused service entrypoint for flushing pending upload queues.
- Remove direct queue-flush duplication from `appBootstrapService` and `appLifecycleService`.
- Preserve current runtime behavior and warning/error logging semantics.

## Non-Goals

- No broad recovery coordinator that also owns sync, indicator refresh, or auth checks.
- No changes to upload queue implementation behavior.
- No refactor of unrelated bootstrap or lifecycle logic.
- No change to when recovery runs; only how queue flush is invoked.

## Current Problem

Two services currently duplicate the same queue recovery responsibility:

- `app/src/services/appBootstrapService.ts`
- `app/src/services/appLifecycleService.ts`

Both directly import:

- `flushPendingVoiceUploads()`
- `flushPendingPhotoUploads()`

and both call them in sequence with similar warning handling. This creates an unnecessary duplication point in recovery behavior and leaves no single place to evolve upload queue recovery policy.

## Proposed Approach

### 1. Add a focused upload queue recovery service

Create a small service module under `app/src/services/` that exposes one entrypoint for flushing pending upload queues. Its responsibility is only:

- call voice queue flush
- call photo queue flush
- preserve current error-isolated behavior so one failure does not prevent the other call from running

It should not know about app foregrounding, bootstrap phases, auth, cloud mode, or sync indicator refresh.

### 2. Keep calling services responsible for context-specific logging and follow-up behavior

`appBootstrapService` and `appLifecycleService` should still decide:

- when recovery runs
- what label/context is used in logs
- what happens after queue recovery finishes

The new shared service should only centralize the queue flush entrypoint itself. This keeps the abstraction honest and avoids prematurely building a larger coordinator.

### 3. Use dependency injection for testability, but keep defaults simple

The new service may accept optional injected flush functions for focused tests, while defaulting to the real queue APIs. That allows isolated service tests without forcing bootstrap/lifecycle tests to mount more infrastructure.

The default production behavior should remain equivalent to today's direct imports.

## Files In Scope

### Directly modified

- new focused service under `app/src/services/` for upload queue recovery
- new test file under `app/src/services/__tests__/`
- `app/src/services/appBootstrapService.ts`
- `app/src/services/appLifecycleService.ts`

### Verification targets

- `app/src/services/__tests__/appBootstrapService.test.ts`
- `app/src/services/__tests__/appLifecycleService.test.ts`
- new upload recovery service test file
- full `pnpm run verify`

## Testing Strategy

The implementation must follow TDD.

Minimum required proof for this batch:

- one focused service test proving both queue flush functions are invoked through the new entrypoint
- one focused service test proving one queue failure does not block the other queue flush attempt
- existing bootstrap/lifecycle tests continue to pass after being updated to mock the new shared entrypoint
- full `pnpm run verify` passes

## Risks And Mitigations

### Risk: abstraction is too thin to justify itself

If the new service is just a pass-through with no focused value, the extraction may not earn its complexity.

Mitigation:

- keep the service narrowly responsible for one repeated recovery behavior
- back it with focused tests so the shared entrypoint becomes the single policy location for queue recovery

### Risk: error handling semantics drift

Today each caller logs queue-specific warnings around flush failures. Moving the entrypoint could accidentally change whether one failure blocks the other.

Mitigation:

- preserve isolated flush attempts
- explicitly test the “one failure does not block the other queue” case
- keep caller-side contextual logging intact where appropriate

### Risk: recovery scope starts growing again

Once a shared recovery service exists, it may tempt later expansion into sync, indicator refresh, and lifecycle orchestration.

Mitigation:

- keep the module name and API focused on upload queue recovery only
- do not move sync or indicator logic in this batch

## Success Criteria

This batch is complete when all of the following are true:

- `appBootstrapService` and `appLifecycleService` no longer directly call both queue flush functions themselves
- one shared upload queue recovery entrypoint is used instead
- focused service tests cover normal invocation and isolated failure behavior
- existing bootstrap/lifecycle tests pass
- full `pnpm run verify` passes
