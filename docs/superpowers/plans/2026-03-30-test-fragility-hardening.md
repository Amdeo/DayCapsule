# Test Fragility Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前最脆弱的三类测试改成更稳定的行为断言与条件等待，降低无害重构误伤和异步调度假设带来的假红/假绿。

**Architecture:** 本轮只治理测试，不扩散到无关业务代码。针对三类脆弱点分别处理：把源码文本断言替换为运行时行为断言，把 store 并发测试从“手工冲刷微任务”改成更明确的异步收敛验证，把根布局测试从固定次数 `Promise.resolve()` flush 改成等待明确可观察结果。

**Tech Stack:** Jest, React Native Testing Library, Zustand, Expo Router, TypeScript

---

## File Structure

- Modify: `app/src/__tests__/runtime-regressions.test.ts`
  - 去掉源码 grep 式断言，改成运行时行为守卫。
- Modify: `app/src/store/__tests__/entryStore.test.ts`
  - 收紧“数据库表未就绪的延迟重试在签名过期后应放弃”测试，让它等待明确结果而不是猜微任务层数。
- Modify: `app/app/__tests__/_layout.photo-upload.test.tsx`
  - 删除三层 `Promise.resolve()` 的 flush helper，改成等待明确 bootstrap/lifecycle 可观察结果。
- Reuse: 现有组件测试夹具、现有 mocked services/stores，不新增新的测试基础设施文件，除非实现过程中发现必须抽出一个很小的 helper。

### Task 1: 用运行时行为替换源码文本断言

**Files:**
- Modify: `app/src/__tests__/runtime-regressions.test.ts`
- Test: `app/src/__tests__/runtime-regressions.test.ts`

- [ ] **Step 1: 写出新的失败测试设计，覆盖当前 4 条脆弱源码断言对应的行为**

把测试目标从源码文本改成行为：

- `GestureHandlerRootView`：渲染根 layout，断言根壳层渲染正常，且必要包装存在于渲染树中或相关交互上下文可工作。
- `SyncService` named export：不要再断言 import 语句文本，改成 mock `@/src/services/syncService`，渲染 `BackupPage` 或调用相关路径，断言消费方实际通过该依赖完成交互。
- “只在进入后台时检查备份节流”：通过 `handleAppStateChange()` 或 `appLifecycleService` 的行为测试，mock `BackupService.shouldBackup`，断言仅 background 分支会调用。
- “只在显示值变化时更新时间”：通过 `HomeScreen` / 相关 hook / 工具路径的运行时行为测试，模拟 duration 序列，断言最终显示或 setter 行为只在可见值变化时更新。

优先复用已有测试入口，不强行把 4 个守卫都塞进一个文件的单一风格里。

- [ ] **Step 2: 先让至少一个代表性断言以旧实现方式失败，再切到新断言方向**

Run: `npm test -- --runInBand --runTestsByPath src/__tests__/runtime-regressions.test.ts`

Expected: FAIL during transition while old grep assertions are removed and new runtime assertions尚未全部补齐

- [ ] **Step 3: 以最小改动实现新的运行时守卫测试**

允许把 `runtime-regressions.test.ts` 拆成更贴近行为的测试组合，但不要扩大到无关页面。目标是：

```ts
describe('runtime regression guards', () => {
  it('keeps backup throttling scoped to background transitions', async () => {
    const shouldBackup = jest.fn().mockResolvedValue(false);
    jest.doMock('@/src/services/backupService', () => ({
      BackupService: {
        shouldBackup,
        createBackup: jest.fn(),
      },
    }));

    await handleAppStateChange('active', 'background', jest.fn());
    expect(shouldBackup).toHaveBeenCalledTimes(1);

    shouldBackup.mockClear();
    await handleAppStateChange('background', 'active', jest.fn());
    expect(shouldBackup).not.toHaveBeenCalled();
  });
});
```

如果其中某条守卫更适合迁移到现有测试文件而不是保留在 `runtime-regressions.test.ts`，可以这么做，但必须让原先的 4 条源码文本断言全部被移除。

- [ ] **Step 4: 运行该测试文件确认新守卫通过**

Run: `npm test -- --runInBand --runTestsByPath src/__tests__/runtime-regressions.test.ts`

Expected: PASS

### Task 2: 收紧 entryStore 的延迟重试竞态测试

**Files:**
- Modify: `app/src/store/__tests__/entryStore.test.ts`
- Test: `app/src/store/__tests__/entryStore.test.ts`

- [ ] **Step 1: 先让“数据库表未就绪的延迟重试在签名过期后应放弃”测试显式表达异步目标**

把当前测试中的：

```ts
await Promise.resolve();
jest.runOnlyPendingTimers();
await Promise.resolve();
await Promise.resolve();
```

替换为更清晰的阶段式等待思路，例如：

- 先启动首个 `loadEntries()`
- 明确触发新的 `applySearchFilters({ query: 'fresh' })`
- 再推进唯一预期的 retry timer
- 然后等待明确的 store 状态收敛

在改实现前，先让测试在不依赖固定微任务层数的写法下暴露真实需求。

- [ ] **Step 2: 运行单测确认过渡态下能暴露问题或至少精确覆盖目标行为**

Run: `npm test -- --runInBand --testNamePattern "数据库表未就绪的延迟重试在签名过期后应放弃" src/store/__tests__/entryStore.test.ts`

Expected: If transition temporarily breaks assumptions, FAIL with a clear mismatch on final entries; otherwise continue once the new assertion shape is in place.

- [ ] **Step 3: 用条件等待替代微任务层数猜测**

优先写成：

```ts
await act(async () => {
  jest.runOnlyPendingTimers();
});

await waitFor(() => {
  expect(useEntryStore.getState().entries.map((entry) => entry.id)).toEqual(['fresh']);
});
```

如果单靠 `waitFor` 不够稳定，可以结合对 mockDataSource 调用次数或当前 `searchQuery` 的明确等待，但不要再通过固定数量的 `Promise.resolve()` 冲刷队列。

- [ ] **Step 4: 运行该测试文件确认竞态守卫稳定通过**

Run: `npm test -- --runInBand --runTestsByPath src/store/__tests__/entryStore.test.ts`

Expected: PASS

### Task 3: 去掉 RootLayout 测试中的三层 flushPromises

**Files:**
- Modify: `app/app/__tests__/_layout.photo-upload.test.tsx`
- Test: `app/app/__tests__/_layout.photo-upload.test.tsx`

- [ ] **Step 1: 先把 flush helper 改成等待明确可观察结果的方向**

移除：

```ts
const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};
```

改为针对不同测试等待不同信号，例如：

- bootstrap delegation：`await waitFor(() => expect(mockRunAppBootstrap).toHaveBeenCalledTimes(1));`
- failure feedback：`await waitFor(() => expect(mockShowErrorFeedback).toHaveBeenCalledWith(...));`
- listener wiring：`await waitFor(() => expect(networkListener).toBeTruthy());`

- [ ] **Step 2: 运行该测试文件，确认移除 flush helper 后旧测试会在过渡态暴露问题或至少需要新等待逻辑**

Run: `npm test -- --runInBand --runTestsByPath app/__tests__/_layout.photo-upload.test.tsx`

Expected: During transition, FAIL or partial FAIL until each case is converted to explicit waiting

- [ ] **Step 3: 对每个用例改成等待明确条件，不再共享“万能 flush”**

目标写法示例：

```ts
it('delegates app bootstrap to the bootstrap service', async () => {
  const screen = render(<RootLayout />);

  await waitFor(() => {
    expect(mockRunAppBootstrap).toHaveBeenCalledTimes(1);
  });

  expect(screen.getByTestId('root-layout-shell')).toBeTruthy();
});
```

对于 `networkListener`、`appStateListener`、错误反馈等断言，也都分别等待对应可观察结果，避免通用 flush helper。

- [ ] **Step 4: 运行该测试文件确认通过**

Run: `npm test -- --runInBand --runTestsByPath app/__tests__/_layout.photo-upload.test.tsx`

Expected: PASS

### Task 4: 最终验证

**Files:**
- Modify: `app/src/__tests__/runtime-regressions.test.ts`
- Modify: `app/src/store/__tests__/entryStore.test.ts`
- Modify: `app/app/__tests__/_layout.photo-upload.test.tsx`

- [ ] **Step 1: 运行这三个目标测试文件**

Run: `npm test -- --runInBand --runTestsByPath src/__tests__/runtime-regressions.test.ts src/store/__tests__/entryStore.test.ts app/__tests__/_layout.photo-upload.test.tsx`

Expected: PASS

- [ ] **Step 2: 运行全量测试，确认没有引入回归**

Run: `npm test -- --runInBand`

Expected: PASS

- [ ] **Step 3: 运行带句柄检测的全量测试，确认没有把 warning cleanup 重新打坏**

Run: `npm test -- --runInBand --detectOpenHandles --openHandlesTimeout=3000`

Expected: PASS with 117/117 suites and no reintroduced act/open-handle warning output
