# RenderHomeScreen Helper State Hardening Design

## Summary

This batch hardens `renderHomeScreen` by tightening the most leak-prone module-level test state while preserving the helper's public API. The goal is to reduce cross-test coupling in the Home/timeline test harness, without turning this into a broad helper rewrite.

The design mirrors the earlier `renderSettingsPage` hardening approach: keep the existing call surface, identify the most dangerous shared state, and make its lifetime more explicit through reset/per-render boundaries plus focused helper-facing tests.

## Goals

- Reduce cross-test leakage risk in `renderHomeScreen`.
- Make the most dangerous module-level state behave with clearer reset/per-render boundaries.
- Preserve the current external helper API used by Home/timeline tests.

## Non-Goals

- No broad rewrite of `renderHomeScreen` into a new test harness abstraction.
- No changes to production Home screen behavior.
- No large call-site migration across Home/timeline tests.

## Current Problem

`app/src/components/__tests__/helpers/renderHomeScreen.tsx` still keeps several important values at module scope, including:

- `mockSourceEntries`
- `mockAllTags`
- `mockCloudSyncUiState`
- `mockEntryStoreState`

That structure works today, but it means helper behavior can silently depend on state left behind by a previous render or test, especially when store selectors, filter application, and imperative control helpers all read/write the same ambient module variables.

The risk is not that all module state must disappear. The risk is that state behaving like per-render setup or captured runtime state is still represented as global mutable memory.

## Proposed Approach

### 1. Preserve the existing helper API

Keep the current public helper shape stable:

- `renderHomeScreen(options)`
- returned testing-library utilities
- returned `spies` / `controls` shape

The batch should not force widespread Home/timeline test rewrites just to strengthen helper isolation.

### 2. Separate persistent baseline state from per-render state

The helper currently mixes together:

- baseline mock configuration that should intentionally persist until the next explicit setup/reset
- per-render state that should be freshly derived every render call

The highest-value targets for this batch are the state pieces most likely to leak across renders, especially:

- `mockSourceEntries`
- `mockAllTags`
- `mockCloudSyncUiState`

and any store state derived from them that should not silently inherit stale values from a previous render.

### 3. Prefer small internal helpers over new public abstractions

If more structure is needed, add tiny internal helpers inside `renderHomeScreen.tsx` for things like:

- creating a fresh per-render store snapshot
- applying baseline mock values for the next render
- resetting helper-controlled store state before each render

Do not introduce a new exported Home test harness object or larger builder API in this batch.

### 4. Lock state lifetime with focused helper-facing tests

Add or tighten helper-facing tests around the actual leak-prone behavior, such as:

- one render's source entries not silently becoming the next render's baseline when the next call does not provide them
- one render's cloud sync UI state not leaking into the next render without explicit setup

These tests should validate behavior through the current helper API rather than by reaching into new private implementation details.

## Files In Scope

### Directly modified

- `app/src/components/__tests__/helpers/renderHomeScreen.tsx`
- a focused helper-facing test file under `app/src/components/__tests__/helpers/` if needed

### Verification targets

- `app/src/components/__tests__/timeline/timeline.home.interactions.test.tsx`
- `app/src/components/__tests__/timeline/timeline.home.navigation.test.tsx`
- any new helper-facing test file for `renderHomeScreen`
- full `pnpm run verify`

## Testing Strategy

The implementation must follow TDD.

Minimum required proof for this batch:

- one helper-facing regression test for source entries/state lifetime
- one helper-facing regression test for cloud sync UI state lifetime
- existing Home/timeline tests continue to pass
- full `pnpm run verify` passes

## Risks And Mitigations

### Risk: over-correcting breaks current Home tests

If state is made too local too quickly, existing Home/timeline tests that rely on the current helper shape may break.

Mitigation:

- preserve the helper API
- change internal lifetime boundaries only
- verify directly against current Home/timeline consumers

### Risk: hidden state coupling remains

This batch is intentionally small, so some module-level state will remain.

Mitigation:

- focus on the most leak-prone values first
- add regression tests for the targeted leak paths
- leave broader harness redesign for a separate batch if still needed

### Risk: tests become too implementation-aware

If new tests inspect private helper internals, they may become brittle.

Mitigation:

- validate through helper behavior and returned API only
- avoid asserting private implementation structure

## Success Criteria

This batch is complete when all of the following are true:

- `renderHomeScreen` keeps the same public API
- targeted module-level state has clearer reset/per-render boundaries
- helper-facing regression tests prove those boundaries
- Home/timeline tests continue to pass
- full `pnpm run verify` passes
