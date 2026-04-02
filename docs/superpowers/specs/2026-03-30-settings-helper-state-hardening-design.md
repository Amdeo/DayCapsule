# Settings Helper State Hardening Design

## Summary

This batch hardens `renderSettingsPage` by tightening the most leak-prone module-level mutable state without changing the helper's public API. The goal is to reduce cross-test coupling from shared state like `latestLoginPageProps` and `mockPersistedSettings`, while preserving the current calling style used across the existing Settings test surface.

The design stays deliberately small: it does not redesign the entire helper around a new object model, and it does not expand into production code. It only makes the helper's per-render state boundaries more explicit and less dependent on values left behind by previous test runs.

## Goals

- Reduce the risk of cross-test leakage from `renderSettingsPage` shared mutable state.
- Make the most dangerous state transitions explicit at render/reset boundaries.
- Preserve the current external helper API used by existing Settings tests.

## Non-Goals

- No broad rewrite of `renderSettingsPage` into a fully instance-based helper.
- No changes to production `SettingsPage` logic.
- No change to the returned helper shape unless a tiny compatibility-safe addition is required.
- No migration of all helper consumers to a new access pattern.

## Current Problem

`renderSettingsPage.tsx` still stores several important values at module scope, including:

- `mockPersistedSettings`
- `latestLoginPageProps`

That structure works today, but it makes the helper vulnerable to stale state if a test forgets to reset, if a helper path is reused in a different order, or if future helper growth introduces another stateful branch. The current reset function reduces the risk, but the boundaries are still implicit because some state is mutated over time and then later read back through separate exported accessors.

The highest-value concern is not that every module variable must disappear. The highest-value concern is that the state which behaves like per-render data should stop behaving like ambient global memory.

## Proposed Approach

### 1. Preserve the public helper API

The current calling style is used broadly across Settings tests. This batch keeps these entry points stable:

- `renderSettingsPage(...)`
- `resetRenderSettingsPageMocks()`
- `getLatestLoginPageProps()`
- `triggerLatestLoginSuccess()`

Tests should not need sweeping call-site changes just to get stronger helper isolation.

### 2. Reclassify state by lifetime

The implementation should separate helper state into two practical lifetimes:

- baseline mock configuration that intentionally persists until reset
- per-render captured state that should be re-initialized every render call

For this batch, the main intended changes are:

- `latestLoginPageProps` should behave like per-render captured output, not ambient process-wide state
- `mockPersistedSettings` should have a clearer reset/update boundary so changes made during one render path do not accidentally become surprising setup for the next render path

The important design rule is explicit lifetime, not total elimination of mutation.

### 3. Prefer small internal helpers over new public abstraction

If the code needs more structure, add tiny internal helpers inside `renderSettingsPage.tsx` for things like:

- creating a fresh per-render capture container
- deriving effective persisted settings for a render
- resetting captured login props

Do not introduce a new exported test harness object or force tests to adopt a new API in this batch.

### 4. Lock behavior with focused helper-facing tests

This batch should prove the state boundary is stronger by adding or tightening helper-facing tests around the actual leak-prone points, especially:

- login prop capture resets correctly between renders
- persisted settings baseline does not unintentionally drift across renders without explicit setup

The tests should validate behavior through the current public helper API rather than by reaching into new internal implementation details.

## Files In Scope

### Directly modified

- `app/src/components/__tests__/helpers/renderSettingsPage.tsx`
- `app/src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx` if it is the right place for one of the new guarantees
- possibly a new focused helper test file under `app/src/components/__tests__/helpers/` if that yields a cleaner boundary proof

### Verification targets

- `app/src/components/__tests__/settings-page/settings-page.account-auth.test.tsx`
- `app/src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx`
- `app/src/components/__tests__/SettingsPage.test.tsx`
- `pnpm run test:frontend:settings`
- `pnpm run verify`

## Testing Strategy

The implementation must follow TDD.

Minimum required proof for this batch:

- one helper-facing regression test for login prop capture lifetime or reset behavior
- one helper-facing regression test for persisted settings lifetime or reset behavior
- direct Settings frontend script still passes
- full `pnpm run verify` passes

The key is to prove that helper state is now explicit enough that a previous render cannot silently bias the next one unless the test intentionally sets that state up.

## Risks And Mitigations

### Risk: over-correcting and breaking current tests

If state is made too local too quickly, existing tests that intentionally use the helper's exported accessors may stop working.

Mitigation:

- preserve current public helper API
- only tighten internal lifetime boundaries
- verify against the existing Settings surface immediately

### Risk: leaving hidden state coupling in place

This batch is intentionally small, so some module-level state will remain.

Mitigation:

- focus on the highest-risk state first
- add regression tests for the targeted leak points
- defer broader instance-based redesign unless future failures justify it

### Risk: tests become coupled to internals

If new tests inspect private helper details, they can become brittle.

Mitigation:

- validate state lifetime through public helper behavior and exported accessors only
- avoid asserting internal helper implementation structure

## Success Criteria

This batch is complete when all of the following are true:

- `renderSettingsPage` keeps the same public API
- targeted helper state around login prop capture and persisted settings has clearer per-render/reset boundaries
- new or tightened helper-facing regression tests prove those boundaries
- `pnpm run test:frontend:settings` passes
- `pnpm run verify` passes
