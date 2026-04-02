# 2026-04-02 Error Feedback Unification Design

## Summary

Unify user-visible error and result feedback across the app so that user-triggered failures always surface through branded in-app feedback, while confirmation decisions continue through the existing non-native confirm dialog pipeline.

This design is intentionally based on the current codebase state rather than older assumptions:

- business-facing native `Alert.alert(...)` usage is already removed from app code
- the global confirmation pipeline already exists
- login failure feedback already routes through branded in-app feedback

The remaining work is therefore not to invent a new feedback architecture, but to finish the migration by identifying user-visible failure paths that still only log, swallow, or indirectly expose errors without app content messaging.

## Status

- Design confirmation date: 2026-04-02
- Scope: app-side error/result feedback unification and remaining user-visible failure coverage
- User-confirmed direction:
  - perform a global review rather than only auth-specific fixes
  - include both result/error feedback and confirmation interactions in the unified product direction
- Worktree: `.worktrees/error-feedback-unification`
- Baseline verification:
  - `app/` `pnpm install` succeeded in the worktree
  - `app/` `pnpm test --runInBand` passed with 128 suites and 923 tests
- Current baseline observation:
  - `ConfirmDialogHost`, `ConfirmDialogModal`, `confirmDialogStore`, and `showConfirmDialog` already exist
  - `Alert.alert(...)` business call sites are already absent from `app/` source files

## Goals

- Ensure user-triggered failures surface through branded in-app feedback when the user needs to understand what happened
- Keep informational/result feedback on the existing `showErrorFeedback` path
- Keep multi-action decision flows on the existing `showConfirmDialog` path
- Establish a consistent decision rule for when a branch must show feedback versus when logging alone is acceptable
- Close remaining user-visible error handling gaps with minimal code churn and focused tests

## Non-Goals

- Redesign the app's visual language
- Replace platform-owned system UI such as OS permission sheets
- Add a third feedback mechanism such as toasts or snackbars
- Refactor unrelated screens or controller structure beyond what is needed to attach missing feedback
- Rewrite already-correct login feedback flows just for consistency if behavior is already aligned

## Current State

### Existing feedback primitives

The app already has two global branded feedback lanes mounted at the root:

- informational/result feedback via `FeedbackHost`
- confirmation flows via `ConfirmDialogHost`

Current root wiring exists in `app/app/_layout.tsx`.

Current stores and helpers exist in:

- `app/src/store/errorFeedbackStore.ts`
- `app/src/store/confirmDialogStore.ts`
- `app/src/services/showErrorFeedback.ts`
- `app/src/services/showConfirmDialog.ts`

### Existing login behavior

The login page already shows branded in-app feedback for:

- missing email/password
- mismatched register passwords
- login/register request failures

This behavior exists in `app/src/components/login-page/useLoginPageController.ts` and is already covered by tests in `app/src/components/__tests__/LoginPage.test.tsx`.

### Remaining gap type

The remaining inconsistency is expected to be in branches that:

- call `logger.error(...)` or `logger.warn(...)` without user-visible follow-up
- catch and ignore failures where the user initiated an action and needs an outcome
- rely on indirect state changes without a clear success/failure explanation to the user

These gaps are more subtle than direct `Alert.alert(...)` usage and require a policy-driven audit.

## Options Considered

### 1. Recommended: keep the current two-lane model and audit remaining user-visible failure branches

Use the existing architecture as-is:

- `showErrorFeedback(...)` for one-path informational or result feedback
- `showConfirmDialog(...)` for multi-action confirmation and branching decisions

Then perform a targeted review of user-visible failure branches that still do not produce app content messaging.

Why this is preferred:

- matches the current codebase reality
- avoids redesigning architecture that already exists and is already tested
- focuses effort on the real gap: missing usage, not missing primitives
- minimizes risk because most work is at the call-site and test level

Trade-offs:

- requires judgment when classifying whether a failure is user-visible enough to surface
- requires an audit pass rather than a single mechanical migration

### 2. Add a new higher-level wrapper that abstracts both info feedback and confirms behind one API

This would introduce a single service that internally decides whether to show a feedback modal or a confirm dialog.

Why not chosen:

- it hides an important product distinction between “you need to know” and “you need to choose”
- it adds indirection without solving the main gap
- the current explicit APIs are already easy to understand

### 3. Let each screen decide its own local modal strategy

This would avoid a policy-driven global audit and keep changes hyper-local.

Why not chosen:

- it weakens consistency across the app
- it encourages duplicate state and presentation logic
- many existing callers are already in services and controller hooks, where global hosts are the right fit

## Chosen Design

### 1. Preserve the current two feedback lanes

No new feedback primitive is introduced.

The app continues to use:

- `showErrorFeedback(request)` for informational, validation, and result feedback
- `showConfirmDialog(request)` for choices that branch user intent

This preserves the product distinction already agreed with the user and already reflected in the codebase.

### 2. Adopt an explicit feedback decision rule

For every catch block, failure branch, or rejected async action encountered during the audit, use this rule:

Show branded in-app feedback when all of the following are true:

- the user directly initiated the action
- the action failed or could not proceed
- the user needs the result to understand what happened or what to do next

Logging only is acceptable when any of the following are true:

- the failure is fully internal and does not affect the current user task
- the user already receives an equivalent visible signal elsewhere in the same flow
- the branch is best treated as telemetry or debugging information only

### 3. Classification rules

#### 3.1 Use `showErrorFeedback(...)`

Use this for single-path messaging, including:

- validation prompts such as missing inputs or invalid combinations
- operation failures such as save/upload/record/playback failures
- operation results where the user must be explicitly informed
- permission denials when the user needs a clear explanation after trying to continue

Preserve existing copy unless a test demonstrates the current wording is broken or misleading.

#### 3.2 Use `showConfirmDialog(...)`

Use this for multi-action decision points, including:

- destructive confirms
- logout confirms
- mode-switch preservation choices
- leave/discard decisions
- repair-now vs later style prompts

Preserve action order, destructive emphasis, and dismissibility rules.

### 4. Audit scope

The implementation pass should search for and review at least these patterns:

- `catch (`
- `.catch(`
- `logger.error(`
- `logger.warn(`
- branches returning early after failed user actions
- services and controller hooks that map request failures back to user interactions

Priority should be on flows where the user just tapped, submitted, retried, confirmed, saved, uploaded, repaired, switched, or deleted something.

### 5. Testing strategy

Implementation follows TDD for each newly covered behavior:

1. add or extend the smallest test that demonstrates a currently missing visible feedback path
2. run the targeted test and confirm it fails for the expected reason
3. add the minimal production change to surface the correct branded feedback
4. rerun the targeted test, then rerun relevant broader suites

Preferred test level:

- component/controller tests for call-site behavior
- host/store/service tests only when shared behavior changes
- root-layout test only if global wiring changes further

### 6. Minimal-change principle

This work should avoid broad refactors.

Preferred implementation style:

- patch existing failure branches in place
- reuse existing feedback presets where they already fit
- add a new preset only when multiple call sites truly share the same user-facing semantics
- avoid renaming stable abstractions during this pass

## Acceptance Criteria

- User-visible failure paths reviewed in this pass produce branded in-app feedback when the user needs an explanation
- Existing correctly wired flows such as login failure remain unchanged in behavior unless a bug is found
- Multi-action choice flows continue to use the confirm dialog lane rather than the error feedback lane
- No new native `Alert.alert(...)` business usage is introduced
- New or changed feedback behaviors are covered by tests written red-first
- Relevant verification commands pass in the worktree

## Risks And Mitigations

### Risk: over-notifying users

If every logged failure becomes visible feedback, the app may become noisy.

Mitigation:

- only surface failures that affect a user-initiated action or require user understanding
- keep purely internal and telemetry-only failures as logs

### Risk: inconsistent copy across call sites

If each patch invents wording ad hoc, the experience becomes uneven.

Mitigation:

- preserve existing working copy where possible
- prefer shared presets when the same failure semantics recur

### Risk: audit misses subtle silent failures

Some silent failures may not be obvious from a simple text search.

Mitigation:

- search both logging patterns and user-action handlers
- use tests around the most user-facing flows first

## Implementation Notes

- Because the current branch already contains the confirm dialog infrastructure, the next implementation plan should focus on audit order, classification heuristics, and test-first migration of remaining uncovered call sites.
- This design document is intentionally not committed yet because the current execution environment forbids creating git commits without an explicit user request.
