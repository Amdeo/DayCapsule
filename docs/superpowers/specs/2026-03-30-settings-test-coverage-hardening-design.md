# Settings Test Coverage Hardening Design

## Summary

This batch tightens the Settings frontend test harness around the area that just regressed: script coverage and helper boundary expectations. The main change is to make the shared `test:frontend:settings` entry point actually cover the Settings tests that depend on `renderSettingsPage`, including `settings-page.account-auth.test.tsx` and `settings-page.storage-actions.test.tsx`, while keeping the helper contract explicit and narrowly scoped.

The goal is not to redesign the entire Settings test helper system. The goal is to close the gap where a helper regression can slip past the named Settings frontend command because the affected tests are not actually part of that command.

## Goals

- Make `npm run test:frontend:settings` cover the Settings page tests that depend on the shared Settings helper contract.
- Keep the `renderSettingsPage` boundary explicit so future helper regressions are easier to catch through the named script.
- Preserve the current minimal helper architecture without refactoring module-level mock state in this batch.

## Non-Goals

- No broad rewrite of `renderSettingsPage` mock state architecture.
- No new shared cross-domain settle helper for the whole test suite.
- No production code changes.
- No expansion into HomeScreen or other non-Settings test harnesses.

## Current Problem

The current `test:frontend:settings` command does not fully represent the practical Settings frontend surface. During the previous batch, a regression in `renderSettingsPage` was only caught when the full `verify` command ran. The named Settings frontend script passed because it did not include `settings-page.account-auth.test.tsx`, even though that test depends directly on the same shared helper and helper boundary.

This means the script name suggests a stronger guarantee than it really provides. That mismatch increases regression risk because developers can believe they ran the relevant Settings frontend suite while still missing helper-sensitive tests.

## Proposed Approach

### 1. Re-define the Settings frontend script around helper dependency, not only topic labels

`test:frontend:settings` should include the Settings page tests that exercise the shared Settings rendering path, even if some of them are currently grouped under more specific names like account auth or storage actions.

The inclusion rule for this batch is practical and narrow:

- if a test file is a Settings frontend test
- and it relies on `renderSettingsPage` or the same Settings page helper boundary
- it belongs in `test:frontend:settings`

This keeps the script aligned with the part of the suite most likely to break together.

### 2. Keep script overlap intentional and documented by structure, not by extra abstraction

It is acceptable for `settings-page.account-auth.test.tsx` to remain covered by a more specific auth-oriented command as well as by `test:frontend:settings`. The overlap is intentional because the file sits on two boundaries:

- auth behavior
- shared Settings page rendering behavior

This batch does not attempt to deduplicate all frontend script memberships. It prefers truthful coverage over perfectly disjoint script taxonomy.

### 3. Make the helper boundary more explicit through test coverage, not helper refactor

`renderSettingsPage` already has a narrow settle contract:

- prefer real `settings-storage-card` when present
- fall back to visible `usedSpace` text when content is mocked

This batch should keep that contract but ensure the tests most sensitive to it are part of the same named script. If a tiny helper-facing test assertion or comment is needed to make the expected boundary clearer, that is acceptable. A helper state refactor is explicitly out of scope.

## Files In Scope

### Directly modified

- `app/package.json`
- `app/src/components/__tests__/helpers/renderSettingsPage.tsx` only if a tiny boundary clarification is needed
- `app/src/components/__tests__/helpers/renderSettingsPage.stability.test.tsx` only if a tiny script-alignment assertion is needed

### Required verification targets

- `app/src/components/__tests__/SettingsPage.test.tsx`
- `app/src/components/__tests__/settings-page/settings-page.account-auth.test.tsx`
- `app/src/components/__tests__/settings-page/settings-page.storage-actions.test.tsx`
- existing files already covered by `test:frontend:settings`

## Testing Strategy

Minimum required verification for this batch:

- run the adjusted `npm run test:frontend:settings`
- confirm it now exercises the helper-sensitive Settings files that previously sat outside the command
- run full `npm run verify`

If a helper-facing test is adjusted, it must follow TDD and demonstrate that the tightened script surface would catch the relevant regression.

## Risks And Mitigations

### Risk: script becomes too broad or slow

Adding more Settings tests can increase local runtime.

Mitigation:

- only add the missing helper-sensitive Settings files
- do not expand into unrelated tabs, editor, or app-shell tests

### Risk: script taxonomy becomes overlapping

Some tests may appear in both auth-focused and settings-focused commands.

Mitigation:

- treat overlap as intentional where a file sits on both behavioral boundaries
- prefer correct safety coverage over perfect categorization

### Risk: helper boundary still feels implicit

Even after script coverage is fixed, developers may not know why these files belong together.

Mitigation:

- if needed, add a very small clarifying signal in the helper test area or script naming context
- do not escalate into architectural refactor in this batch

## Success Criteria

This batch is complete when all of the following are true:

- `test:frontend:settings` includes the missing helper-sensitive Settings tests, especially `settings-page.account-auth.test.tsx` and `settings-page.storage-actions.test.tsx`
- the adjusted script passes
- the helper boundary remains stable without broad helper refactor
- full `npm run verify` passes
