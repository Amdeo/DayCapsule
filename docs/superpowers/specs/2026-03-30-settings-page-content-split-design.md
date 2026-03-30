# 2026-03-30 Settings Page Content Split Design

## Summary

Perform a minimal structural refactor of `app/src/components/settings-page/SettingsPageContent.tsx` by extracting the two heaviest sections into focused local components:

- `SettingsAccountSyncSection`
- `SettingsDataStorageSection`

`SettingsPageContent` will remain the public composition component for the settings page content and continue to receive the same overall prop contract for now.

## Goals

- Reduce the prop and rendering density inside `SettingsPageContent.tsx`.
- Isolate the two sections with the highest interaction and prop complexity.
- Keep page behavior, test IDs, section ordering, and copy unchanged.
- Preserve the outward contract used by `SettingsPage.tsx`.

## Non-Goals

- Rewrite `SettingsPageContent` into a config-driven renderer.
- Split every settings section into its own component.
- Refactor controller or cloud-mode hooks in this change set.
- Change settings-page UI structure or copy.

## Current State

`SettingsPageContent.tsx` currently composes all settings sections inline:

- overview card
- account & sync
- reminders
- display
- data & storage
- tags
- support
- danger
- optional E2E sync lab block

The two sections with the highest rendering and prop density are:

1. **账户与同步**
   - backend server card
   - login/account row
   - cloud-mode switch
   - sync status entry
   - logout entry

2. **数据与存储**
   - high-quality-photos switch
   - storage info card
   - clear-cache action

These sections already have clear visual and behavioral boundaries, which makes them good extraction targets without needing broader page redesign.

## Chosen Approach

Keep `SettingsPageContent` as the page-level composition component, but extract only the two heaviest sections into nearby presentational components.

This is preferred because:

- it reduces the largest concentration of props and JSX first
- existing settings-page tests already target these sections by visible text and test IDs
- it avoids over-splitting the file into many tiny components with low payoff

## Detailed Design

### 1. `SettingsAccountSyncSection`

Create a new local component in the same folder:

- `app/src/components/settings-page/SettingsAccountSyncSection.tsx`

This component should own only the “账户与同步” section rendering:

- `SettingsBackendServerCard`
- authenticated vs unauthenticated branch
- cloud-mode switch row
- sync status action
- logout action

It should receive only the props needed for this section.

Behavior must remain unchanged:

- same titles/subtitles
- same `testID`s
- same `Switch` disabled/value behavior
- same login/logout/sync-status callbacks

### 2. `SettingsDataStorageSection`

Create a new local component in the same folder:

- `app/src/components/settings-page/SettingsDataStorageSection.tsx`

This component should own only the “数据与存储” section rendering:

- high-quality-photos switch
- `SettingsStorageInfo`
- clear-cache action

It should receive only the props needed for this section.

Behavior must remain unchanged:

- same storage card and switch placement
- same `testID`s
- same clear-cache callback wiring

### 3. Keep `SettingsPageContent` as orchestrator

After extraction, `SettingsPageContent.tsx` should still:

- render the page sections in the same order
- pass through the same props from `SettingsPage.tsx`
- compose the two new section components alongside the existing inline sections

This keeps the refactor focused on render structure only, not data flow redesign.

### 4. File Structure

Expected files after refactor:

- `app/src/components/settings-page/SettingsPageContent.tsx`
- `app/src/components/settings-page/SettingsAccountSyncSection.tsx`
- `app/src/components/settings-page/SettingsDataStorageSection.tsx`

The new components should stay local to the settings-page folder and should not be generalized prematurely.

## Testing Strategy

Prefer the existing settings-page assembly and focused section tests, because the public composition contract should remain stable.

Most relevant verification targets:

- `app/src/components/__tests__/SettingsPage.test.tsx`
- `app/src/components/__tests__/settings-page/settings-page.account-auth.test.tsx`
- `app/src/components/__tests__/settings-page/settings-page.cloud-mode.test.tsx`
- `app/src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx`
- `app/src/components/__tests__/settings-page/settings-page.backend-env.test.tsx`
- `npm run test:frontend:settings`
- `npm run verify`

If an extra regression test is needed, it should focus on externally visible section behavior, not component implementation boundaries.

## Risks And Mitigations

### Risk: section extraction changes test ID placement or ordering

Mitigation:

- preserve current `testID`s exactly
- keep section ordering in `SettingsPageContent` unchanged
- validate with existing settings-page assembly tests

### Risk: props simply move without meaningful structure improvement

Mitigation:

- extract only the two sections with the highest interaction density
- keep other sections inline for now to avoid noise

### Risk: new components become mini-controllers

Mitigation:

- keep them presentational only
- no new state or side-effect logic in the extracted section components

## Implementation Boundaries

The implementation should remain minimal:

- Only extract the two approved sections.
- Do not change `SettingsPage.tsx` public wiring unless absolutely necessary.
- Do not refactor controller/cloud-mode hooks in this work item.
- Do not change product behavior.

## Success Criteria

- `SettingsPageContent.tsx` is meaningfully smaller and easier to scan.
- account/sync rendering lives in `SettingsAccountSyncSection.tsx`.
- data/storage rendering lives in `SettingsDataStorageSection.tsx`.
- section order, props behavior, and test IDs remain stable.
- relevant settings-page tests and project verification pass.
