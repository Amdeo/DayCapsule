# Service Test Wait Hardening Design

## Summary

This batch removes two remaining service-test timing patterns that still rely on microtask flushing instead of explicit observable conditions:

- `app/src/services/__tests__/cloudSyncOverviewService.test.ts`
- `app/src/services/__tests__/voiceService.test.ts`

The goal is to make these tests less timing-fragile without broadening the cleanup across unrelated files. This is a deliberately narrow batch focused on replacing `Promise.resolve()` wait patterns with more direct synchronization around the behavior each test actually needs to observe.

## Goals

- Eliminate `Promise.resolve()`-style timing control from the targeted service tests.
- Replace implicit microtask advancement with explicit observable progress or controlled deferred behavior.
- Preserve the same tested behavior and scope.

## Non-Goals

- No repo-wide timing cleanup.
- No changes to unrelated tests such as `EntryCard` or other service suites.
- No production service behavior changes unless a test exposes a real mismatch.

## Current Problem

Two service tests still use microtask flushing as a stand-in for “the service has progressed far enough”:

1. `cloudSyncOverviewService.test.ts`
   - uses `await Promise.resolve()` while manually draining queued file-stat resolvers
2. `voiceService.test.ts`
   - uses `await Promise.resolve()` after `stopRecording()` to assume the service has entered its finalize phase

These patterns are fragile because they depend on event-loop timing rather than on explicit state transitions or observable side effects.

## Proposed Approach

### 1. Replace microtask flushing with explicit progress signals

For `cloudSyncOverviewService.test.ts`, the test should wait on a condition that proves the concurrency window has opened or the expected queued resolvers are present, rather than just yielding one microtask turn.

The preferred direction is to wait for observable state that the test already controls, for example:

- the resolver queue length
- the active in-flight count
- the resolved-count progress after each drain batch

### 2. Replace stop-recording microtask waiting with an explicit deferred boundary

For `voiceService.test.ts`, the test already controls a deferred `getFileInfo()` resolution. Instead of using `await Promise.resolve()` to hope the stop flow has advanced far enough, the test should synchronize on an explicit condition tied to the in-progress stop call, such as:

- a promise checkpoint inside the mocked dependency
- a controlled observable call count or captured phase marker

The point is to prove “stop is still finalizing” through something the test can directly observe, not by letting one microtask tick elapse.

### 3. Keep the batch test-only unless a real service mismatch is found

These tests are intended to become more explicit without changing production behavior. If a test rewrite reveals that the production service lacks an observable seam needed for correct synchronization, only then should we consider a minimal implementation change. The default expectation is test-only changes.

## Files In Scope

### Directly modified

- `app/src/services/__tests__/cloudSyncOverviewService.test.ts`
- `app/src/services/__tests__/voiceService.test.ts`

### Conditionally modified only if a real mismatch is exposed

- `app/src/services/cloudSyncOverviewService.ts`
- `app/src/services/voiceService.ts`

## Testing Strategy

Minimum required proof for this batch:

- `cloudSyncOverviewService.test.ts` no longer uses `Promise.resolve()` for concurrency progression in the targeted test
- `voiceService.test.ts` no longer uses `Promise.resolve()` to observe stop-recording finalization timing
- both targeted test files pass
- full `pnpm run verify` passes

## Risks And Mitigations

### Risk: tests become too coupled to internals

If the replacement waits inspect too much internal implementation detail, the tests can become brittle in a different way.

Mitigation:

- prefer waiting on state already exposed by the test harness itself
- avoid asserting private internals of the production service unless necessary

### Risk: hidden service mismatch appears

When removing microtask flushes, a test may reveal the service does not expose enough observable behavior to synchronize cleanly.

Mitigation:

- allow a minimal production change only if the test exposes a real mismatch
- keep any such production change narrowly scoped and behavior-preserving

### Risk: scope creep into other tests

There are other residual timing cleanups available elsewhere.

Mitigation:

- keep this batch strictly limited to the two named service tests

## Success Criteria

This batch is complete when all of the following are true:

- the two targeted service tests no longer rely on `Promise.resolve()` timing flushes
- their assertions still validate the same behavior
- no unnecessary production refactor was introduced
- full `pnpm run verify` passes
