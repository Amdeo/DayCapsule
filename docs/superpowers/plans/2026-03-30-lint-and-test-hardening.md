# Lint And Test Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 恢复 `entry-card` 样式 lint 基线，并收口一小批已识别的测试脆弱点，避免无害重构被时序假设和实现细节断言误伤。

**Architecture:** 本轮分成两段执行：先只解决 `entry-card` 相关的 4 个 lint 错误，再针对 4 个已点名测试文件，把 `Promise.resolve()` 冲刷和 `setTimeout(0)` 时序假设改为更明确的条件等待或可观察状态驱动。范围严格限制在 spec 点名的文件，不扩散到其它测试域。

**Tech Stack:** React Native, Expo Router, NativeWind/className, Jest, React Native Testing Library, TypeScript

---

## File Structure

- Modify: `app/src/components/entry-card/EntryCard.styles.ts`
  - 消除 `StyleSheet.create` 规则冲突，保留视觉语义。
- Modify: `app/src/components/entry-card/EntryCardCalendarPhotoSection.tsx`
  - 去掉当前两处静态内联样式，改成规则允许的写法。
- Modify: `app/src/components/entry-card/EntryCardDefaultContent.tsx`
  - 去掉当前一处静态内联样式，改成规则允许的写法。
- Modify: `app/src/services/__tests__/cloudSyncService.test.ts`
  - 去掉 `setTimeout(resolve, 0)` 型时序驱动，改成显式条件控制。
- Modify: `app/src/store/__tests__/entryStore.test.ts`
  - 收口剩余 `Promise.resolve()` 冲刷点。
- Modify: `app/src/services/__tests__/appLifecycleService.test.ts`
  - 把依赖微任务推进的等待改成明确观察点。
- Modify: `app/src/database/__tests__/operations.test.ts`
  - 把现有 `Promise.resolve()` 冲刷点改成条件等待或更直接的行为断言。

### Task 1: 修复 entry-card lint 错误

**Files:**
- Modify: `app/src/components/entry-card/EntryCard.styles.ts`
- Modify: `app/src/components/entry-card/EntryCardCalendarPhotoSection.tsx`
- Modify: `app/src/components/entry-card/EntryCardDefaultContent.tsx`
- Test: `app/src/components/entry-card/EntryCardCalendarPhotoSection.tsx`
- Test: `app/src/components/entry-card/EntryCardDefaultContent.tsx`

- [ ] **Step 1: 先让 lint 明确指向当前 4 个错误位置**

Run: `npm run lint`

Expected:
- FAIL only on:
  - `app/src/components/entry-card/EntryCard.styles.ts`
  - `app/src/components/entry-card/EntryCardCalendarPhotoSection.tsx` (2 errors)
  - `app/src/components/entry-card/EntryCardDefaultContent.tsx`

- [ ] **Step 2: 用仓库允许的样式写法替换 `StyleSheet.create` 与静态内联样式**

目标是最小迁移，不重写结构。

处理方式：

- `EntryCard.styles.ts`
  - 如果只是提供静态类语义，优先把这些样式折回消费处的 `className`
  - 如果文件只剩纯静态样式映射，删除 `StyleSheet.create`，改成 class token / plain object / 现有 helper 允许的结构

- `EntryCardCalendarPhotoSection.tsx`
  - 把当前两处静态内联 style：

```tsx
style={{ ... }}
```

改成等价的 `className` 或拆分成运行时唯一必须保留的动态 style + 静态 className。

- `EntryCardDefaultContent.tsx`
  - 把当前一处静态内联 style 改成等价 `className`

要求：
- 保持当前 UI 语义
- 不引入新的 `StyleSheet.create`
- 不把静态 style 换成另一种静态 inline object

- [ ] **Step 3: 运行 lint 验证样式迁移是否清掉这 4 个错误**

Run: `npm run lint`

Expected: PASS, or at minimum no remaining errors in the three `entry-card` files if unrelated issues unexpectedly appear elsewhere

### Task 2: 收口 cloudSyncService 并发测试中的 `setTimeout(0)`

**Files:**
- Modify: `app/src/services/__tests__/cloudSyncService.test.ts`
- Test: `app/src/services/__tests__/cloudSyncService.test.ts`

- [ ] **Step 1: 写出更明确的并发等待方式，替换 `setTimeout(resolve, 0)`**

当前脆弱点：

```ts
await new Promise((resolve) => setTimeout(resolve, 0));
```

目标改成显式 deferred 或对“首个 sync 已经进入 in-flight 状态”的等待，例如：

```ts
const gate = createDeferred<void>();
mockSyncNow.mockImplementationOnce(async () => {
  gate.resolve();
  return await neverSettledUntilReleased();
});

const firstRun = service.syncNow();
await gate.promise;
const secondRun = service.syncNow();
```

如果文件已有 deferred helper，优先复用；没有就只在测试文件内新增一个小 helper。

- [ ] **Step 2: 运行该测试文件，确认过渡态下旧时序假设已被替换**

Run: `npm test -- --runInBand --runTestsByPath src/services/__tests__/cloudSyncService.test.ts`

Expected: PASS

### Task 3: 收口 entryStore 其余微任务冲刷点

**Files:**
- Modify: `app/src/store/__tests__/entryStore.test.ts`
- Test: `app/src/store/__tests__/entryStore.test.ts`

- [ ] **Step 1: 只处理 grep 已暴露的残余 `Promise.resolve()` 冲刷点**

目标位置目前在同文件约 `455-457` 行附近。

将类似：

```ts
await Promise.resolve();
await Promise.resolve();
await Promise.resolve();
```

改成：
- `waitFor(...)` 等待明确 store 状态
- 必要时用 `act(() => jest.runOnlyPendingTimers())`
- 或等待明确 mock 调用完成

不要顺手重写整份 `entryStore.test.ts`。

- [ ] **Step 2: 运行该测试文件确认通过**

Run: `npm test -- --runInBand --runTestsByPath src/store/__tests__/entryStore.test.ts`

Expected: PASS

### Task 4: 收口 appLifecycleService 测试中的微任务冲刷点

**Files:**
- Modify: `app/src/services/__tests__/appLifecycleService.test.ts`
- Test: `app/src/services/__tests__/appLifecycleService.test.ts`

- [ ] **Step 1: 把当前依赖 `Promise.resolve()` 的异步推进改成等待明确副作用**

处理当前 grep 到的点（约 `198`、`213` 行）：

- 优先等待 `refreshCloudSyncIndicator`
- 或等待 flush/upload/sync mock 被调用
- 如果是初始化 reachability，则等待相关回调完成，而不是赌一层微任务已跑完

- [ ] **Step 2: 运行该测试文件确认通过**

Run: `npm test -- --runInBand --runTestsByPath src/services/__tests__/appLifecycleService.test.ts`

Expected: PASS

### Task 5: 收口 operations 测试中的微任务冲刷点

**Files:**
- Modify: `app/src/database/__tests__/operations.test.ts`
- Test: `app/src/database/__tests__/operations.test.ts`

- [ ] **Step 1: 把当前 `Promise.resolve()` 冲刷改成行为等待**

处理 grep 到的点（约 `499-500` 行）：

- 如果是等待数据库写入后回调或状态落定，改成针对最终 observable result 的等待
- 优先使用已有断言对象、mock 调用次数、返回结果，而不是继续刷微任务

- [ ] **Step 2: 运行该测试文件确认通过**

Run: `npm test -- --runInBand --runTestsByPath src/database/__tests__/operations.test.ts`

Expected: PASS

### Task 6: 最终验证

**Files:**
- Modify: `app/src/components/entry-card/EntryCard.styles.ts`
- Modify: `app/src/components/entry-card/EntryCardCalendarPhotoSection.tsx`
- Modify: `app/src/components/entry-card/EntryCardDefaultContent.tsx`
- Modify: `app/src/services/__tests__/cloudSyncService.test.ts`
- Modify: `app/src/store/__tests__/entryStore.test.ts`
- Modify: `app/src/services/__tests__/appLifecycleService.test.ts`
- Modify: `app/src/database/__tests__/operations.test.ts`

- [ ] **Step 1: 运行 lint**

Run: `npm run lint`

Expected: PASS

- [ ] **Step 2: 运行目标测试文件**

Run: `npm test -- --runInBand --runTestsByPath src/services/__tests__/cloudSyncService.test.ts src/store/__tests__/entryStore.test.ts src/services/__tests__/appLifecycleService.test.ts src/database/__tests__/operations.test.ts`

Expected: PASS

- [ ] **Step 3: 运行全量测试**

Run: `npm test -- --runInBand`

Expected: PASS

- [ ] **Step 4: 如涉及异步句柄回归风险，再跑句柄检测**

Run: `npm test -- --runInBand --detectOpenHandles --openHandlesTimeout=3000`

Expected: PASS with no reintroduced hanging/open-handle symptoms
