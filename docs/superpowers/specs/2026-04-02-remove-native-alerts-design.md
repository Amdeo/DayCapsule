# 2026-04-02 Remove Native Alerts Design

## Summary

Replace all remaining business uses of React Native `Alert.alert(...)` in the app with non-native feedback surfaces.

The replacement is intentionally split into two lanes:

- keep the existing global `ErrorFeedbackModal` pipeline for informational prompts and result feedback
- add a new global confirm-dialog pipeline for multi-action confirmation flows

This keeps prompt-style feedback and confirmation-style feedback visually separate, which matches the confirmed product direction.

## Status

- Design confirmation date: 2026-04-02
- Scope: app-side alert replacement only
- User-confirmed direction:
  - replace all native alerts, including confirmations
  - prompt/info feedback and confirm dialogs do not need to share one component
- Worktree: `.worktrees/remove-native-alerts`
- Baseline note: `pnpm install` succeeded in the worktree `app/`, but `pnpm test --runInBand` initially reported `sh: jest: command not found` even though `node_modules/.bin/jest` exists afterward. This needs to be treated as a local baseline anomaly during verification, not as evidence against the design.

## Goals

- Remove all business-facing uses of native `Alert.alert(...)`
- Preserve current user-visible behavior, copy, and action order as closely as possible
- Keep informational feedback on the existing global feedback path
- Introduce a dedicated non-native confirmation dialog path for destructive and branching decisions
- Minimize code churn by translating existing alert call sites rather than redesigning flows

## Non-Goals

- Redesign the visual language of the app
- Merge informational feedback and confirmation dialogs into one abstraction
- Introduce toast/snackbar infrastructure in this change
- Refactor unrelated screens or controller structure beyond what is needed to remove native alerts

## Current State

The app currently uses native `Alert.alert(...)` in multiple places across services, controller hooks, and screen entry points.

These usages fall into two clear categories:

### 1. Informational prompts

Examples:

- save succeeded / failed
- recording failed
- migration warning
- validation prompt such as missing form fields

These usually map to one button and do not require the user to choose between multiple branches.

### 2. Confirmation flows

Examples:

- delete tag confirmation
- reset settings confirmation
- clear storage confirmation
- abandon editor changes
- logout confirmation
- cloud/local preservation choice during mode switches
- photo repair decision prompt

These currently rely on `Alert` button arrays and, in a few cases, `cancelable: false` behavior.

## Options Considered

### 1. Recommended: keep info feedback and add a separate confirm-dialog host

Adopt the existing `showErrorFeedback()` path for informational prompts and create a new `showConfirmDialog()` path for confirmations.

Why this is preferred:

- matches the confirmed product direction that prompt and confirm UI can be separate
- avoids forcing delete/logout confirmations into an `ErrorFeedback` naming model
- keeps current `ErrorFeedbackModal` focused and easy to reason about
- lets confirmation flows preserve multi-button semantics more directly

Trade-offs:

- introduces one additional global store/host/component set
- requires a small amount of app-root integration work

### 2. Extend `ErrorFeedbackModal` to cover confirmations too

This would reduce the number of global hosts, but it overloads the semantics of the existing error-feedback system.

Why not chosen:

- naming and intent become muddy
- destructive confirmation and informational result feedback have different mental models
- future maintenance would likely grow more confusing rather than simpler

### 3. Replace each alert locally with screen-specific modals or sheets

This would avoid a new global confirm dialog abstraction, but it would spread implementation details across many files.

Why not chosen:

- duplicates UI structure and state handling
- increases migration cost substantially
- makes testing and consistency harder

## Chosen Design

### 1. Informational feedback continues through `ErrorFeedbackModal`

Single-action alerts and simple result messages move to the existing global feedback channel:

- `showErrorFeedback(request)`
- `errorFeedbackStore`
- `FeedbackHost`
- `ErrorFeedbackModal`

This design change does not require renaming the existing abstraction for now. Even when the tone is not strictly an error, the component already represents full-screen branded feedback and is the lowest-risk landing point for replacing native one-button alerts.

The migration should preserve:

- title text
- body text
- primary action labels such as `知道了`, `确定`, `重试`
- any existing follow-up callback semantics

### 2. Add a dedicated global confirm-dialog pipeline

Introduce a new confirmation pipeline parallel to the existing feedback pipeline.

Expected pieces:

- `app/src/store/confirmDialogStore.ts`
- `app/src/services/showConfirmDialog.ts`
- `app/src/components/ConfirmDialogModal.tsx`
- `app/src/components/ConfirmDialogHost.tsx`

The data model should support:

- `title`
- optional `message`
- optional `dedupeKey`
- `actions: Array<{ label; role; onPress?; testID? }>`
- optional behavior flag for outside-dismiss if needed

Recommended roles for the first pass:

- `primary`
- `secondary`
- `danger`

The host should mirror the existing `FeedbackHost` execution model:

- render current request from the store
- dismiss the current dialog before running the action callback
- catch and log async action failures

### 3. Root-level mounting

The new `ConfirmDialogHost` should be mounted alongside the existing `FeedbackHost` at the app root so service-level and controller-level callers can trigger dialogs without passing local component state downward.

This is important because current alert usage already spans:

- component hooks
- services
- app bootstrap logic

Replacing them with only local modal state would increase coupling.

### 4. Visual and behavioral rules

The confirm dialog should remain non-native but visually aligned with the app's current branded modal language.

Rules:

- use the same general modal/backdrop language as other branded dialogs
- keep action order consistent with the current alert calls
- preserve destructive copy exactly unless a test proves it needs adjustment
- preserve explicit non-cancelable behavior where current code depends on it
- do not auto-convert confirmation flows into bottom sheets unless the existing UI already uses a sheet for that specific interaction

### 5. Migration mapping

Use the following migration rule set.

#### 5.1 One-button informational alerts

Examples:

- `Alert.alert('保存失败', '保存内容失败，请重试')`
- `Alert.alert('提示', '请填写邮箱和密码')`

Migration target:

- `showErrorFeedback({ title, message, actions: [{ label: '知道了', role: 'primary' }] })`

Where the current wording strongly implies `确定` rather than `知道了`, keep the original user-facing button label.

#### 5.2 Two-button or multi-button confirmations

Examples:

- cancel / confirm delete
- cancel / logout
- later / repair now
- keep local / keep cloud / cancel

Migration target:

- `showConfirmDialog({ title, message, actions })`

Each action should preserve:

- label text
- original branch callback
- relative prominence

#### 5.3 Existing custom action sheets remain unchanged

Existing non-native surfaces such as `EntryActionSheet` already cover some confirmation flows. They are not part of the native-alert cleanup unless they themselves invoke `Alert.alert` internally.

## File-Level Plan

### New files

- `app/src/store/confirmDialogStore.ts`
- `app/src/services/showConfirmDialog.ts`
- `app/src/components/ConfirmDialogModal.tsx`
- `app/src/components/ConfirmDialogHost.tsx`

### Existing files likely to change

- `app/app/_layout.tsx`
- `app/src/services/showPhotoRepairPrompt.ts`
- `app/src/services/appBootstrapService.ts`
- `app/src/components/login-page/useLoginPageController.ts`
- `app/src/components/voice-recorder/useVoiceRecorderController.ts`
- `app/src/components/settings-page/useSettingsPageCloudMode.ts`
- `app/src/components/settings-page/useSettingsPageDisableCloudMode.ts`
- `app/src/components/settings-page/useSettingsPageController.ts`
- `app/src/components/settings-page/useSettingsPageStorage.ts`
- `app/src/components/backup-page/useBackupPageController.ts`
- `app/src/components/entry-editor/useEntryEditorController.ts`
- `app/src/components/tag-management-page/useTagManagementController.ts`
- `app/src/components/image-viewer/useImageViewerActions.ts`
- `app/src/components/entry-card/useEntryCardAudio.ts`
- `app/app/(tabs)/index.tsx`

The exact list may expand slightly if a few alert imports live in adjacent helper files, but the migration should stay narrowly focused on native-alert removal.

## Testing Strategy

This work should follow TDD.

### Red phase

Add or update tests first for the new behavior:

- store tests for `confirmDialogStore`
- component tests for `ConfirmDialogModal`
- host tests for `ConfirmDialogHost`
- targeted regression updates for existing alert-driven flows so they assert `showErrorFeedback` or `showConfirmDialog` instead of `Alert.alert`

Prefer targeted existing suites over broad rewrites.

Most relevant test areas:

- `app/src/store/__tests__/`
- `app/src/components/__tests__/`
- settings page tests
- login page tests
- backup page tests
- editor leave-guard tests
- tag management tests
- photo repair prompt tests

### Green phase

Implement the minimal confirm-dialog infrastructure and migrate call sites incrementally.

### Verification

Run the smallest relevant test subsets first, then broader checks as allowed by the local baseline.

Preferred verification order:

- targeted Jest paths for new confirm dialog tests
- targeted feature suites affected by the migration
- `pnpm run typecheck`
- broader project verification if the worktree baseline permits it

## Risks And Mitigations

### Risk: action order or semantics drift during migration

Mitigation:

- preserve button array order from each original `Alert.alert` call
- keep existing copy unchanged unless a test intentionally updates it

### Risk: confirmation dialogs become dismissible when they were previously blocking

Mitigation:

- model explicit outside-dismiss behavior in the dialog request shape
- default to conservative behavior for migrated confirmations that previously used `cancelable: false`

### Risk: async confirmation callbacks silently fail

Mitigation:

- match `FeedbackHost` behavior by catching and logging callback errors in the host layer

### Risk: over-migrating existing custom surfaces

Mitigation:

- only touch native `Alert.alert` call sites
- leave existing modal/action-sheet flows intact unless directly connected to native alerts

## Success Criteria

- no remaining business-facing `Alert.alert(...)` calls in app production code
- informational prompts render through the existing branded feedback host
- confirmation flows render through the new non-native confirm dialog host
- button labels and action semantics remain compatible with current behavior
- targeted tests pass
- typecheck passes

## Open Implementation Constraint

Per repository operating rules for this session, the design document should be written for review now, but not committed unless the user explicitly asks for a commit.
