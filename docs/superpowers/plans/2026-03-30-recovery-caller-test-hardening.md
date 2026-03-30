# Recovery Caller Test Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten bootstrap and lifecycle caller tests so recovery gating and refresh-failure behavior remain directly covered after recovery sequencing moved into `cloudRecoveryFlowService`.

**Architecture:** Keep the batch test-first and caller-focused. Use narrower mocks or captured closures so the tests exercise caller-owned decisions like whether `syncNow` should actually run and how `refreshError` is handled, without introducing new production abstractions unless a real mismatch is exposed.

**Tech Stack:** TypeScript, Jest, React Native service tests

---

### Task 1: Lock Bootstrap Caller Gating And Refresh Failure Behavior

**Files:**
- Modify: `app/src/services/__tests__/appBootstrapService.test.ts`
- Conditionally modify only if tests reveal a real mismatch: `app/src/services/appBootstrapService.ts`

- [ ] **Step 1: Add a failing bootstrap test for caller-owned sync gating**

Extend `app/src/services/__tests__/appBootstrapService.test.ts` with a test that captures the `syncNow` closure passed into `cloudRecoveryFlowService` and proves the bootstrap caller blocks cloud sync when `needs-decision` is reached.

Add a test like:

```ts
it('passes a sync step that becomes a no-op when bootstrap reaches needs-decision', async () => {
  mockIsAuthenticated = true;
  mockStorageGetString.mockResolvedValueOnce('true');
  mockBuildInitialFlow.mockReturnValueOnce({ type: 'needs-decision' });

  let capturedSyncNow: (() => Promise<void>) | undefined;
  mockRunCloudRecoveryFlow.mockImplementationOnce(
    async (deps: { syncNow: () => Promise<void>; refreshCloudSyncIndicator: () => Promise<void> }) => {
      capturedSyncNow = deps.syncNow;
      await deps.refreshCloudSyncIndicator();
      return {
        syncError: null,
        queueRecovery: { voiceError: null, photoError: null },
        refreshError: null,
      };
    }
  );

  await runAppBootstrap({
    refreshCloudSyncIndicator,
    onInitializationFailed,
  });

  await capturedSyncNow?.();

  expect(mockSyncNow).not.toHaveBeenCalled();
});
```

This must verify caller gating through the closure it passes into the shared flow, not by peeking into local variables.

- [ ] **Step 2: Add a failing bootstrap test for refresh error handling**

Extend the same test file with:

```ts
it('marks initialization failed when the recovery flow reports a refresh error', async () => {
  const refreshError = new Error('refresh failed');
  mockRunCloudRecoveryFlow.mockResolvedValueOnce({
    syncError: null,
    queueRecovery: { voiceError: null, photoError: null },
    refreshError,
  });

  await runAppBootstrap({
    refreshCloudSyncIndicator,
    onInitializationFailed,
  });

  expect(mockLoggerError).toHaveBeenCalledWith('❌ 应用初始化失败:', refreshError);
  expect(onInitializationFailed).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 3: Run bootstrap tests and verify whether they expose a real gap**

Run:

```bash
npm test -- --runInBand src/services/__tests__/appBootstrapService.test.ts
```

Expected:

- if caller behavior already matches the intended semantics, the new tests may pass immediately
- if they fail, the failure must identify a real bootstrap caller mismatch

- [ ] **Step 4: Make the smallest production fix only if Step 3 exposed a real mismatch**

If the new tests fail because bootstrap caller behavior is actually wrong, make the smallest targeted fix in `app/src/services/appBootstrapService.ts`.

If the tests pass immediately, make no production change.

- [ ] **Step 5: Re-run bootstrap tests and confirm GREEN**

Run:

```bash
npm test -- --runInBand src/services/__tests__/appBootstrapService.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit bootstrap caller hardening**

If only tests changed:

```bash
git add app/src/services/__tests__/appBootstrapService.test.ts
git commit -m "test: harden bootstrap recovery caller semantics"
```

If a tiny production fix was needed, include that file in the same commit.

### Task 2: Lock Lifecycle Caller Gating And Refresh Failure Behavior

**Files:**
- Modify: `app/src/services/__tests__/appLifecycleService.test.ts`
- Conditionally modify only if tests reveal a real mismatch: `app/src/services/appLifecycleService.ts`

- [ ] **Step 1: Add a failing lifecycle test for caller-owned sync gating**

Extend `app/src/services/__tests__/appLifecycleService.test.ts` with a test that captures the `syncNow` closure passed into the shared flow and proves lifecycle caller gating prevents cloud sync when auth/cloudMode are not both enabled.

Add a test like:

```ts
it('passes a sync step that becomes a no-op when lifecycle gating disables cloud sync', async () => {
  mockIsAuthenticated = false;
  mockCloudMode = true;

  let capturedSyncNow: (() => Promise<void>) | undefined;
  mockRunCloudRecoveryFlow.mockImplementationOnce(
    async (deps: { syncNow: () => Promise<void>; refreshCloudSyncIndicator: () => Promise<void> }) => {
      capturedSyncNow = deps.syncNow;
      await deps.refreshCloudSyncIndicator();
      return {
        syncError: null,
        queueRecovery: { voiceError: null, photoError: null },
        refreshError: null,
      };
    }
  );

  const runRecovery = createCloudRecoveryRunner({ refreshCloudSyncIndicator });
  await runRecovery('回到前台时');

  await capturedSyncNow?.();

  expect(mockSyncNow).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Add a failing lifecycle test for refresh error propagation**

Extend the same file with:

```ts
it('rethrows refresh failures from the recovery runner so the caller can handle them', async () => {
  const refreshError = new Error('refresh failed');
  mockRunCloudRecoveryFlow.mockResolvedValueOnce({
    syncError: null,
    queueRecovery: { voiceError: null, photoError: null },
    refreshError,
  });

  const runRecovery = createCloudRecoveryRunner({ refreshCloudSyncIndicator });

  await expect(runRecovery('回到前台时')).rejects.toThrow('refresh failed');
});
```

- [ ] **Step 3: Run lifecycle tests and verify whether they expose a real gap**

Run:

```bash
npm test -- --runInBand src/services/__tests__/appLifecycleService.test.ts
```

Expected:

- if caller behavior already matches the intended semantics, the new tests may pass immediately
- if they fail, the failure must identify a real lifecycle caller mismatch

- [ ] **Step 4: Make the smallest production fix only if Step 3 exposed a real mismatch**

If the new tests fail because lifecycle caller behavior is actually wrong, make the smallest targeted fix in `app/src/services/appLifecycleService.ts`.

If the tests pass immediately, make no production change.

- [ ] **Step 5: Re-run lifecycle tests and confirm GREEN**

Run:

```bash
npm test -- --runInBand src/services/__tests__/appLifecycleService.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit lifecycle caller hardening**

If only tests changed:

```bash
git add app/src/services/__tests__/appLifecycleService.test.ts
git commit -m "test: harden lifecycle recovery caller semantics"
```

If a tiny production fix was needed, include that file in the same commit.

### Task 3: Run Focused Recovery Caller Tests And Full Verification

**Files:**
- Verify only: `app/src/services/__tests__/appBootstrapService.test.ts`
- Verify only: `app/src/services/__tests__/appLifecycleService.test.ts`

- [ ] **Step 1: Run the focused recovery caller verification surface**

Run:

```bash
npm test -- --runInBand src/services/__tests__/appBootstrapService.test.ts src/services/__tests__/appLifecycleService.test.ts
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

Expected: only the recovery caller tests, optional minimal caller fixes, and this batch's spec/plan docs are changed in this worktree.
