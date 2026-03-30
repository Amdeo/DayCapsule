# EntryCard Test Wait Hardening Design

## Summary

This batch removes the remaining isolated `Promise.resolve()` timing flush from `app/src/components/__tests__/EntryCard.test.tsx`. The change is intentionally tiny: replace the microtask-based wait in the processing-voice interaction test with a more explicit synchronization point or eliminate the wait entirely if the current assertion can already be made immediately.

The goal is to finish this small piece of test hardening without expanding into other component or service tests.

## Goals

- Remove the remaining `await Promise.resolve()` usage from `EntryCard.test.tsx`.
- Keep the tested behavior exactly the same: processing voice entries must not trigger playback.
- Avoid widening the batch into other tests.

## Non-Goals

- No broader `EntryCard` test refactor.
- No changes to other component tests.
- No production code changes unless the test reveals a real mismatch.

## Current Problem

`app/src/components/__tests__/EntryCard.test.tsx` still contains one residual microtask flush in the test that presses the processing voice button and expects playback not to start.

That wait is fragile because it implies an asynchronous phase boundary without proving what observable condition is actually being awaited.

## Proposed Approach

### 1. Prefer removing the wait entirely if the assertion is already synchronous

If pressing the processing voice placeholder does not schedule any meaningful async work for this behavior, the cleanest fix is to delete the `await Promise.resolve()` and assert immediately after the press.

### 2. If a wait is still required, make it explicit and behavior-tied

If the test truly needs to observe a deferred boundary, use a condition tied to real observable behavior rather than a raw microtask tick. Examples would include a mock call count, explicit deferred checkpoint, or a rendered state that changes.

### 3. Keep the batch test-only unless a real mismatch is exposed

The expectation is that this is only a test cleanup. Only change production `EntryCard` code if removing the microtask flush exposes a genuine behavior bug.

## Files In Scope

### Directly modified

- `app/src/components/__tests__/EntryCard.test.tsx`

### Conditionally modified only if a real mismatch is exposed

- `app/src/components/entry-card/useEntryCardController.ts`
- related `entry-card` files only if required by a discovered bug

## Testing Strategy

Minimum required proof for this batch:

- `EntryCard.test.tsx` no longer uses `Promise.resolve()` in the targeted processing-voice test
- the targeted `EntryCard` test file passes
- full `npm run verify` passes

## Risks And Mitigations

### Risk: the removed wait was masking a real async behavior

Mitigation:

- run the targeted test file immediately after the rewrite
- only touch production code if a real behavior mismatch appears

### Risk: batch scope creeps into a wider `EntryCard` cleanup

Mitigation:

- keep this batch strictly to the one residual wait usage

## Success Criteria

This batch is complete when all of the following are true:

- `EntryCard.test.tsx` no longer relies on `Promise.resolve()` in the targeted test
- the tested processing-voice behavior is still covered
- no unnecessary production refactor was introduced
- full `npm run verify` passes
