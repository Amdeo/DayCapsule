# Verify/CI And Settings Test Hardening Design

## Summary

This batch makes repository verification stricter and less divergent by introducing a single `app/package.json` verification entry point and reusing it from GitHub Actions. In the same batch, it hardens the `renderSettingsPage` test helper by replacing fixed microtask flushing with condition-based settling tied to observable UI state.

The goal is to make local verification and CI run the same checks, while removing one of the remaining fragile async test helpers without expanding into adjacent test infrastructure.

## Goals

- Add one authoritative verification command for the app workspace.
- Make CI call the same verification command that developers run locally.
- Remove `Promise.resolve()`-driven settling from `renderSettingsPage` and its stability test.
- Keep the Settings test helper changes narrowly scoped to `renderSettingsPage` and its direct tests.

## Non-Goals

- No broad test-helper framework refactor.
- No changes to `renderHomeScreen` or unrelated test helpers.
- No expansion of CI scope beyond reusing the unified verification command in the existing workflow.
- No restructuring of all module-level mock state in Settings tests; only the most fragile waiting behavior is addressed in this batch.

## Current Problems

### Verification drift

`app/package.json` currently exposes separate `lint`, `typecheck`, and `test` scripts, but there is no single command representing the full required verification pass. The Android release workflow manually runs `npm run typecheck` and `npm test -- --runInBand`, and it does not run lint.

This creates two kinds of drift:

- developers do not have a single canonical pre-merge command
- CI can silently diverge from local expectations when verification steps change

### Fragile Settings helper settling

`app/src/components/__tests__/helpers/renderSettingsPage.tsx` currently settles the initial render through repeated `await Promise.resolve()` calls wrapped in `act`. `renderSettingsPage.stability.test.tsx` repeats the same pattern.

That approach is fragile because:

- it encodes guessed async timing rather than an observable condition
- it can become insufficient or excessive when component internals change
- it hides whether the page is actually ready from a user-visible perspective

## Proposed Approach

### 1. Add a single verification entry point

`app/package.json` will gain a `verify` script that runs:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test -- --runInBand`

`verify` is the only new top-level verification alias introduced in this batch. No additional `check`, `ci`, or overlapping scripts will be added.

### 2. Make CI consume the same command

`.github/workflows/android-release.yml` will stop manually invoking separate typecheck and test steps. The workflow will instead run `npm run verify` in the `app/` working directory before the Android prebuild and release build steps.

This keeps verification logic centralized in one file and ensures that adding or removing verification requirements only requires updating one command definition.

### 3. Replace fixed flush loops with condition-based settling

`renderSettingsPage` will stop using a fixed `flushSettingsPageEffects()` loop driven by `Promise.resolve()`. Instead, the helper will wait for a stable, observable UI signal that indicates the initial Settings screen render has settled.

The preferred stable signal is a first-screen UI element that is expected to appear on successful render and does not depend on implementation details of service invocation order. Waiting on visible UI aligns the helper with real user-observable behavior and reduces coupling to internal effect scheduling.

If the currently available Settings UI does not expose a sufficiently stable and universal signal, the fallback is to wait for one narrow, already-public side effect that is essential to the initial screen setup. That fallback is secondary and should only be used if a UI-based condition cannot cover the helper reliably.

### 4. Keep mock-state changes minimal

The helper currently uses module-level mutable state for mocked stores and captured `LoginPage` props. That pattern is not fully replaced in this batch.

Instead, this batch only tightens the boundaries around the existing pattern by:

- ensuring each helper call fully resets the expected mutable mock state before render
- removing the need for additional post-render microtask flushing in direct tests
- keeping state access explicit through existing helper return values and exported accessors

This preserves current test ergonomics while reducing the most timing-sensitive part of the helper.

## Files In Scope

### Directly modified

- `app/package.json`
- `.github/workflows/android-release.yml`
- `app/src/components/__tests__/helpers/renderSettingsPage.tsx`
- `app/src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx`

### Likely read for context

- `app/src/components/SettingsPage.tsx`
- `app/src/components/__tests__/SettingsPage.test.tsx`
- `app/src/components/__tests__/settings-page/*.test.tsx`

## Testing Strategy

The implementation must follow TDD for each behavior-changing step.

Minimum required verification for this batch:

- targeted Settings helper stability test
- targeted Settings page test set affected by the helper
- full `npm run verify`

The targeted tests should prove two things:

- the helper still renders Settings tests into a stable initial state
- act-warning suppression is achieved by waiting for a real condition, not by arbitrary extra microtasks

## Risks And Mitigations

### Risk: chosen UI signal is too specific

If the helper waits on a UI node that only appears in one auth or cloud-mode combination, tests could become coupled to a subset of render paths.

Mitigation:

- choose a signal present in the default helper render path
- keep the helper options compatible with that default path
- if necessary, use a fallback signal that is still externally observable and not timing-based

### Risk: full `verify` increases CI time

Running lint in CI adds time to the Android release workflow.

Mitigation:

- accept the modest added runtime because it closes a real verification gap
- keep the workflow structure unchanged outside the verification entry point change

### Risk: helper still contains module-level state

The remaining module-level mock state can still be a future maintenance concern.

Mitigation:

- explicitly keep this out of scope for this batch
- reduce only the current highest-value fragility point
- revisit broader helper isolation only if future failures justify a separate batch

## Success Criteria

This batch is complete when all of the following are true:

- `app/package.json` exposes `npm run verify` as the canonical verification command
- the Android release workflow calls `npm run verify`
- `renderSettingsPage` no longer relies on `Promise.resolve()` flush loops to settle initial render
- `renderSettingsPage.stability.test.tsx` no longer uses `Promise.resolve()` settling
- targeted Settings tests pass
- full `npm run verify` passes
