# Cloud Recovery Flow Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define the shared cloud recovery execution order in one focused service so bootstrap and lifecycle keep their own preconditions but stop each hand-writing `sync -> upload recovery -> indicator refresh`.

**Architecture:** Add a narrow cloud recovery flow service that accepts injected step functions and returns structured per-step results for callers. Keep bootstrap/lifecycle responsible for deciding whether recovery should run and what warning labels to emit, while the new shared layer owns only the execution order.

**Tech Stack:** TypeScript, Jest, React Native services, sync/upload recovery services

---

### Task 1: Add The Shared Cloud Recovery Flow Service

**Files:**
- Create: `app/src/services/cloudRecoveryFlowService.ts`
- Create: `app/src/services/__tests__/cloudRecoveryFlowService.test.ts`

- [ ] **Step 1: Add a failing service test proving the shared recovery order**

Create `app/src/services/__tests__/cloudRecoveryFlowService.test.ts` with a focused test proving the service runs steps in the required order:

```ts
import { createCloudRecoveryFlowService } from '../cloudRecoveryFlowService';

describe('cloudRecoveryFlowService', () => {
  it('runs sync, then upload recovery, then indicator refresh', async () => {
    const calls: string[] = [];

    const service = createCloudRecoveryFlowService();

    await service.runRecoveryFlow({
      syncNow: async () => {
        calls.push('sync');
        return null;
      },
      recoverPendingUploads: async () => {
        calls.push('upload-recovery');
        return { voiceError: null, photoError: null };
      },
      refreshIndicator: async () => {
        calls.push('indicator');
      },
    });

    expect(calls).toEqual(['sync', 'upload-recovery', 'indicator']);
  });
});
```

- [ ] **Step 2: Run the new service test and verify RED**

Run:

```bash
npm test -- --runInBand src/services/__tests__/cloudRecoveryFlowService.test.ts
```

Expected: FAIL because the new service module does not exist yet.

- [ ] **Step 3: Implement the minimal shared flow service**

Create `app/src/services/cloudRecoveryFlowService.ts` with a narrow API like:

```ts
import type { UploadQueueRecoveryResult } from '@/src/services/uploadQueueRecoveryService';

export interface CloudRecoveryFlowResult {
  syncError: unknown | null;
  uploadRecovery: UploadQueueRecoveryResult;
}

export function createCloudRecoveryFlowService() {
  return {
    async runRecoveryFlow({
      syncNow,
      recoverPendingUploads,
      refreshIndicator,
    }: {
      syncNow: () => Promise<unknown>;
      recoverPendingUploads: () => Promise<UploadQueueRecoveryResult>;
      refreshIndicator: () => Promise<void>;
    }): Promise<CloudRecoveryFlowResult> {
      let syncError: unknown | null = null;

      try {
        await syncNow();
      } catch (error) {
        syncError = error;
      }

      const uploadRecovery = await recoverPendingUploads();
      await refreshIndicator();

      return {
        syncError,
        uploadRecovery,
      };
    },
  };
}
```

Constraints:

- keep the service free of auth/cloudMode logic
- keep it free of caller-specific warning wording
- only own the shared order and structured results

- [ ] **Step 4: Re-run the service test and verify GREEN**

Run:

```bash
npm test -- --runInBand src/services/__tests__/cloudRecoveryFlowService.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the shared flow service**

Run:

```bash
git add app/src/services/cloudRecoveryFlowService.ts app/src/services/__tests__/cloudRecoveryFlowService.test.ts
git commit -m "refactor: add shared cloud recovery flow"
```

### Task 2: Preserve Structured Step Results In The Shared Flow

**Files:**
- Modify: `app/src/services/cloudRecoveryFlowService.ts`
- Modify: `app/src/services/__tests__/cloudRecoveryFlowService.test.ts`

- [ ] **Step 1: Add a service test for structured error results**

Extend `app/src/services/__tests__/cloudRecoveryFlowService.test.ts` with a test proving callers receive per-step failure information without losing order:

```ts
it('returns sync and upload recovery results to the caller', async () => {
  const syncError = new Error('sync failed');
  const voiceError = new Error('voice failed');

  const service = createCloudRecoveryFlowService();

  await expect(
    service.runRecoveryFlow({
      syncNow: async () => {
        throw syncError;
      },
      recoverPendingUploads: async () => ({
        voiceError,
        photoError: null,
      }),
      refreshIndicator: async () => undefined,
    })
  ).resolves.toEqual({
    syncError,
    uploadRecovery: {
      voiceError,
      photoError: null,
    },
  });
});
```

- [ ] **Step 2: Run the service test and verify whether existing behavior already satisfies it**

Run:

```bash
npm test -- --runInBand src/services/__tests__/cloudRecoveryFlowService.test.ts
```

Expected: FAIL until the service returns the structured result shape required by callers.

If the new test passes immediately because Task 1 already implemented the structured-result contract, record that explicitly and treat Task 2 as test-coverage tightening rather than a production-code change.

- [ ] **Step 3: Implement the minimal structured-result behavior only if Step 2 exposed a real gap**

If Step 1 exposed a real gap, update `cloudRecoveryFlowService.ts` so it returns the exact structured step results callers need:

- `syncError`
- `uploadRecovery.voiceError`
- `uploadRecovery.photoError`

and still always refresh the indicator after upload recovery.

- [ ] **Step 4: Re-run the service test and verify GREEN**

Run:

```bash
npm test -- --runInBand src/services/__tests__/cloudRecoveryFlowService.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the structured-result behavior only if it required changes beyond Task 1**

If Task 1 already delivered the required structured-result behavior and no new code changes were needed, skip this commit.

Otherwise run:

```bash
git add app/src/services/cloudRecoveryFlowService.ts app/src/services/__tests__/cloudRecoveryFlowService.test.ts
git commit -m "test: preserve structured cloud recovery results"
```

### Task 3: Switch Bootstrap And Lifecycle To The Shared Recovery Flow Order

**Files:**
- Modify: `app/src/services/appBootstrapService.ts`
- Modify: `app/src/services/appLifecycleService.ts`
- Modify: `app/src/services/__tests__/appBootstrapService.test.ts`
- Modify: `app/src/services/__tests__/appLifecycleService.test.ts`

- [ ] **Step 1: Add or tighten failing tests for the shared order adoption**

Update bootstrap/lifecycle tests so they mock the new shared flow instead of separately asserting the inline sequence. For bootstrap:

```ts
const mockRunRecoveryFlow = jest.fn(async () => ({
  syncError: null,
  uploadRecovery: { voiceError: null, photoError: null },
}));

jest.mock('@/src/services/cloudRecoveryFlowService', () => ({
  createCloudRecoveryFlowService: () => ({
    runRecoveryFlow: (...args: unknown[]) => mockRunRecoveryFlow(...args),
  }),
}));
```

Then assert bootstrap still uses the shared flow before refreshing indicator-dependent completion paths where applicable.

For lifecycle, similarly mock `runRecoveryFlow` and assert:

- recovery still reuses one in-flight promise
- caller-specific labels still appear in warnings based on returned `syncError` / `uploadRecovery` fields

- [ ] **Step 2: Run bootstrap/lifecycle tests and verify RED**

Run:

```bash
npm test -- --runInBand src/services/__tests__/appBootstrapService.test.ts src/services/__tests__/appLifecycleService.test.ts
```

Expected: FAIL until the production callers switch to the shared flow service.

- [ ] **Step 3: Update bootstrap and lifecycle to use the shared flow order**

Modify `app/src/services/appBootstrapService.ts` so the bootstrap recovery section uses the new shared flow service while keeping its own gating logic. A minimal acceptable shape is:

```ts
import { createCloudRecoveryFlowService } from '@/src/services/cloudRecoveryFlowService';
import { createUploadQueueRecoveryService } from '@/src/services/uploadQueueRecoveryService';

const recoveryFlow = createCloudRecoveryFlowService();
const uploadRecovery = createUploadQueueRecoveryService();

const recoveryResult = await recoveryFlow.runRecoveryFlow({
  syncNow: async () => {
    if (flow.type !== 'needs-decision') {
      await cloudSync.syncNow();
    }
  },
  recoverPendingUploads: () => uploadRecovery.flushPendingUploads(),
  refreshIndicator: () => deps.refreshCloudSyncIndicator('启动后'),
});

if (recoveryResult.syncError) {
  logger.warn('⚠️ 启动时云同步失败:', recoveryResult.syncError);
}
if (recoveryResult.uploadRecovery.voiceError) {
  logger.warn('⚠️ 启动时补传待上传语音失败:', recoveryResult.uploadRecovery.voiceError);
}
if (recoveryResult.uploadRecovery.photoError) {
  logger.warn('⚠️ 启动时补传待上传照片失败:', recoveryResult.uploadRecovery.photoError);
}
```

Modify `app/src/services/appLifecycleService.ts` similarly, but keep auth/cloudMode gating in the caller:

```ts
const recoveryResult = await recoveryFlow.runRecoveryFlow({
  syncNow: async () => {
    if (useAuthStore.getState().isAuthenticated && useSettingsStore.getState().cloudMode === true) {
      await createCloudSyncService().syncNow();
    }
  },
  recoverPendingUploads: () => uploadRecovery.flushPendingUploads(),
  refreshIndicator: () => deps.refreshCloudSyncIndicator(`${label}后`),
});
```

Then log based on returned `syncError`, `uploadRecovery.voiceError`, and `uploadRecovery.photoError`.

Constraints:

- do not move auth/cloudMode gating into the shared flow
- do not move warning wording into the shared flow
- keep caller-specific labels in callers

- [ ] **Step 4: Re-run bootstrap/lifecycle tests and verify GREEN**

Run:

```bash
npm test -- --runInBand src/services/__tests__/appBootstrapService.test.ts src/services/__tests__/appLifecycleService.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the shared recovery flow adoption**

Run:

```bash
git add app/src/services/cloudRecoveryFlowService.ts app/src/services/__tests__/cloudRecoveryFlowService.test.ts app/src/services/appBootstrapService.ts app/src/services/appLifecycleService.ts app/src/services/__tests__/appBootstrapService.test.ts app/src/services/__tests__/appLifecycleService.test.ts
git commit -m "refactor: share cloud recovery flow order"
```

### Task 4: Run Full Verification And Confirm Final Scope

**Files:**
- Verify only: `app/src/services/cloudRecoveryFlowService.ts`
- Verify only: `app/src/services/__tests__/cloudRecoveryFlowService.test.ts`
- Verify only: `app/src/services/appBootstrapService.ts`
- Verify only: `app/src/services/appLifecycleService.ts`

- [ ] **Step 1: Run the focused recovery flow verification surface**

Run:

```bash
npm test -- --runInBand src/services/__tests__/cloudRecoveryFlowService.test.ts src/services/__tests__/appBootstrapService.test.ts src/services/__tests__/appLifecycleService.test.ts
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

Expected: only the cloud recovery flow service/tests/spec/plan and the two caller services/tests are changed in this worktree.
