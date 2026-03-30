# Service Test Wait Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace two remaining service-test `Promise.resolve()` timing flushes with more explicit synchronization so the tests observe real progress instead of relying on microtask turns.

**Architecture:** Keep this batch test-only unless a real mismatch is exposed. For `cloudSyncOverviewService.test.ts`, use observable queue progress already controlled by the test. For `voiceService.test.ts`, use an explicit deferred boundary owned by the mocked dependency to prove stop-recording is still finalizing.

**Tech Stack:** TypeScript, Jest, React Native service tests

---

### Task 1: Replace Microtask Flushing In `cloudSyncOverviewService.test.ts`

**Files:**
- Modify: `app/src/services/__tests__/cloudSyncOverviewService.test.ts`
- Conditionally modify only if tests reveal a real mismatch: `app/src/services/cloudSyncOverviewService.ts`

- [ ] **Step 1: Add a failing test-local synchronization helper and remove direct `Promise.resolve()` flushing**

Update the targeted concurrency test in `app/src/services/__tests__/cloudSyncOverviewService.test.ts` so it waits on observable progress rather than microtask ticks.

Use a helper local to the test like:

```ts
async function waitForResolversToAccumulate(expected: number) {
  await waitFor(() => {
    expect(resolvers.length).toBe(expected);
  });
}

async function waitForResolvedCount(expected: number) {
  await waitFor(() => {
    expect(resolvedCount).toBe(expected);
  });
}
```

Then change the test flow from:

```ts
const snapshotPromise = service.getSnapshot();
await Promise.resolve();

expect(maxActive).toBeLessThanOrEqual(4);

while (resolvedCount < 10) {
  const pendingResolvers = resolvers.splice(0);
  pendingResolvers.forEach((resolve) => resolve());
  await Promise.resolve();
}
```

to a condition-based version like:

```ts
const snapshotPromise = service.getSnapshot();

await waitForResolversToAccumulate(4);
expect(maxActive).toBeLessThanOrEqual(4);

while (resolvedCount < 10) {
  const pendingResolvers = resolvers.splice(0);
  pendingResolvers.forEach((resolve) => resolve());
  await waitForResolvedCount(Math.min(resolvedCount + pendingResolvers.length, 10));
}
```

Important:

- the exact helper names can differ
- the test must stop using `await Promise.resolve()` for progress advancement
- keep assertions on concurrency behavior unchanged

- [ ] **Step 2: Run the targeted service test and verify whether it exposes a real gap**

Run:

```bash
npm test -- --runInBand src/services/__tests__/cloudSyncOverviewService.test.ts
```

Expected:

- if the test rewrite is correct and the service behavior is unchanged, it may pass immediately
- if it fails, the failure must point to a real mismatch in the assumed progress behavior

- [ ] **Step 3: Make the smallest production fix only if Step 2 exposed a real mismatch**

If the rewritten test fails because `cloudSyncOverviewService.ts` does not provide the observable progress behavior the test is asserting, make the smallest production fix necessary.

If the test passes, make no production change.

- [ ] **Step 4: Re-run the targeted service test and confirm GREEN**

Run:

```bash
npm test -- --runInBand src/services/__tests__/cloudSyncOverviewService.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the cloud overview wait hardening**

If only tests changed:

```bash
git add app/src/services/__tests__/cloudSyncOverviewService.test.ts
git commit -m "test: harden cloud sync overview wait semantics"
```

If a tiny production fix was needed, include that file in the same commit.

### Task 2: Replace Microtask Flushing In `voiceService.test.ts`

**Files:**
- Modify: `app/src/services/__tests__/voiceService.test.ts`
- Conditionally modify only if tests reveal a real mismatch: `app/src/services/voiceService.ts`

- [ ] **Step 1: Add a failing explicit synchronization boundary for stop finalization**

Update `app/src/services/__tests__/voiceService.test.ts` so the stop-recording timing test no longer uses `await Promise.resolve()`.

Replace:

```ts
const stopPromise = VoiceService.stopRecording();

await Promise.resolve();
await expect(VoiceService.getRecordingDuration()).resolves.toBe(0);
```

with an explicit deferred checkpoint controlled by the mocked dependency, for example:

```ts
const deferred = createDeferred<{ size: number }>();
const fileInfoStarted = createDeferred<void>();

(getFileInfo as jest.Mock).mockImplementationOnce(async () => {
  fileInfoStarted.resolve();
  return deferred.promise;
});

const stopPromise = VoiceService.stopRecording();

await fileInfoStarted.promise;
await expect(VoiceService.getRecordingDuration()).resolves.toBe(0);
```

Important:

- the test must stop relying on `await Promise.resolve()`
- the synchronization point must come from an explicit observable checkpoint in the mocked dependency

- [ ] **Step 2: Run the targeted service test and verify whether it exposes a real gap**

Run:

```bash
npm test -- --runInBand src/services/__tests__/voiceService.test.ts
```

Expected:

- if the test rewrite is correct and production behavior is already right, it may pass immediately
- if it fails, the failure must point to a real mismatch in stop-finalization behavior

- [ ] **Step 3: Make the smallest production fix only if Step 2 exposed a real mismatch**

If the rewritten test fails because `voiceService.ts` lacks the expected observable finalization behavior, make the smallest production fix necessary.

If the test passes, make no production change.

- [ ] **Step 4: Re-run the targeted service test and confirm GREEN**

Run:

```bash
npm test -- --runInBand src/services/__tests__/voiceService.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the voice service wait hardening**

If only tests changed:

```bash
git add app/src/services/__tests__/voiceService.test.ts
git commit -m "test: harden voice service stop timing"
```

If a tiny production fix was needed, include that file in the same commit.

### Task 3: Run Focused Service Tests And Full Verification

**Files:**
- Verify only: `app/src/services/__tests__/cloudSyncOverviewService.test.ts`
- Verify only: `app/src/services/__tests__/voiceService.test.ts`

- [ ] **Step 1: Run the focused service wait-hardening verification surface**

Run:

```bash
npm test -- --runInBand src/services/__tests__/cloudSyncOverviewService.test.ts src/services/__tests__/voiceService.test.ts
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

Expected: only the two targeted service test files, optional minimal service fixes, and this batch's spec/plan docs are changed in this worktree.
