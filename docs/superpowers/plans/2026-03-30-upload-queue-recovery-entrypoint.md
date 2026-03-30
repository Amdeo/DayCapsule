# Upload Queue Recovery Entrypoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify voice/photo pending-upload recovery behind one focused service entrypoint so bootstrap-time and lifecycle-time recovery stop duplicating direct queue flush calls.

**Architecture:** Add one small upload queue recovery service that owns the shared queue-flush behavior and preserves isolated failure handling between voice and photo flushes. Keep `appBootstrapService` and `appLifecycleService` responsible for their own timing, labels, and follow-up actions, but make them depend on the shared recovery entrypoint instead of direct queue APIs.

**Tech Stack:** TypeScript, Jest, React Native services, upload queue services

---

### Task 1: Create The Shared Upload Queue Recovery Entrypoint

**Files:**
- Create: `app/src/services/uploadQueueRecoveryService.ts`
- Create: `app/src/services/__tests__/uploadQueueRecoveryService.test.ts`

- [ ] **Step 1: Add a failing service test for shared queue recovery**

Create `app/src/services/__tests__/uploadQueueRecoveryService.test.ts` with a focused test proving the new entrypoint invokes both queue flush functions:

```ts
import { createUploadQueueRecoveryService } from '../uploadQueueRecoveryService';

describe('uploadQueueRecoveryService', () => {
  it('flushes both pending upload queues through one entrypoint', async () => {
    const flushPendingVoiceUploads = jest.fn(async () => undefined);
    const flushPendingPhotoUploads = jest.fn(async () => undefined);

    const service = createUploadQueueRecoveryService({
      flushPendingVoiceUploads,
      flushPendingPhotoUploads,
    });

    await service.flushPendingUploads();

    expect(flushPendingVoiceUploads).toHaveBeenCalledTimes(1);
    expect(flushPendingPhotoUploads).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the new service test and verify RED**

Run:

```bash
npm test -- --runInBand src/services/__tests__/uploadQueueRecoveryService.test.ts
```

Expected: FAIL because the new service module does not exist yet.

- [ ] **Step 3: Implement the minimal shared recovery service**

Create `app/src/services/uploadQueueRecoveryService.ts` with a focused API like:

```ts
import { flushPendingVoiceUploads } from '@/src/services/voiceUploadQueue';
import { flushPendingPhotoUploads } from '@/src/services/photoUploadQueue';

export interface UploadQueueRecoveryDeps {
  flushPendingVoiceUploads: () => Promise<void>;
  flushPendingPhotoUploads: () => Promise<void>;
}

export function createUploadQueueRecoveryService(
  deps: UploadQueueRecoveryDeps = {
    flushPendingVoiceUploads,
    flushPendingPhotoUploads,
  }
) {
  return {
    async flushPendingUploads(): Promise<void> {
      await deps.flushPendingVoiceUploads();
      await deps.flushPendingPhotoUploads();
    },
  };
}
```

Keep the abstraction narrow:

- one focused entrypoint
- no lifecycle/bootstrap-specific labels
- no sync or indicator logic

- [ ] **Step 4: Re-run the service test and verify GREEN**

Run:

```bash
npm test -- --runInBand src/services/__tests__/uploadQueueRecoveryService.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the new recovery entrypoint**

Run:

```bash
git add app/src/services/uploadQueueRecoveryService.ts app/src/services/__tests__/uploadQueueRecoveryService.test.ts
git commit -m "refactor: add shared upload queue recovery entrypoint"
```

### Task 2: Preserve Isolated Failure Handling In The Shared Entrypoint

**Files:**
- Modify: `app/src/services/uploadQueueRecoveryService.ts`
- Modify: `app/src/services/__tests__/uploadQueueRecoveryService.test.ts`

- [ ] **Step 1: Add a failing service test for isolated flush failures**

Extend `app/src/services/__tests__/uploadQueueRecoveryService.test.ts` with a test proving one queue failure does not block the other queue flush attempt:

```ts
it('still attempts the photo queue when the voice queue flush fails', async () => {
  const error = new Error('voice queue failed');
  const flushPendingVoiceUploads = jest.fn(async () => {
    throw error;
  });
  const flushPendingPhotoUploads = jest.fn(async () => undefined);

  const service = createUploadQueueRecoveryService({
    flushPendingVoiceUploads,
    flushPendingPhotoUploads,
  });

  await expect(service.flushPendingUploads()).rejects.toThrow('voice queue failed');
  expect(flushPendingPhotoUploads).toHaveBeenCalledTimes(1);
});
```

The exact error surface can vary, but the test must prove:

- both flushes are attempted even if the first fails
- the shared entrypoint does not silently skip the second queue

- [ ] **Step 2: Run the service test and verify RED**

Run:

```bash
npm test -- --runInBand src/services/__tests__/uploadQueueRecoveryService.test.ts
```

Expected: FAIL because the current implementation short-circuits on the first thrown error.

- [ ] **Step 3: Implement isolated failure behavior in the shared entrypoint**

Update `app/src/services/uploadQueueRecoveryService.ts` so both queue flushes are attempted and any failures are surfaced after both attempts complete. A minimal acceptable shape is:

```ts
export function createUploadQueueRecoveryService(
  deps: UploadQueueRecoveryDeps = {
    flushPendingVoiceUploads,
    flushPendingPhotoUploads,
  }
) {
  return {
    async flushPendingUploads(): Promise<void> {
      let firstError: unknown = null;

      await deps.flushPendingVoiceUploads().catch((error) => {
        firstError = firstError ?? error;
      });

      await deps.flushPendingPhotoUploads().catch((error) => {
        firstError = firstError ?? error;
      });

      if (firstError) {
        throw firstError;
      }
    },
  };
}
```

This preserves the batch's intended behavior:

- both queues get a recovery attempt
- caller services can still apply their own contextual logging by catching around the shared entrypoint or around injected wrappers

- [ ] **Step 4: Re-run the service test and verify GREEN**

Run:

```bash
npm test -- --runInBand src/services/__tests__/uploadQueueRecoveryService.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the isolated-failure behavior**

Run:

```bash
git add app/src/services/uploadQueueRecoveryService.ts app/src/services/__tests__/uploadQueueRecoveryService.test.ts
git commit -m "test: preserve isolated upload recovery failures"
```

### Task 3: Switch Bootstrap And Lifecycle To The Shared Entrypoint

**Files:**
- Modify: `app/src/services/appBootstrapService.ts`
- Modify: `app/src/services/appLifecycleService.ts`
- Modify: `app/src/services/__tests__/appBootstrapService.test.ts`
- Modify: `app/src/services/__tests__/appLifecycleService.test.ts`

- [ ] **Step 1: Add or tighten failing tests for the new shared dependency usage**

Update bootstrap/lifecycle service tests so they expect the shared recovery entrypoint instead of direct queue flush imports.

For `app/src/services/__tests__/appBootstrapService.test.ts`, replace the direct queue mocks with a shared recovery mock and assert bootstrap still runs recovery before refreshing the indicator:

```ts
const mockFlushPendingUploads = jest.fn(async () => undefined);

jest.mock('@/src/services/uploadQueueRecoveryService', () => ({
  createUploadQueueRecoveryService: () => ({
    flushPendingUploads: (...args: unknown[]) => mockFlushPendingUploads(...args),
  }),
}));
```

and update assertions such as:

```ts
expect(mockFlushPendingUploads).toHaveBeenCalledTimes(1);
expect(mockLoadSync.mock.invocationCallOrder[0]).toBeLessThan(
  mockFlushPendingUploads.mock.invocationCallOrder[0]
);
expect(mockFlushPendingUploads.mock.invocationCallOrder[0]).toBeLessThan(
  refreshCloudSyncIndicator.mock.invocationCallOrder[0]
);
```

For `app/src/services/__tests__/appLifecycleService.test.ts`, similarly swap direct queue mocks for the shared recovery mock and assert recovery still occurs before indicator refresh.

- [ ] **Step 2: Run the bootstrap/lifecycle tests and verify RED**

Run:

```bash
npm test -- --runInBand src/services/__tests__/appBootstrapService.test.ts src/services/__tests__/appLifecycleService.test.ts
```

Expected: FAIL until the production services switch to the new shared entrypoint.

- [ ] **Step 3: Update bootstrap and lifecycle services to use the shared entrypoint**

Modify `app/src/services/appBootstrapService.ts` so it imports the new recovery service and calls it instead of the two direct queue functions. The shape should stay minimal, for example:

```ts
import { createUploadQueueRecoveryService } from '@/src/services/uploadQueueRecoveryService';

const uploadRecovery = createUploadQueueRecoveryService();

await uploadRecovery.flushPendingUploads().catch((queueError) => {
  logger.warn('⚠️ 启动时补传待上传队列失败:', queueError);
});
```

Modify `app/src/services/appLifecycleService.ts` similarly inside the recovery runner:

```ts
import { createUploadQueueRecoveryService } from '@/src/services/uploadQueueRecoveryService';

const uploadRecovery = createUploadQueueRecoveryService();

await uploadRecovery.flushPendingUploads().catch((queueError) =>
  logger.warn(`⚠️ ${label}补传待上传队列失败:`, queueError)
);
```

Important constraints:

- remove the direct queue flush imports from both files
- do not move sync or indicator logic into the shared recovery service
- keep caller-side contextual logging in bootstrap/lifecycle

- [ ] **Step 4: Re-run bootstrap/lifecycle tests and verify GREEN**

Run:

```bash
npm test -- --runInBand src/services/__tests__/appBootstrapService.test.ts src/services/__tests__/appLifecycleService.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the shared recovery entrypoint adoption**

Run:

```bash
git add app/src/services/appBootstrapService.ts app/src/services/appLifecycleService.ts app/src/services/__tests__/appBootstrapService.test.ts app/src/services/__tests__/appLifecycleService.test.ts
git commit -m "refactor: share upload queue recovery entrypoint"
```

### Task 4: Run Full Verification And Confirm Final Scope

**Files:**
- Verify only: `app/src/services/uploadQueueRecoveryService.ts`
- Verify only: `app/src/services/__tests__/uploadQueueRecoveryService.test.ts`
- Verify only: `app/src/services/appBootstrapService.ts`
- Verify only: `app/src/services/appLifecycleService.ts`

- [ ] **Step 1: Run the focused recovery verification surface**

Run:

```bash
npm test -- --runInBand src/services/__tests__/uploadQueueRecoveryService.test.ts src/services/__tests__/appBootstrapService.test.ts src/services/__tests__/appLifecycleService.test.ts
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

Expected: only the upload queue recovery service/tests/spec/plan and the two caller services/tests are changed in this worktree.
