# Error Feedback Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the highest-value silent user-facing failure paths so user-triggered failures surface through branded in-app feedback while existing confirm flows remain on the confirm dialog lane.

**Architecture:** Keep the current two-lane feedback model intact: `showErrorFeedback(...)` for informational/result feedback and `showConfirmDialog(...)` for branching choices. Implement the work as a focused audit plus a small number of high-impact call-site fixes, starting with timeline edit-save failures and other user-triggered entry mutations that currently fail silently.

**Tech Stack:** React Native, Expo Router, TypeScript, Zustand, Jest, `@testing-library/react-native`

---

## File Map

- Modify: `app/src/components/timeline-v2/useTimelineController.ts`
  Why: This hook currently calls `updateEntry(...)` and closes the editor immediately without waiting for async failure or preserving the shared `EntryEditor` failure-feedback path.
- Modify: `app/src/components/__tests__/timeline/timeline.controller.test.tsx`
  Why: This is the smallest existing test entry point for the timeline edit-save flow.
- Modify: `app/src/components/Timeline.v2.tsx`
  Why: Only if `useTimelineController` needs a promise-returning `updateEntry` type to reflect the real store contract.
- Modify: `app/src/store/entryStore.ts`
  Why: Only if type signatures must be tightened so caller code can await mutation failures consistently.
- Modify: `app/src/store/__tests__/entryStore.test.ts`
  Why: Only if type or behavior changes in the store require direct coverage.
- Create: `docs/superpowers/audits/2026-04-02-error-feedback-audit.md`
  Why: Capture the reviewed failure branches, classify them, and prevent the audit from being implicit tribal knowledge.

## Task 1: Capture The Audit Baseline

**Files:**
- Create: `docs/superpowers/audits/2026-04-02-error-feedback-audit.md`
- Modify: `app/src/services/showCloudSyncStatusAlert.ts:275-303`
- Modify: `app/src/components/login-page/useLoginPageController.ts:39-73`
- Modify: `app/src/components/entry-editor/useEntryEditorController.ts:107-130`
- Modify: `app/src/components/timeline-v2/useTimelineController.ts:61-67`

- [x] **Step 1: Write the audit document skeleton**

```md
# 2026-04-02 Error Feedback Audit

## Classification Rule

- Show `showErrorFeedback(...)` when the user directly initiated an action, the action failed, and the user needs a visible explanation.
- Show `showConfirmDialog(...)` when the user must choose between multiple next actions.
- Keep logging-only behavior when the failure is internal, already surfaced elsewhere, or telemetry-only.

## Confirmed Already Covered

- `app/src/components/login-page/useLoginPageController.ts`
- `app/src/components/entry-editor/useEntryEditorController.ts`
- `app/src/services/showCloudSyncStatusAlert.ts`

## Needs Fix

- `app/src/components/timeline-v2/useTimelineController.ts`

## Deferred / Log Only

- Fill with exact file + reason during the audit pass.
```

- [x] **Step 2: Verify the skeleton file exists in the worktree**

Run: `ls "/Users/cooper/Documents/code/MemoryCapsule/.worktrees/error-feedback-unification/docs/superpowers/audits"`
Expected: output includes `2026-04-02-error-feedback-audit.md`

- [x] **Step 3: Fill the first concrete audit entries from already-confirmed flows**

```md
## Confirmed Already Covered

- `app/src/components/login-page/useLoginPageController.ts`
  - Missing credentials -> `showErrorFeedback(...)`
  - Password mismatch -> `showErrorFeedback(...)`
  - Auth request failure -> `buildLoginFailedFeedback(...)`
- `app/src/components/entry-editor/useEntryEditorController.ts`
  - Save failure stays in editor and shows branded `保存失败`
- `app/src/services/showCloudSyncStatusAlert.ts`
  - Manual sync failure -> `buildCloudSyncFailedFeedback(...)`
  - Refresh-after-sync failure -> `buildCloudSyncStatusRefreshFailedFeedback(...)`

## Needs Fix

- `app/src/components/timeline-v2/useTimelineController.ts`
  - `handleSaveEdit(...)` does not await `updateEntry(...)`
  - editor closes even if the async save rejects
  - no branded feedback is shown for the failed save
```

- [x] **Step 4: Sanity-check that the audit reflects the current codebase**

Run: `npm test -- --runInBand src/components/__tests__/LoginPage.test.tsx src/components/__tests__/editor/entry-editor.save-flow.test.tsx src/services/__tests__/showCloudSyncStatusAlert.test.ts`
Expected: PASS for all listed suites

- [ ] **Step 5: Commit the audit baseline**

Skipped in this session because the user did not request any git commit.

```bash
git add docs/superpowers/audits/2026-04-02-error-feedback-audit.md
git commit -m "docs: capture error feedback audit baseline"
```

## Task 2: Fix Timeline Edit Save Failure Feedback

**Files:**
- Modify: `app/src/components/timeline-v2/useTimelineController.ts`
- Modify: `app/src/components/__tests__/timeline/timeline.controller.test.tsx`
- Modify: `app/src/components/Timeline.v2.tsx`

- [x] **Step 1: Write the failing test for rejected timeline save**

Add this test to `app/src/components/__tests__/timeline/timeline.controller.test.tsx`:

```tsx
it('rethrows when saving from the timeline rejects so the editor flow can keep handling the failure', async () => {
  const updateEntry = jest.fn().mockRejectedValueOnce(new Error('db failed'));
  const entry = {
    id: 'entry-1',
    type: 'text',
    content: '旧内容',
    timestamp: Date.now(),
    syncStatus: 'synced',
  } as any;

  const { result } = renderHook(() =>
    useTimelineController({
      updateEntry,
    })
  );

  act(() => {
    result.current.handleEditEntry(entry);
  });

  await expect(
    act(async () => {
      await result.current.handleSaveEdit('entry-1', '新内容', ['已更新']);
    })
  ).rejects.toThrow('db failed');

  expect(updateEntry).toHaveBeenCalledWith('entry-1', {
    content: '新内容',
    tags: ['已更新'],
  });
  expect(result.current.editingEntry).toBe(entry);
});
```

- [x] **Step 2: Run the targeted timeline controller test and verify RED**

Run: `npm test -- --runInBand src/components/__tests__/timeline/timeline.controller.test.tsx`
Expected: FAIL because `handleSaveEdit(...)` resolves instead of rethrowing the rejected save, so the editor flow cannot keep handling the failure

- [x] **Step 3: Write the minimal production fix in the timeline controller**

Update `app/src/components/timeline-v2/useTimelineController.ts` so the contract becomes promise-based and the save only closes on success while rejected saves continue upward to the shared editor feedback flow:

```tsx
interface UseTimelineControllerOptions {
  updateEntry: (id: string, updates: Partial<Entry>) => void | Promise<void>;
}

const handleSaveEdit = useCallback(
  async (id: string, content: string, tags: string[]) => {
    await updateEntry(id, { content, tags });
    closeEditingEntry();
  },
  [closeEditingEntry, updateEntry],
);
```

- [x] **Step 4: Run the targeted timeline controller test and verify GREEN**

Run: `npm test -- --runInBand src/components/__tests__/timeline/timeline.controller.test.tsx`
Expected: PASS

- [x] **Step 5: Run the nearby integration-style editor test for regression coverage**

Run: `npm test -- --runInBand src/components/__tests__/editor/entry-editor.save-flow.test.tsx`
Expected: PASS

- [x] **Step 6: Run the real timeline dialog-chain regression test**

Run: `npm test -- --runInBand src/components/__tests__/Timeline.v2.view-mode.test.tsx`
Expected: PASS with a test proving timeline save rejection keeps the editor usable and surfaces branded save feedback through the real `EntryEditor` chain

- [x] **Step 7: Update the audit document with the fixed status**

Replace the timeline section in `docs/superpowers/audits/2026-04-02-error-feedback-audit.md` with:

```md
## Fixed In This Branch

- `app/src/components/timeline-v2/useTimelineController.ts`
  - `handleSaveEdit(...)` now awaits `updateEntry(...)`
  - failed save keeps the editor open
  - rejected saves continue into the existing `EntryEditor` failure feedback flow, which shows branded `保存失败` feedback without duplicating prompt logic
```

- [ ] **Step 8: Commit the timeline fix**

Skipped in this session because the user did not request any git commit.

```bash
git add app/src/components/timeline-v2/useTimelineController.ts app/src/components/__tests__/timeline/timeline.controller.test.tsx docs/superpowers/audits/2026-04-02-error-feedback-audit.md
git commit -m "fix: show feedback when timeline save fails"
```

## Task 3: Tighten Async Mutation Types Only If Needed

**Files:**
- Modify: `app/src/components/Timeline.v2.tsx`
- Modify: `app/src/store/entryStore.ts`
- Test: `app/src/store/__tests__/entryStore.test.ts`

- [x] **Step 1: Write the failing type-oriented expectation only if the previous task exposed a signature mismatch**

Result: no additional type-oriented change was needed. `entryStore.updateEntry(...)` was already async and the updated controller boundary was sufficient.

If `handleSaveEdit(...)` cannot `await updateEntry(...)` cleanly because of an incompatible local type, make the smallest possible type-only change. The target signatures are:

```tsx
// app/src/components/Timeline.v2.tsx
const updateEntry = useEntryStore((state) => state.updateEntry);

// app/src/components/timeline-v2/useTimelineController.ts
interface UseTimelineControllerOptions {
  updateEntry: (id: string, updates: Partial<Entry>) => void | Promise<void>;
}
```

If `entryStore` already satisfies this at compile/test time, skip the rest of this task and mark it complete.

- [x] **Step 2: Run the smallest suite that exercises the type-affected store path**

Run: `npm test -- --runInBand src/store/__tests__/entryStore.test.ts`
Expected: PASS if no behavioral regression was introduced

- [x] **Step 3: Commit only if code changed in this task**

No code changed in Task 3, so there was nothing to commit.

```bash
git add app/src/components/Timeline.v2.tsx app/src/store/entryStore.ts src/store/__tests__/entryStore.test.ts
git commit -m "refactor: align timeline entry update async types"
```

## Task 4: Verify And Close The First Audit Slice

**Files:**
- Modify: `docs/superpowers/audits/2026-04-02-error-feedback-audit.md`

- [x] **Step 1: Record the first audit slice result explicitly**

Append this section to `docs/superpowers/audits/2026-04-02-error-feedback-audit.md`:

```md
## Next Candidates

- `app/src/components/entry-card/...`
  - verify delete failures triggered from entry cards are surfaced at the user-facing caller
- `app/src/components/timeline-v2/...`
  - verify no other user-triggered mutations close UI optimistically without failure feedback
- `app/src/components/backup-page/useBackupPageController.ts`
  - already heavily covered; keep as reference for branded result/error handling patterns
```

- [x] **Step 2: Run the focused verification command for this branch slice**

Run: `npm test -- --runInBand src/components/__tests__/timeline/timeline.controller.test.tsx src/components/__tests__/editor/entry-editor.save-flow.test.tsx src/components/__tests__/LoginPage.test.tsx src/services/__tests__/showCloudSyncStatusAlert.test.ts`
Expected: PASS

- [ ] **Step 3: Run the full suite before handoff if this slice is being merged immediately**

Run: `npm test -- --runInBand`
Expected: PASS for the full suite

- [ ] **Step 4: Commit the audit status update if the document changed in this task**

Skipped in this session because the user did not request any git commit.

```bash
git add docs/superpowers/audits/2026-04-02-error-feedback-audit.md
git commit -m "docs: update error feedback audit status"
```

## Self-Review

- Spec coverage: this plan implements the explicit audit approach from the spec, preserves the existing two-lane feedback model, and starts with the highest-confidence silent failure already identified in the timeline edit-save flow.
- Placeholder scan: no占位项残留；可选工作已在 Task 3 和 Task 4 中明确了跳过条件。
- Type consistency: `updateEntry` is treated as `void | Promise<void>` at the controller boundary, which matches the real async mutation usage while allowing minimal compatibility at the call site.
