# RenderSettingsPage Helper Stability Design

## Summary

This batch adds a dedicated helper-facing stability test layer for `renderSettingsPage`, mirroring the stability layer recently added for `renderHomeScreen`. The helper already has state and stability coverage, but those guarantees are currently spread across a mixed file. This batch creates a smaller, more explicit stability-focused test surface for the highest-value contracts.

The default expectation is test-only work. Helper implementation changes should happen only if the new stability tests reveal a real mismatch.

## Goals

- Add a dedicated helper-facing stability test file for `renderSettingsPage`.
- Encode a small number of high-value stability contracts clearly.
- Keep the helper API and production Settings code unchanged unless a real mismatch is exposed.

## Non-Goals

- No broad `renderSettingsPage` rewrite.
- No duplication of the entire existing `state` or page test surface.
- No production Settings behavior changes unless a new stability test reveals a bug.

## Current Problem

`renderSettingsPage` already has useful helper tests, but its “stability” concerns are not separated as a narrow contract layer in the same way we now do for `renderHomeScreen`. The current file mixes together:

- initial-settle timing behavior
- cross-render captured login prop reset behavior

That is workable, but still less explicit than a small, contract-oriented stability surface dedicated to the helper's highest-value guarantees.

## Proposed Approach

### 1. Add a focused `renderSettingsPage.stability.test.tsx`

Create or refactor toward a dedicated helper-facing stability file under:

- `app/src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx`

This file should remain small and contract-oriented.

### 2. Cover high-value helper stability contracts only

The preferred stability contracts are:

- the helper does not resolve early before the page's initial observable stable state exists
- a later render does not leave earlier captured login state behind

If one of those contracts is already strongly represented, the batch may mainly be about reshaping and clarifying the stability layer rather than adding brand-new behavior.

### 3. Keep the batch test-only unless a real mismatch appears

If the helper already satisfies the intended contracts, no helper implementation changes should be made. The value of this batch is in making those guarantees clearer and more maintainable as a distinct test layer.

## Files In Scope

### Directly modified

- `app/src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx`

### Conditionally modified only if a real mismatch is exposed

- `app/src/components/__tests__/helpers/renderSettingsPage.tsx`

## Testing Strategy

Minimum required proof for this batch:

- one explicit stability contract around initial render settling
- one explicit stability contract around cross-render login state reset
- no unnecessary duplication with `renderSettingsPage.state.test.tsx`
- full `pnpm run verify` passes

## Risks And Mitigations

### Risk: duplicating existing helper-state coverage

Mitigation:

- keep the new/updated stability file focused on only a few contracts
- avoid reasserting everything already covered by `renderSettingsPage.state.test.tsx` or page-level tests

### Risk: turning the batch into another helper refactor

Mitigation:

- default to test-only work
- only permit helper changes if a new stability test exposes a real failure

### Risk: tests become too timing-implementation-aware

Mitigation:

- assert helper behavior through observable outcomes rather than private sequencing details
- keep any timeout/race logic tightly scoped to the specific “must not resolve early” contract

## Success Criteria

This batch is complete when all of the following are true:

- `renderSettingsPage` has a clear helper-facing stability test layer
- the key settle/login-reset contracts are encoded there clearly
- no unnecessary helper/production refactor was introduced
- full `pnpm run verify` passes
