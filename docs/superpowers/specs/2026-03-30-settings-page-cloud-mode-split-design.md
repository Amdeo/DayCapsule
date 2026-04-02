# 2026-03-30 Settings Page Cloud Mode Split Design

## Summary

Perform a minimal structural refactor of `app/src/components/settings-page/useSettingsPageCloudMode.ts` by extracting only the disable-cloud-mode flow into a focused local hook, while keeping the current public `useSettingsPageCloudMode()` API stable.

This is intentionally the first and smallest split for this file. The enable-cloud-mode path and logout path remain in the existing hook for now.

## Goals

- Reduce the size and nesting of `useSettingsPageCloudMode.ts`.
- Isolate the most complex flow in the file: switching from cloud mode back to local mode.
- Preserve all current cloud-mode UI behavior, alerts, and side effects.
- Keep `useSettingsPageCloudMode()` as the outward-facing integration hook used by `SettingsPage.tsx`.

## Non-Goals

- Refactor the enable-cloud-mode flow in this change set.
- Redesign sync bootstrap or cloud-sync service architecture.
- Change settings-page UI structure or copy.
- Introduce a generalized sync migration framework.

## Current State

`useSettingsPageCloudMode.ts` currently owns all of these responsibilities in one file:

- enabling cloud mode
- deciding between cloud/local sources during enable
- disabling cloud mode
- resolving cloud/local data preservation direction during disable
- migrating local entries to cloud
- restoring cloud entries to local
- logout behavior when cloud mode is active

The heaviest and most nested part is `disableCloudMode()`, which currently handles:

- count inspection (`cloudCount`, `localCount`)
- special-case alert when cloud is empty but local data exists
- general conflict alert when both sides may contain data
- local-to-cloud upload path
- cloud-to-local restore path
- cancellation / rollback behavior

## Chosen Approach

Keep `useSettingsPageCloudMode()` as the public facade, but extract the disable flow into a nearby local hook, for example:

- `useSettingsPageDisableCloudMode`

This hook will own the disable-mode orchestration and return a single `disableCloudMode()` function plus any internal helpers it needs.

This is preferred over splitting both enable and disable at once because:

- the disable path is the most complex part today
- it has the clearest internal boundary
- existing tests already exercise key disable-mode branches
- it reduces risk by leaving enable and logout logic untouched

## Detailed Design

### 1. New local hook for disable flow

Create a new file in the same folder:

- `app/src/components/settings-page/useSettingsPageDisableCloudMode.ts`

This hook should encapsulate only the logic needed to switch from cloud mode to local mode.

It should own:

- loading cloud/local counts
- building and showing the two existing confirmation alerts
- the `switchToLocalOnly()` helper
- the `cloud -> local` restore branch
- the `local -> cloud` upload branch
- error handling and rollback to `setCloudMode(true)` where it already exists today

It should not own:

- enable-cloud-mode logic
- login gating
- logout confirmation flow

### 2. Keep outward `useSettingsPageCloudMode()` API stable

After extraction, `useSettingsPageCloudMode()` should continue returning the same public fields:

- `isSwitchingMode`
- `enableCloudMode`
- `handleCloudModeToggle`
- `handleLogout`

Internally, it should delegate the disable path to the new hook.

`handleCloudModeToggle(false)` should still trigger the same disable behavior as before.

### 3. Preserve alert copy and branch behavior exactly

The following behavior must remain unchanged:

- when cloud is empty and local has data, the special warning alert still appears
- when both sides may contain data, the general data-preservation alert still appears
- cancel actions still revert to `setCloudMode(true)` where they do today
- success/failure alert copy remains the same

This refactor is structural only.

### 4. Keep enable and logout logic in place

The enable path still contains bootstrap inspection and initial cloud sync behavior. The logout path still contains the “disable cloud then reload entries then logout” sequence.

Those flows stay in `useSettingsPageCloudMode.ts` for now, so this change remains narrowly scoped.

## File Structure

Expected files after refactor:

- `app/src/components/settings-page/useSettingsPageCloudMode.ts`
- `app/src/components/settings-page/useSettingsPageDisableCloudMode.ts`

The new hook should stay local to the settings-page folder and not be generalized prematurely.

## Testing Strategy

Prefer the existing settings-page cloud-mode/account-auth integration tests, because the public facade should remain stable.

Most relevant verification targets:

- `app/src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx`
- `app/src/components/__tests__/settings-page/settings-page.account-auth.test.tsx`
- `pnpm run test:frontend:settings`
- `pnpm run verify`

If a small extra regression test is needed, it should focus on externally visible disable-mode behavior, not on internal helper calls.

## Risks And Mitigations

### Risk: disable-flow extraction changes rollback behavior

Mitigation:

- move logic mechanically first
- preserve `setCloudMode(true)` recovery branches exactly
- validate with the existing cloud-mode tests

### Risk: extraction leaks too much controller state into the new hook

Mitigation:

- pass only the minimal dependencies required for disable flow
- keep enable/login/logout responsibilities out of the new hook

### Risk: alert behavior drifts during refactor

Mitigation:

- do not rewrite alert strings or reorder branches
- reuse the current branch structure as much as possible

## Implementation Boundaries

The implementation should remain minimal:

- Only extract the disable-cloud-mode flow.
- Do not refactor enable-cloud-mode logic in this work item.
- Do not change settings-page UI or public props.
- Do not redesign migration/data-sync services.

## Success Criteria

- `useSettingsPageCloudMode.ts` is meaningfully smaller and less nested.
- disable-cloud-mode logic lives in `useSettingsPageDisableCloudMode.ts`.
- `useSettingsPageCloudMode()` keeps the same public return shape.
- relevant cloud-mode/account-auth tests and project verification pass.
