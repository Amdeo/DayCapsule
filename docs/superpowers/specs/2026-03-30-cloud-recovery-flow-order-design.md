# Cloud Recovery Flow Order Design

## Summary

This batch extracts the shared cloud recovery execution order into one focused flow service, without moving caller-specific preconditions into that shared layer. The target order is the same one already repeated across bootstrap/lifecycle recovery paths:

1. run cloud sync
2. run upload queue recovery
3. refresh the cloud sync indicator

The goal is to define that sequence once, while keeping `appBootstrapService` and `appLifecycleService` responsible for deciding whether recovery should run and what contextual labels should be used.

## Goals

- Define one shared cloud recovery execution order.
- Remove repeated recovery sequencing from bootstrap/lifecycle callers.
- Preserve caller-side precondition checks, labels, and warning wording.

## Non-Goals

- No full recovery coordinator.
- No move of auth/cloudMode gating into the shared flow.
- No redesign of `syncBootstrapService` or queue implementations.
- No change to when bootstrap/lifecycle choose to run recovery.

## Current Problem

The codebase now has a shared upload queue recovery entrypoint, but the next layer up is still duplicated:

- `appBootstrapService` sequences cloud sync, upload queue recovery, and indicator refresh inline.
- `appLifecycleService` sequences cloud sync, upload queue recovery, and indicator refresh inline inside `createCloudRecoveryRunner`.

That means the recovery order still lives in two places even though its underlying queue-flush sub-step has already been centralized.

## Proposed Approach

### 1. Add a focused cloud recovery flow service

Create a small service under `app/src/services/` that owns only the shared recovery order:

- run a provided `syncNow`
- run a provided upload queue recovery operation
- run a provided indicator refresh
- return structured results so callers can keep contextual warning logging

This service should not decide whether any of those steps should run. It should only define the order once a caller has already decided recovery is appropriate.

### 2. Keep caller-specific preconditions in bootstrap/lifecycle

`appBootstrapService` should still decide things like:

- whether cloud mode restoration is active
- whether `syncBootstrapService` produced a `needs-decision` flow

`appLifecycleService` should still decide things like:

- whether auth + cloud mode allow `syncNow`
- when foreground/network-triggered recovery should run

The shared flow should operate on provided functions and labels, not on global app policy.

### 3. Preserve caller-side contextual logging

The shared flow may return structured step results, but it should not absorb bootstrap/lifecycle warning wording. Callers should still log with their own labels and context, for example:

- `启动时云同步失败`
- `${label}entry 云同步失败`
- `启动时补传待上传语音失败`
- `${label}补传待上传照片失败`

That keeps observability local to the caller while still centralizing order.

## Files In Scope

### Directly modified

- new focused service under `app/src/services/` for cloud recovery flow order
- new test file under `app/src/services/__tests__/`
- `app/src/services/appBootstrapService.ts`
- `app/src/services/appLifecycleService.ts`
- related bootstrap/lifecycle test files

### Verification targets

- new cloud recovery flow service test file
- `app/src/services/__tests__/appBootstrapService.test.ts`
- `app/src/services/__tests__/appLifecycleService.test.ts`
- full `pnpm run verify`

## Testing Strategy

The implementation must follow TDD.

Minimum required proof for this batch:

- one focused service test proving the order is `sync -> upload recovery -> indicator refresh`
- one focused service test proving structured results preserve per-step failure information for callers
- existing bootstrap/lifecycle tests continue to pass after adopting the shared flow
- full `pnpm run verify` passes

## Risks And Mitigations

### Risk: shared flow grows into a coordinator

If the new service starts deciding auth/cloudMode policy, it will become larger than intended.

Mitigation:

- accept only injected step functions and labels/results
- keep caller preconditions outside the shared flow

### Risk: caller logging becomes less precise

Centralizing order could flatten step-level errors into a single outcome.

Mitigation:

- return structured per-step results
- keep caller-side logging responsibilities intact

### Risk: bootstrap and lifecycle diverge in subtle ways

The two callers do not always run exactly the same preconditions.

Mitigation:

- unify only the order after caller-specific gating decisions
- do not force both callers through the same outer decision tree

## Success Criteria

This batch is complete when all of the following are true:

- cloud recovery execution order is defined in one shared place
- `appBootstrapService` and `appLifecycleService` keep their own precondition logic
- caller-side contextual logging remains intact
- bootstrap/lifecycle tests pass
- full `pnpm run verify` passes
