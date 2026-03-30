# RenderHomeScreen Helper Stability Design

## Summary

This batch adds a dedicated helper-facing stability test layer for `renderHomeScreen`. The helper's state boundaries were tightened in prior work, but those guarantees currently live inside the broader `renderHomeScreen.state.test.tsx` file. This batch adds a smaller, more explicit stability-focused test surface so the helper's critical isolation guarantees are protected independently of the consumer tests that happen to exercise them.

The default expectation is test-only work. Production and helper implementation changes should happen only if the new stability tests reveal a real mismatch.

## Goals

- Add a dedicated stability test file for `renderHomeScreen`.
- Encode the key helper isolation guarantees as explicit helper-facing stability checks.
- Keep the helper API and production Home code unchanged unless a real mismatch is exposed.

## Non-Goals

- No new helper API design.
- No broad Home test harness rewrite.
- No production Home behavior changes unless a new stability test reveals a real bug.

## Current Problem

`renderHomeScreen` now has significant state isolation coverage, but those assertions live inside a broader state test file and nearby consumer tests. There is no single, narrow “stability contract” test surface equivalent to what `renderSettingsPage` already has.

That makes it harder to understand and protect the helper's highest-value guarantees as one coherent unit:

- one render should not destabilize another render
- helper-exposed triggers should still target the correct render-bound store
- the helper should preserve its default empty-state baseline when no explicit setup is provided

## Proposed Approach

### 1. Add a focused `renderHomeScreen.stability.test.tsx`

Create a dedicated helper-facing stability file under:

- `app/src/components/__tests__/helpers/renderHomeScreen.stability.test.tsx`

This file should express a small number of high-value contracts, not duplicate all existing helper-state coverage.

### 2. Prefer stability-contract tests over implementation-detail tests

The new tests should verify user- or helper-observable outcomes, such as:

- a previous render keeping its own visible Home/timeline state after a later render exists
- a helper-exposed trigger still affecting only the render it came from
- a default render remaining empty and hidden-state by default

They should avoid asserting private helper internals unless a real mismatch makes that unavoidable.

### 3. Keep the batch test-only unless a real mismatch appears

If the helper already satisfies the stability contract, this batch should only add tests. If one of the new tests fails, then make the smallest possible helper fix to restore the already intended behavior.

## Files In Scope

### Directly modified

- new `app/src/components/__tests__/helpers/renderHomeScreen.stability.test.tsx`

### Conditionally modified only if a real mismatch is exposed

- `app/src/components/__tests__/helpers/renderHomeScreen.tsx`

## Testing Strategy

Minimum required proof for this batch:

- one stability test covering cross-render independence
- one stability test covering helper-exposed trigger binding to the correct render
- one stability test covering default empty/hidden baseline semantics
- full `npm run verify` passes

## Risks And Mitigations

### Risk: duplicating too much existing helper-state coverage

Mitigation:

- keep the new file small and contract-oriented
- do not replicate every existing helper-state assertion

### Risk: turning the batch into another helper refactor

Mitigation:

- default to test-only work
- only permit helper code changes if a new stability test fails for a real reason

### Risk: tests become too implementation-aware

Mitigation:

- assert render-visible or helper-returned behavior first
- avoid peeking into private helper internals unless necessary

## Success Criteria

This batch is complete when all of the following are true:

- `renderHomeScreen` has a dedicated helper-facing stability test file
- the key isolation guarantees are encoded there clearly
- no unnecessary helper/production refactor was introduced
- full `npm run verify` passes
