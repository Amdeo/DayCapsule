# 2026-03-30 Settings Page Controller Split Design

## Summary

Perform a minimal structural refactor of `app/src/components/settings-page/useSettingsPageController.ts` by extracting two focused internal hooks:

1. storage-related state and actions
2. backend-server-related state and actions

The parent controller hook will remain the public integration point for the settings page, so existing consumers and tests keep the same external contract.

## Goals

- Reduce the number of responsibilities inside `useSettingsPageController.ts`.
- Create clearer boundaries around storage management and backend-server management.
- Keep the external return shape of `useSettingsPageController()` stable.
- Preserve all current runtime behavior and settings-page test coverage.

## Non-Goals

- Refactor `useSettingsPageCloudMode.ts` in this change set.
- Redesign `SettingsPageContent.tsx` props.
- Change settings-page UI structure or copy.
- Introduce a new shared hooks architecture across the whole settings feature.

## Current State

`useSettingsPageController.ts` currently manages multiple distinct concerns in one file:

- settings bootstrap and notification sync
- local storage usage refresh
- backend server draft/test/save state
- cache clearing and reset alerts
- tag management dialog state
- display-preference save handlers

The file is not broken because of line count alone; the problem is that unrelated responsibilities are co-located, which makes it harder to understand and edit safely.

## Chosen Approach

Keep `useSettingsPageController()` as the public composition layer, but extract two internal hooks into nearby files:

- `useSettingsPageStorage`
- `useSettingsPageBackendServer`

This is preferred over splitting the page content or cloud-mode hook first because:

- the boundaries are already visible in the existing state and handlers
- the extracted logic has minimal overlap with other controller concerns
- the current tests mostly exercise the public controller/page behavior, so keeping the parent controller interface stable minimizes regression risk

## Detailed Design

### 1. `useSettingsPageStorage`

Create a focused internal hook responsible only for storage-related behavior.

It should own:

- `usedSpace`
- `refreshStorageStats()`
- `handleClearCache()`

It may accept the minimal dependencies it needs, such as the storage-stat function or refresh callbacks already used by the controller.

Behavior must remain unchanged:

- visible settings page still triggers storage refresh
- clear-cache flow still shows the same alerts
- local entries still reload after clearing local app data

### 2. `useSettingsPageBackendServer`

Create a focused internal hook responsible only for backend server state and actions.

It should own:

- `currentServerUrl`
- `backendDraftUrl`
- `recentServerUrls`
- `backendTestStatus`
- `backendTestedUrl`
- `backendTestErrorMessage`
- `isSavingBackendServer`
- `canSaveBackendServer`
- `loadBackendState()`
- `handleBackendDraftUrlChange()`
- `handleSelectRecentBackendServer()`
- `handleTestBackendServer()`
- `handleSaveBackendServer()`

Behavior must remain unchanged:

- opening settings still loads current/recent backend values
- testing a backend still sets the same status values
- saving a backend still shows the same success/failure alerts

### 3. Keep `useSettingsPageController()` as orchestrator

After extraction, `useSettingsPageController()` should continue to own the remaining cross-cutting page concerns:

- load settings on first show
- notification reminder sync
- display-preference save handlers
- tag-management dialog state
- reset-settings confirmation
- summary counts derived from entries

It should compose the two new internal hooks and return the same public fields and handlers as before, so `SettingsPage.tsx` and `SettingsPageContent.tsx` do not need API changes.

### 4. File structure

Expected files after refactor:

- `app/src/components/settings-page/useSettingsPageController.ts`
- `app/src/components/settings-page/useSettingsPageStorage.ts`
- `app/src/components/settings-page/useSettingsPageBackendServer.ts`

The new hooks should stay local to the settings-page folder and should not be generalized prematurely.

## Testing Strategy

Prefer existing settings-page integration tests, because the public controller contract should remain stable.

Relevant verification targets:

- `app/src/components/__tests__/SettingsPage.test.tsx`
- `app/src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx`
- `app/src/components/__tests__/settings-page/settings-page.backend-env.test.tsx`
- existing render helper tests if needed
- `pnpm run verify`

If a small focused unit test for one of the extracted hooks becomes necessary, keep it minimal and only add it if the current integration tests do not cover the moved behavior well enough.

## Risks And Mitigations

### Risk: extraction accidentally changes controller return shape

Mitigation:

- keep `useSettingsPageController()` as the public facade
- preserve existing property names and handler names exactly

### Risk: moved alert logic changes behavior subtly

Mitigation:

- do not rewrite alert copy or branching
- move logic mechanically first, then validate with existing tests

### Risk: over-extraction into too many hooks

Mitigation:

- limit this refactor to two clearly bounded internal hooks
- leave cloud-mode and other concerns untouched in this change set

## Implementation Boundaries

The implementation should remain minimal:

- Only split `useSettingsPageController.ts` along the two approved boundaries.
- Do not change `SettingsPageContent.tsx` prop shape unless absolutely necessary.
- Do not refactor `useSettingsPageCloudMode.ts` in this work item.
- Do not change product behavior.

## Success Criteria

- `useSettingsPageController.ts` is meaningfully smaller and more focused.
- storage-related logic lives in `useSettingsPageStorage.ts`.
- backend-server-related logic lives in `useSettingsPageBackendServer.ts`.
- the public controller contract remains stable for current consumers.
- relevant settings-page tests and project verification pass.
