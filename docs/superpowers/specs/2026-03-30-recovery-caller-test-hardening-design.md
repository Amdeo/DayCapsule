# Recovery Caller Test Hardening Design

## Summary

This batch tightens caller-side tests around the recovery flow that was recently extracted. The goal is not to change runtime recovery behavior again. The goal is to ensure bootstrap and lifecycle callers still own their critical responsibilities and that those responsibilities are directly asserted by tests after the shared `cloudRecoveryFlowService` extraction.

The main gaps to close are:

- caller-side gating for whether cloud sync should run
- caller behavior when `refreshCloudSyncIndicator` fails
- caller preservation of contextual warning handling after moving sequence orchestration into a shared flow

## Goals

- Add direct caller-side test coverage for recovery gating behavior.
- Add direct caller-side test coverage for refresh-error handling/propagation.
- Preserve current production behavior unless the new tests reveal a genuine inconsistency.

## Non-Goals

- No new recovery coordinator.
- No additional production refactor unless tests expose a real bug.
- No change to the shared `cloudRecoveryFlowService` boundary unless required by a discovered inconsistency.
- No change to queue recovery semantics.

## Current Problem

After extracting `cloudRecoveryFlowService`, the bootstrap/lifecycle caller tests mostly validate that the callers delegate to the shared flow and preserve warning wording. But they no longer directly pin down some caller-only semantics, including:

- when cloud sync should be skipped because caller preconditions say it should not run
- how refresh failures are handled at the caller level

That creates a testing blind spot: the code still appears correct today, but future changes to caller gating or refresh handling would be easier to miss because the shared flow is now heavily mocked in the caller tests.

## Proposed Approach

### 1. Tighten caller tests before touching production code

This batch should start by expanding `appBootstrapService.test.ts` and `appLifecycleService.test.ts` with failing tests that assert caller-only behavior. The priority scenarios are:

- bootstrap does not invoke cloud sync when `needs-decision` or other caller preconditions block it
- lifecycle does not invoke cloud sync when auth/cloudMode gating says recovery sync should be skipped
- refresh failures still surface through the current caller behavior (bootstrap failure path vs lifecycle caller catch path)

### 2. Prefer partial mocks over total behavior replacement where needed

If the current tests mock the shared flow too aggressively to assert caller gating, introduce narrower mock behavior or test seams that still allow the caller-provided closures to be exercised. The intent is not to stop mocking entirely, but to make sure the tests observe the caller's logic rather than only asserting that a shared service was called.

### 3. Only make production changes if tests expose a real mismatch

If the new tests pass after minimal test restructuring, this batch should remain test-only. If a new test fails because caller behavior truly drifted, then make the smallest production fix necessary to restore the approved recovery semantics.

## Files In Scope

### Directly modified

- `app/src/services/__tests__/appBootstrapService.test.ts`
- `app/src/services/__tests__/appLifecycleService.test.ts`

### Conditionally modified only if tests reveal a real mismatch

- `app/src/services/appBootstrapService.ts`
- `app/src/services/appLifecycleService.ts`
- `app/src/services/cloudRecoveryFlowService.ts`

## Testing Strategy

Minimum required proof for this batch:

- one caller-side bootstrap test that directly validates cloud sync gating intent
- one caller-side lifecycle test that directly validates auth/cloudMode gating intent
- one caller-side test covering refresh failure behavior
- focused bootstrap/lifecycle tests pass
- full `pnpm run verify` passes

## Risks And Mitigations

### Risk: tests become too implementation-aware

If tests assert too much about internal closure shapes, they may become brittle.

Mitigation:

- test caller-owned behavior, not incidental implementation details
- prefer asserting whether sync ran, warnings fired, or failures propagated over inspecting private internals

### Risk: batch turns into another recovery refactor

It would be easy to use this as a reason to rewrite the flow service again.

Mitigation:

- default to test-only changes
- only permit production edits if a real behavior mismatch is exposed

### Risk: refresh failure semantics remain ambiguous

The current code may be correct but not obvious.

Mitigation:

- make the current expected behavior explicit in tests
- if ambiguity remains after that, choose one interpretation and encode it clearly

## Success Criteria

This batch is complete when all of the following are true:

- bootstrap caller gating is directly covered by tests
- lifecycle caller gating is directly covered by tests
- refresh failure handling/propagation is directly covered by tests
- no unnecessary production refactor was introduced
- full `pnpm run verify` passes
