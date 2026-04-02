# Open Handle Lifecycle Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 锁住 `_layout` 与 `HomeScreen` 中最可疑的 listener / timer cleanup 路径，优先修真实资源泄漏，并尽量消除前端 Jest 的 open handles 警告。

**Architecture:** 本轮只处理两个全局入口文件的生命周期资源：`AppState`、`Network`、`BackHandler` 与录音 `setInterval`。优先复用已有最接近真实装配的测试文件，在测试里先证明 cleanup 缺口，再做最小生产修复；不扩到 upload queue、service timeout 或 Jest 全局基础设施。

**Tech Stack:** React Native, Expo Router, Jest, React Native Testing Library, TypeScript

---

## Scope Note

本 plan 只覆盖以下 4 条 cleanup 回归：

- `OH-01` `_layout` 卸载时移除 `AppState` 监听
- `OH-02` `_layout` 卸载时移除 `Network` 监听
- `OH-03` `HomeScreen` 的 `BackHandler` 监听在关闭或卸载时被移除
- `OH-04` `HomeScreen` 的录音 timer 在 stop 和卸载路径都被清理

以下内容不在本 plan 中实现：

- `photoUploadQueue.ts` / `voiceUploadQueue.ts` 的 retry timer
- service 层 `setTimeout` / `AbortController` 清理
- Jest 全局 afterEach / 测试配置层静默处理
- 为了测试方便重构 `_layout` 或 `HomeScreen` 主逻辑

## File Structure

- Modify: `app/app/__tests__/_layout.photo-upload.test.tsx`
  Purpose: 复用现有 `RootLayout` 装配测试，新增 `AppState` / `Network` 订阅在卸载时调用 `remove()` 的回归。
- Modify: `app/app/(tabs)/__tests__/index.render.test.tsx`
  Purpose: 复用现有 `HomeScreen` 壳层渲染测试，承接 `BackHandler` 监听在关闭或卸载时释放的页面级回归。
- Modify: `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts`
  Purpose: 继续复用现有 voice helper 测试，承接录音 timer 在 stop 路径上的 cleanup 回归。
- Create: `app/app/(tabs)/__tests__/index.cleanup.test.tsx`
  Purpose: 如果 `index.render.test.tsx` 现有结构不适合表达卸载类回归，最小新增一个只负责 `HomeScreen` cleanup 的页面级测试文件。
- Modify: `app/app/_layout.tsx`
  Purpose: 只有当 `_layout` 级回归明确暴露真实漏清理时，做最小修复；否则不改。
- Modify: `app/app/(tabs)/index.tsx`
  Purpose: 只有当 `HomeScreen` 级回归明确暴露真实漏清理时，做最小修复；否则不改。

## Task 1: Lock RootLayout Listener Cleanup

**Files:**
- Modify: `app/app/__tests__/_layout.photo-upload.test.tsx`
- Modify: `app/app/_layout.tsx`
- Test: `app/app/__tests__/_layout.photo-upload.test.tsx`

- [ ] **Step 1: Write the failing AppState cleanup regression**

在 `app/app/__tests__/_layout.photo-upload.test.tsx` 中，把 `AppState.addEventListener()` 的返回值改成可观察的 subscription mock：

```tsx
const mockAppStateRemove = jest.fn();

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn((_: string, listener: typeof appStateListener) => {
      appStateListener = listener;
      return { remove: mockAppStateRemove };
    }),
  },
  ...
}));
```

新增失败用例：

```tsx
it('removes the AppState subscription when RootLayout unmounts', async () => {
  const screen = render(<RootLayout />);

  await flushPromises();
  screen.unmount();

  expect(mockAppStateRemove).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Write the failing Network cleanup regression**

同文件中把 `Network.addNetworkStateListener()` 的返回值改成可观察 mock：

```tsx
const mockNetworkRemove = jest.fn();

jest.mock('expo-network', () => ({
  addNetworkStateListener: jest.fn((listener) => {
    networkListener = listener;
    return { remove: mockNetworkRemove };
  }),
  ...
}));
```

新增失败用例：

```tsx
it('removes the network subscription when RootLayout unmounts', async () => {
  const screen = render(<RootLayout />);

  await flushPromises();
  screen.unmount();

  expect(mockNetworkRemove).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 3: Run the targeted RootLayout suite to verify current behavior**

Run: `cd app && pnpm test -- --runTestsByPath app/__tests__/_layout.photo-upload.test.tsx --runInBand`

Expected: 如果 `_layout` 已正确 cleanup，这里可能直接 PASS；如果 FAIL，失败原因应明确指向 `remove()` 没被调用。

- [ ] **Step 4: Only if the new cleanup tests fail, apply the smallest production fix in `_layout.tsx`**

仅允许做最小修复，例如：

```tsx
useEffect(() => {
  const subscription = AppState.addEventListener('change', ...);
  return () => subscription.remove();
}, []);
```

```tsx
useEffect(() => {
  const subscription = Network.addNetworkStateListener(...);
  return () => subscription.remove();
}, []);
```

如果现有实现已经如此，则不改生产代码。

- [ ] **Step 5: Re-run the RootLayout suite until it passes**

Run: `cd app && pnpm test -- --runTestsByPath app/__tests__/_layout.photo-upload.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 6: Commit the RootLayout cleanup coverage**

```bash
git add app/app/__tests__/_layout.photo-upload.test.tsx app/app/_layout.tsx
git commit -m "test(app): lock root layout subscription cleanup"
```

## Task 2: Lock HomeScreen BackHandler And Recording Timer Cleanup

**Files:**
- Modify: `app/app/(tabs)/__tests__/index.render.test.tsx`
- Modify: `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts`
- Create: `app/app/(tabs)/__tests__/index.cleanup.test.tsx`
- Modify: `app/app/(tabs)/index.tsx`
- Test: `app/app/(tabs)/__tests__/index.render.test.tsx`
- Test: `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts`
- Test: `app/app/(tabs)/__tests__/index.cleanup.test.tsx`

- [ ] **Step 1: Write the failing BackHandler cleanup regression**

优先在 `app/app/(tabs)/__tests__/index.render.test.tsx` 中补这条回归；如果现有文件结构不适合承载卸载类断言，再最小新增 `app/app/(tabs)/__tests__/index.cleanup.test.tsx`，但两种选择只能取其一，后续命令也必须跟着落到实际文件。

把 `BackHandler.addEventListener()` 的返回值改成可观察 subscription：

```ts
const mockBackHandlerRemove = jest.fn();

jest.mock('react-native', () => ({
  BackHandler: {
    addEventListener: jest.fn(() => ({ remove: mockBackHandlerRemove })),
    removeEventListener: jest.fn(),
  },
  ...
}));
```

新增一个最小渲染 `HomeScreen` 的回归，验证 drawer 监听释放：

```tsx
it('removes the hardware back subscription when HomeScreen unmounts with the drawer open', async () => {
  const screen = render(<HomeScreen />);

  // 触发打开 drawer 的最小路径，确保注册 BackHandler
  fireEvent(screen.UNSAFE_getByType('Timeline'), 'onMenuPress');
  screen.unmount();

  expect(mockBackHandlerRemove).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Write the failing recording timer cleanup regressions**

先在 `app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts` 中，用已导出的 helper 锁住 stop 路径：

```ts
it('clears and nulls the recording timer ref in the stop path', () => {
  jest.useFakeTimers();
  const timerRef = { current: setInterval(() => {}, 100) };

  clearRecordingTimerForTest(timerRef);

  expect(timerRef.current).toBeNull();
  expect(clearInterval).toHaveBeenCalled();
  jest.useRealTimers();
});
```

再在 `index.render.test.tsx` 或 `index.cleanup.test.tsx` 中强制补一条页面级 unmount 回归：

```tsx
it('clears the active recording timer when HomeScreen unmounts', () => {
  ...
});
```

两条都必须存在，不能只做 stop 不做 unmount。

- [ ] **Step 3: Run the targeted HomeScreen suite to verify current behavior**

Run:

```bash
cd app && pnpm test -- --runTestsByPath \
  'app/(tabs)/__tests__/index.voice-cloud-mode.test.ts' \
  'app/(tabs)/__tests__/index.render.test.tsx' \
  'app/(tabs)/__tests__/index.cleanup.test.tsx' \
  --runInBand
```

如果没有创建 `index.cleanup.test.tsx`，则从命令里删除它；不要让验证命令遗漏实际新增的 cleanup 文件。

Expected: 如果 `HomeScreen` 已正确 cleanup，这里可能直接 PASS；如果 FAIL，失败原因应明确指向 `remove()` 或 `clearInterval()` 没被调用。

- [ ] **Step 4: Only if the new cleanup tests fail, make the smallest production fix in `index.tsx`**

仅允许最小修复，例如：

```tsx
useEffect(() => {
  if (!drawerOpen) return;
  const sub = BackHandler.addEventListener('hardwareBackPress', ...);
  return () => sub.remove();
}, [drawerOpen, closeDrawer]);
```

```tsx
useEffect(() => {
  return () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };
}, []);
```

如果现有实现已经如此，则不改生产代码。

- [ ] **Step 5: Re-run the HomeScreen suite until it passes**

Run:

```bash
cd app && pnpm test -- --runTestsByPath \
  'app/(tabs)/__tests__/index.voice-cloud-mode.test.ts' \
  'app/(tabs)/__tests__/index.render.test.tsx' \
  'app/(tabs)/__tests__/index.cleanup.test.tsx' \
  --runInBand
```

如果没有创建 `index.cleanup.test.tsx`，则从命令里删除它；不要让验证命令遗漏实际新增的 cleanup 文件。

Expected: PASS

- [ ] **Step 6: Commit the HomeScreen cleanup coverage**

```bash
git add \
  'app/app/(tabs)/__tests__/index.render.test.tsx' \
  'app/app/(tabs)/__tests__/index.voice-cloud-mode.test.ts' \
  'app/app/(tabs)/__tests__/index.cleanup.test.tsx' \
  'app/app/(tabs)/index.tsx'
git commit -m "test(app): lock home screen cleanup paths"
```

如果没有创建 `index.cleanup.test.tsx`，则从 `git add` 命令里删除该路径；带括号的路径一律保持单引号，避免 `zsh` 通配失败。

## Task 3: Reproduce And Verify Open Handle Behavior

**Files:**
- None required unless the user explicitly asks to persist verification notes

- [ ] **Step 1: Run the focused cleanup suites together**

Run:

```bash
cd app && pnpm test -- --runTestsByPath \
  app/__tests__/_layout.photo-upload.test.tsx \
  'app/(tabs)/__tests__/index.voice-cloud-mode.test.ts' \
  'app/(tabs)/__tests__/index.render.test.tsx' \
  'app/(tabs)/__tests__/index.cleanup.test.tsx' \
  --runInBand
```

如果没有创建 `index.cleanup.test.tsx`，则从该命令里删除这一路径；不要让集中验证命令引用不存在的 fallback 文件。

Expected: PASS

- [ ] **Step 2: Re-run detectOpenHandles and record actual output**

Run: `cd app && pnpm test --runInBand --detectOpenHandles`

Expected:

- 如果 open handles 警告消失，明确记录为收益
- 如果警告仍存在，也要记录“本轮 cleanup 回归通过，但 open handles 仍未完全消失”
- 不为了通过这一步继续扩 scope 到 queue/service

- [ ] **Step 3: Run the front-end full Jest suite**

Run: `cd app && pnpm test --runInBand`

Expected: PASS

- [ ] **Step 4: Inspect git status and summarize actual outputs**

Run: `git status --short`

Expected: 只剩本轮相关改动；如果工作区干净，则记录为 clean。
