# 2026-03-30 Sync Bootstrap Summary Writeback Tests Design

## Summary

Extract a very small, test-only follow-up from `spec/sync-settlement-test-granularity` that locks one existing `syncBootstrapService` behavior more precisely:

- even when validation issues do not require a repair prompt, the bootstrap flow still writes the validation summary and issue list back to the relevant stores.

This change is intentionally test-only. It does not modify production behavior.

## Goals

- Strengthen coverage around cloud-restore validation side effects.
- Ensure prompt gating does not accidentally suppress `setMediaValidationSummary()` or `replaceIssues()`.
- Keep the change isolated to `syncBootstrapService.test.ts`.

## Non-Goals

- Change `syncBootstrapService.ts` production code.
- Expand broader bootstrap matrix coverage.
- Refactor test helpers or reorganize the full test file structure.

## Current State

After landing `sync-bootstrap-settlement-fixes`, `main` already verifies:

- prompt appears when an issue is `repair_prompt_required`
- prompt does not appear for non-prompt issues
- delete-bound entries skip pre-upload in the local bootstrap path

What is not yet directly asserted is the complementary side effect for the non-prompt cloud-restore case:

- `setMediaValidationSummary(summary)` still runs
- `replaceIssues(issues)` still runs

This is a useful regression because prompt gating and summary/issue writeback now sit adjacent in the same cloud-restore validation branch.

## Chosen Approach

Add one focused unit test to `app/src/services/__tests__/syncBootstrapService.test.ts` that covers the non-prompt issue case and asserts:

- no prompt shown
- summary written
- issues written

This is preferred over a larger follow-up because it locks the missing side effect with minimal code and no production changes.

## Detailed Design

### 1. Focused non-prompt side-effect test

Add a cloud-restore test where:

- `validateEntries()` resolves with a `summary`
- `issues` contains at least one issue
- all issues are non-`repair_prompt_required` (for example `repair_failed`)

Then assert:

- `mockSetMediaValidationSummary` receives the summary
- `mockReplaceIssues` receives the issues
- `mockShowPhotoRepairPrompt` is not called

The test should not add unrelated assertions about unrelated bootstrap branches.

## Testing Strategy

Use only:

- `app/src/services/__tests__/syncBootstrapService.test.ts`

And verify with:

- the focused single test
- optionally the whole `syncBootstrapService.test.ts` file for confidence

## Risks And Mitigations

### Risk: test duplicates existing nearby behavior too heavily

Mitigation:

- keep the new test focused on the missing side effect assertions only
- avoid duplicating broad bootstrap expectations already covered elsewhere

### Risk: test becomes coupled to unrelated matrix setup

Mitigation:

- keep fixtures minimal and local to the non-prompt cloud-restore scenario

## Implementation Boundaries

The implementation should remain minimal:

- Only change `app/src/services/__tests__/syncBootstrapService.test.ts`
- Do not change production code
- Do not refactor shared test helpers unless absolutely required

## Success Criteria

- There is a direct regression test proving non-prompt issues still write summary and issues.
- The test file remains green.
- No production files are changed.
