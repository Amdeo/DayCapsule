# EntryCard Test Wait Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the final `Promise.resolve()` timing flush from `EntryCard.test.tsx` while preserving the existing processing-voice behavior coverage.

**Architecture:** Start with the smallest possible change: remove the microtask wait entirely and verify whether the assertions are already synchronous. Only if that exposes a real behavior gap should the test switch to an explicit behavior-tied synchronization point. Default expectation is test-only change.

**Tech Stack:** TypeScript, Jest, `@testing-library/react-native`

---

### Task 1: Remove The Residual Microtask Flush From `EntryCard.test.tsx`

**Files:**
- Modify: `app/src/components/__tests__/EntryCard.test.tsx`
- Conditionally modify only if tests reveal a real mismatch: `app/src/components/entry-card/useEntryCardController.ts`

- [ ] **Step 1: Rewrite the targeted test to avoid `Promise.resolve()`**

Update the test:

```ts
it('shows voice duration and disabled playback placeholder when localReadyState is processing', async () => {
  const { getByTestId, getByText } = render(
    <EntryCard entry={processingVoiceEntry} onDelete={jest.fn()} />
  );

  await act(async () => {
    fireEvent.press(getByTestId('voice-processing-button-voice-processing-1'));
  });

  expect(getByText('准备中')).toBeTruthy();
  expect(getByText('00:12')).toBeTruthy();
  expect(VoiceService.playAudio).not.toHaveBeenCalled();
});
```

That is the preferred outcome: remove the wait entirely.

If removing the wait makes the test fail for a real timing reason, replace it with an explicit synchronization point tied to observable behavior, not another microtask flush.

- [ ] **Step 2: Run the targeted EntryCard test file and verify whether the rewrite exposes a real gap**

Run:

```bash
npm test -- --runInBand src/components/__tests__/EntryCard.test.tsx
```

Expected:

- if the assertion is already synchronous, the test file may pass immediately
- if it fails, the failure must point to a real behavior or timing mismatch that needs an explicit synchronization point

- [ ] **Step 3: Make the smallest production fix only if Step 2 exposed a real mismatch**

If the rewritten test fails because the processing-voice path truly requires a production fix, make the smallest change in `app/src/components/entry-card/useEntryCardController.ts` or the relevant `entry-card` file.

If the test passes, make no production change.

- [ ] **Step 4: Re-run the targeted EntryCard test file and confirm GREEN**

Run:

```bash
npm test -- --runInBand src/components/__tests__/EntryCard.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit the EntryCard wait hardening**

If only the test changed:

```bash
git add app/src/components/__tests__/EntryCard.test.tsx
git commit -m "test: remove entrycard processing wait flush"
```

If a tiny production fix was needed, include that file in the same commit.

### Task 2: Run Focused Verification And Full App Verification

**Files:**
- Verify only: `app/src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: Run the focused EntryCard verification surface**

Run:

```bash
npm test -- --runInBand src/components/__tests__/EntryCard.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run the full app verification gate**

Run:

```bash
npm run verify
```

Expected: lint, typecheck, and the full Jest suite pass.

- [ ] **Step 3: Confirm the worktree only contains intended changes for this batch**

Run:

```bash
git status --short
```

Expected: only `EntryCard.test.tsx`, optional minimal entry-card production fixes, and this batch's spec/plan docs are changed in this worktree.
