# 首页顶部云同步状态指示器 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让首页顶部在云端模式下展示一个可点击的云同步状态按钮，统一表达 `同步中 / 已同步 / 待同步 / 失败` 四态，并复用现有同步状态弹窗。

**Architecture:** 在现有 `syncStore + cloudSyncService + SQLite` 之上补一层轻量“顶部同步摘要”状态：`syncStore` 新增 `isSyncing`，SQLite 暴露完整本地同步摘要查询，`cloudSyncIndicatorStore` 负责把 `isSyncing / lastSyncError / 本地状态计数` 汇总成顶部 UI 状态。顶部 UI 通过新的 `CloudSyncStatusButton` 组件渲染到 `SearchBar` 右侧，点击后复用共享的 `showCloudSyncStatusAlert()` helper；刷新依赖显式触发点而不是轮询。

**Tech Stack:** React Native, Expo Router, Zustand, Expo SQLite, React Native Reanimated, Jest, Testing Library

**Spec:** `docs/superpowers/specs/2026-03-23-home-topbar-cloud-sync-indicator-design.md`

---

## 变更记录

- 2026-03-23：基于已批准 spec 创建实现计划，范围覆盖顶部同步摘要状态、共享同步弹窗 helper、首页顶部按钮集成、刷新触发点与文档收口。
- 2026-03-23：当前会话未显式授权使用子代理 review，本轮 plan review 改为本地结构化 review，并在文档中保留记录。

## 执行状态

| Task | 状态 | 说明 |
|------|------|------|
| Task 1 | 未开始 | 补齐 `isSyncing`、SQLite 顶部同步摘要查询与 `cloudSyncIndicatorStore` |
| Task 2 | 未开始 | 新增 `CloudSyncStatusButton` 与共享 `showCloudSyncStatusAlert()` helper，并接入顶部栏/设置页 |
| Task 3 | 未开始 | 在首页、生命周期、entry 写操作与上传队列状态变化时刷新顶部同步摘要 |
| Task 4 | 未开始 | 跑目标测试、类型检查、手动验证，并更新 spec / plan 状态 |

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `app/src/components/CloudSyncStatusButton.tsx` | 渲染顶部云同步状态按钮，封装四态图标、状态点与“同步中”动画 |
| `app/src/components/__tests__/CloudSyncStatusButton.test.tsx` | 锁定按钮在 `syncing / synced / pending / failed` 四态下的渲染与点击行为 |
| `app/src/store/cloudSyncIndicatorStore.ts` | 缓存并刷新顶部同步摘要，统一产出 `hidden / syncing / synced / pending / failed` UI 状态 |
| `app/src/store/__tests__/cloudSyncIndicatorStore.test.ts` | 锁定顶部同步摘要的状态优先级、隐藏逻辑与 refresh 行为 |
| `app/src/services/showCloudSyncStatusAlert.ts` | 复用设置页现有同步状态弹窗逻辑，供顶部按钮和设置页共用 |
| `app/src/services/__tests__/showCloudSyncStatusAlert.test.ts` | 锁定弹窗文案、立即同步动作与失败兜底 |

### Modified Files

| File | Change |
|------|--------|
| `app/src/store/syncStore.ts` | 新增 `isSyncing` 与同步开始/结束 action，供顶部按钮判断“同步中” |
| `app/src/store/__tests__/syncStore.test.ts` | 锁定 `isSyncing` 的持久化边界与开始/结束状态切换 |
| `app/src/services/cloudSyncService.ts` | 在 `syncNow()` 生命周期中设置 `isSyncing` 并在收尾后触发顶部摘要刷新 |
| `app/src/services/__tests__/cloudSyncService.test.ts` | 锁定 `isSyncing` 与同步结束后的顶部摘要刷新时机 |
| `app/src/database/operations.ts` | 新增完整本地同步摘要查询 helper，统计 `pending / pending_delete / pending_upload / uploading / failed` |
| `app/src/database/__tests__/operations.test.ts` | 锁定顶部摘要查询的计数口径 |
| `app/src/components/SearchBar.tsx` | 扩展为可接收右侧动作区，保留现有菜单/搜索框布局与安全区适配 |
| `app/src/components/__tests__/SearchBar.safe-area.test.tsx` | 锁定 trailing actions 不影响安全区与基础布局 |
| `app/src/components/Timeline.v2.tsx` | 组合“视图切换 + 同步状态按钮”到顶部右侧动作区 |
| `app/src/components/__tests__/Timeline.v2.view-mode.test.tsx` | 锁定新增右侧动作区后，视图切换回归不被破坏 |
| `app/src/components/SettingsPage.tsx` | 改为复用共享同步状态弹窗 helper，避免逻辑分叉 |
| `app/src/components/__tests__/SettingsPage.test.tsx` | 锁定设置页入口改为调用共享 helper |
| `app/app/(tabs)/index.tsx` | 首页挂载时刷新顶部摘要，并在上传队列 callback 中联动刷新 |
| `app/src/services/photoUploadQueue.ts` | 增加状态变化回调或刷新接点，确保照片 `uploading / pending_upload / pending` 切换能反馈到顶部 |
| `app/src/services/__tests__/photoUploadQueue.test.ts` | 锁定照片上传状态变化后会触发顶部摘要刷新 |
| `app/src/services/voiceUploadQueue.ts` | 保持现有 queue callback 结构，并补顶部摘要刷新接点 |
| `app/src/services/__tests__/voiceUploadQueue.test.ts` | 锁定语音上传状态变化后的顶部摘要刷新 |
| `app/src/store/entryStore.ts` | 在本地新增 / 编辑 / 删除 / 替换 / 恢复记录后刷新顶部摘要 |
| `app/src/store/__tests__/entryStore.test.ts` | 锁定 `pending` / `pending_delete` / 删除待上传媒体等写操作会联动顶部摘要刷新 |
| `app/app/_layout.tsx` | 在启动、回到前台、同步完成后刷新顶部摘要 |
| `app/app/__tests__/_layout.photo-upload.test.tsx` | 锁定前后台生命周期触发后顶部摘要会刷新 |
| `docs/superpowers/specs/2026-03-23-home-topbar-cloud-sync-indicator-design.md` | 实现完成后更新状态、实现结果、偏差说明与最终验证 |
| `docs/superpowers/plans/2026-03-23-home-topbar-cloud-sync-indicator.md` | 执行过程中勾选任务、补齐验证结果与文档收口 |

## 执行约束

- 只在 `cloudMode === true` 且已登录时显示顶部同步按钮；不把未登录态做成灰显占位。
- 顶部同步状态的判断口径必须来自完整本地同步摘要，而不是首页当前已加载的分页列表。
- `syncing` 只在真正同步中播放主动画；`pending / failed / synced` 保持静态云朵 + 状态点。
- 点击顶部按钮必须复用与设置页一致的同步状态弹窗和“立即同步”动作。
- 不新增“同步中心”页面，不在顶部直接展示待同步数字，不引入固定轮询。
- 不回滚用户当前工作区已有改动；仅在本计划列出的文件中增量实现并记录任何偏差。

## Chunk 1: 顶部同步摘要状态

### Task 1: 补齐 `isSyncing`、SQLite 摘要查询与 `cloudSyncIndicatorStore`

**Files:**
- Modify: `app/src/store/syncStore.ts`
- Test: `app/src/store/__tests__/syncStore.test.ts`
- Modify: `app/src/services/cloudSyncService.ts`
- Test: `app/src/services/__tests__/cloudSyncService.test.ts`
- Modify: `app/src/database/operations.ts`
- Test: `app/src/database/__tests__/operations.test.ts`
- Create: `app/src/store/cloudSyncIndicatorStore.ts`
- Create: `app/src/store/__tests__/cloudSyncIndicatorStore.test.ts`

- [ ] **Step 1: 先写失败测试，锁定顶部同步摘要的基础口径**

在 `app/src/store/__tests__/syncStore.test.ts` 增加：

```ts
it('toggles isSyncing when sync starts and finishes', async () => {
  await useSyncStore.getState().markSyncStarted();
  expect(useSyncStore.getState().isSyncing).toBe(true);

  await useSyncStore.getState().markSyncFinished();
  expect(useSyncStore.getState().isSyncing).toBe(false);
});
```

在 `app/src/database/__tests__/operations.test.ts` 增加：

```ts
it('returns counts for pending, pending_delete, pending_upload, uploading and failed', async () => {
  const summary = await DB.getCloudSyncIndicatorSummary();
  expect(summary).toEqual({
    pendingEntries: 1,
    pendingUploads: 1,
    uploadingEntries: 1,
    failedEntries: 1,
  });
});
```

在 `app/src/store/__tests__/cloudSyncIndicatorStore.test.ts` 新建测试，至少覆盖：

```ts
it('returns hidden when cloud mode is disabled', async () => {})
it('prioritizes syncing over failed and pending when uploads are active', async () => {})
it('prioritizes failed over pending when sync is idle', async () => {})
```

- [ ] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/store/__tests__/syncStore.test.ts src/database/__tests__/operations.test.ts src/store/__tests__/cloudSyncIndicatorStore.test.ts src/services/__tests__/cloudSyncService.test.ts`

Expected: FAIL，原因是 `syncStore` 还没有 `isSyncing`，SQLite 还没有顶部摘要查询，`cloudSyncIndicatorStore` 尚不存在。

- [ ] **Step 3: 最小实现同步状态基础设施**

在 `app/src/store/syncStore.ts`：

- 给 state 增加 `isSyncing: boolean`
- 新增最小 action：

```ts
markSyncStarted: async () => set({ isSyncing: true })
markSyncFinished: async () => set({ isSyncing: false })
```

- `markSyncSuccess()` / `markSyncFailure()` 不再隐式承担“结束同步”的职责，由 `syncNow()` 生命周期显式控制

在 `app/src/services/cloudSyncService.ts`：

- `syncNow()` 开始前调用 `markSyncStarted()`
- `finally` 中调用 `markSyncFinished()`
- 同步成功/失败收尾后调用 `useCloudSyncIndicatorStore.getState().refresh()`，确保顶部摘要跟上本地状态变化

在 `app/src/database/operations.ts`：

- 新增 `getCloudSyncIndicatorSummary()`，只统计顶部按钮需要的完整本地状态计数，例如：

```ts
type CloudSyncIndicatorSummary = {
  pendingEntries: number;
  pendingUploads: number;
  uploadingEntries: number;
  failedEntries: number;
};
```

- 计数规则：
  - `pendingEntries` = `pending + pending_delete`
  - `pendingUploads` = `pending_upload`
  - `uploadingEntries` = `uploading`
  - `failedEntries` = `failed`

在 `app/src/store/cloudSyncIndicatorStore.ts`：

- 用 Zustand 缓存：
  - `pendingEntries`
  - `pendingUploads`
  - `uploadingEntries`
  - `failedEntries`
  - `uiState`
- `refresh()` 内部读取：
  - `useAuthStore.getState().isAuthenticated`
  - `useSettingsStore.getState().cloudMode`
  - `useSyncStore.getState().isSyncing`
  - `useSyncStore.getState().lastSyncError`
  - `DB.getCloudSyncIndicatorSummary()`
- 按 spec 里的优先级统一计算 `hidden / syncing / failed / pending / synced`

- [ ] **Step 4: 重新运行目标测试，确认通过**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/store/__tests__/syncStore.test.ts src/database/__tests__/operations.test.ts src/store/__tests__/cloudSyncIndicatorStore.test.ts src/services/__tests__/cloudSyncService.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/store/syncStore.ts app/src/store/__tests__/syncStore.test.ts app/src/services/cloudSyncService.ts app/src/services/__tests__/cloudSyncService.test.ts app/src/database/operations.ts app/src/database/__tests__/operations.test.ts app/src/store/cloudSyncIndicatorStore.ts app/src/store/__tests__/cloudSyncIndicatorStore.test.ts
git commit -m "feat: add home sync indicator state"
```

## Chunk 2: 顶部按钮与共享弹窗

### Task 2: 新增 `CloudSyncStatusButton`，并让设置页/首页共用同步状态弹窗

**Files:**
- Create: `app/src/components/CloudSyncStatusButton.tsx`
- Create: `app/src/components/__tests__/CloudSyncStatusButton.test.tsx`
- Create: `app/src/services/showCloudSyncStatusAlert.ts`
- Create: `app/src/services/__tests__/showCloudSyncStatusAlert.test.ts`
- Modify: `app/src/components/SearchBar.tsx`
- Modify: `app/src/components/__tests__/SearchBar.safe-area.test.tsx`
- Modify: `app/src/components/Timeline.v2.tsx`
- Modify: `app/src/components/__tests__/Timeline.v2.view-mode.test.tsx`
- Modify: `app/src/components/SettingsPage.tsx`
- Modify: `app/src/components/__tests__/SettingsPage.test.tsx`

- [ ] **Step 1: 先写失败测试，锁定按钮四态和弹窗复用**

在 `app/src/components/__tests__/CloudSyncStatusButton.test.tsx` 新建测试，至少覆盖：

```ts
it('renders static cloud with green dot for synced state', () => {})
it('renders static cloud with orange dot for pending state', () => {})
it('renders static cloud with red dot for failed state', () => {})
it('renders animated cloud shell for syncing state', () => {})
it('calls onPress when tapped', () => {})
```

在 `app/src/services/__tests__/showCloudSyncStatusAlert.test.ts` 新建测试，至少覆盖：

```ts
it('shows the same summary fields as SettingsPage and offers syncNow action', async () => {})
it('shows fallback alert when getStatus fails', async () => {})
```

在 `app/src/components/__tests__/SettingsPage.test.tsx` 把“同步状态”测试改成断言共享 helper 被调用，而不是继续依赖内联 `Alert.alert` 拼装。

- [ ] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/CloudSyncStatusButton.test.tsx src/services/__tests__/showCloudSyncStatusAlert.test.ts src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/SearchBar.safe-area.test.tsx src/components/__tests__/Timeline.v2.view-mode.test.tsx`

Expected: FAIL，原因是按钮组件和共享 helper 尚不存在，`SettingsPage` 仍在内联拼弹窗。

- [ ] **Step 3: 实现共享弹窗 helper 与顶部按钮组件**

在 `app/src/services/showCloudSyncStatusAlert.ts`：

- 提供：

```ts
export async function showCloudSyncStatusAlert(): Promise<void> {}
```

- 内部复用 `createCloudSyncService().getStatus()` / `syncNow()`
- 保持与设置页当前一致的标题、字段顺序和失败提示

在 `app/src/components/CloudSyncStatusButton.tsx`：

- props 最小化：

```ts
type CloudSyncStatusButtonProps = {
  uiState: 'syncing' | 'synced' | 'pending' | 'failed';
  onPress: () => void;
};
```

- `syncing` 渲染“云朵呼吸 + 外环扫描”
- 其他状态渲染静态云朵 + 右上状态点
- 暴露稳定 `testID`，例如：
  - `cloud-sync-button`
  - `cloud-sync-dot-synced`
  - `cloud-sync-dot-pending`
  - `cloud-sync-dot-failed`
  - `cloud-sync-spinner`

在 `app/src/components/SearchBar.tsx`：

- 增加通用右侧动作区 props，例如：

```ts
rightActions?: React.ReactNode
```

- 保留现有安全区与间距实现
- 如果 `rightActions` 存在，把它放到搜索框右侧；不把同步状态业务语义硬编码进 `SearchBar`

在 `app/src/components/Timeline.v2.tsx`：

- 继续保留现有视图切换按钮
- 读取 `useCloudSyncIndicatorStore((s) => s.uiState)`，在非 `hidden` 时追加 `CloudSyncStatusButton`
- 点击后调用 `showCloudSyncStatusAlert()`

在 `app/src/components/SettingsPage.tsx`：

- 删除内联同步状态弹窗拼接逻辑，改成直接调用 `showCloudSyncStatusAlert()`

- [ ] **Step 4: 重新运行目标测试，确认通过**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/CloudSyncStatusButton.test.tsx src/services/__tests__/showCloudSyncStatusAlert.test.ts src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/SearchBar.safe-area.test.tsx src/components/__tests__/Timeline.v2.view-mode.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/components/CloudSyncStatusButton.tsx app/src/components/__tests__/CloudSyncStatusButton.test.tsx app/src/services/showCloudSyncStatusAlert.ts app/src/services/__tests__/showCloudSyncStatusAlert.test.ts app/src/components/SearchBar.tsx app/src/components/__tests__/SearchBar.safe-area.test.tsx app/src/components/Timeline.v2.tsx app/src/components/__tests__/Timeline.v2.view-mode.test.tsx app/src/components/SettingsPage.tsx app/src/components/__tests__/SettingsPage.test.tsx
git commit -m "feat: add topbar cloud sync status button"
```

## Chunk 3: 刷新触发点与回归验证

### Task 3: 在生命周期、写操作和上传队列状态变化后刷新顶部摘要

**Files:**
- Modify: `app/app/(tabs)/index.tsx`
- Modify: `app/src/store/entryStore.ts`
- Test: `app/src/store/__tests__/entryStore.test.ts`
- Modify: `app/src/services/photoUploadQueue.ts`
- Test: `app/src/services/__tests__/photoUploadQueue.test.ts`
- Modify: `app/src/services/voiceUploadQueue.ts`
- Test: `app/src/services/__tests__/voiceUploadQueue.test.ts`
- Modify: `app/app/_layout.tsx`
- Test: `app/app/__tests__/_layout.photo-upload.test.tsx`

- [ ] **Step 1: 先写失败测试，锁定刷新触发点**

在 `app/src/store/__tests__/entryStore.test.ts` 增加：

```ts
it('refreshes cloud sync indicator after adding a pending cloud entry', async () => {})
it('refreshes cloud sync indicator after marking a synced entry pending_delete', async () => {})
it('refreshes cloud sync indicator after deleting a pending_upload media entry', async () => {})
```

在 `app/src/services/__tests__/photoUploadQueue.test.ts` 增加：

```ts
it('refreshes cloud sync indicator after photo upload starts and after it settles to pending', async () => {})
it('refreshes cloud sync indicator after photo upload failure returns entry to pending_upload', async () => {})
```

在 `app/src/services/__tests__/voiceUploadQueue.test.ts` 增加：

```ts
it('refreshes cloud sync indicator when voice upload enters uploading and when it falls back to pending_upload', async () => {})
```

在 `app/app/__tests__/_layout.photo-upload.test.tsx` 追加断言：

```ts
it('refreshes cloud sync indicator after app becomes active in cloud mode', async () => {})
```

- [ ] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/store/__tests__/entryStore.test.ts src/services/__tests__/photoUploadQueue.test.ts src/services/__tests__/voiceUploadQueue.test.ts app/__tests__/_layout.photo-upload.test.tsx`

Expected: FAIL，原因是这些写操作和生命周期当前还没有统一刷新顶部摘要。

- [ ] **Step 3: 用最小改动接入刷新触发点**

在 `app/src/store/entryStore.ts`：

- 在这些写操作成功后调用 `useCloudSyncIndicatorStore.getState().refresh()`：
  - `addEntry`
  - `addLocalEntry`
  - `updateEntry`
  - `updateLocalEntry`
  - `replaceEntry`
  - `deleteEntry`
  - `restoreEntries`

在 `app/src/services/photoUploadQueue.ts`：

- 增加轻量状态变化回调或直接刷新接点，使这些时刻会刷新顶部摘要：
  - `markUploading`
  - `markPendingUpload`
  - `markPendingSync`

在 `app/src/services/voiceUploadQueue.ts`：

- 复用现有 callback 结构，在：
  - `onEntryUploading`
  - `onEntryPending`
  - `onEntrySynced`
  三个节点调用顶部摘要刷新

在 `app/app/(tabs)/index.tsx`：

- 首页挂载后执行一次 `useCloudSyncIndicatorStore.getState().refresh()`
- 如果需要为照片上传补回调配置，则在这里和现有 `configureVoiceUploadQueueCallbacks()` 一起完成

在 `app/app/_layout.tsx`：

- 启动初始化完成后刷新一次顶部摘要
- 回到前台时，在 `syncNow()` / 补传 flush 完成后刷新一次顶部摘要

- [ ] **Step 4: 重新运行目标测试，确认通过**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/store/__tests__/entryStore.test.ts src/services/__tests__/photoUploadQueue.test.ts src/services/__tests__/voiceUploadQueue.test.ts app/__tests__/_layout.photo-upload.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/app/'(tabs)'/index.tsx app/src/store/entryStore.ts app/src/store/__tests__/entryStore.test.ts app/src/services/photoUploadQueue.ts app/src/services/__tests__/photoUploadQueue.test.ts app/src/services/voiceUploadQueue.ts app/src/services/__tests__/voiceUploadQueue.test.ts app/app/_layout.tsx app/app/__tests__/_layout.photo-upload.test.tsx
git commit -m "feat: refresh topbar sync indicator on state changes"
```

### Task 4: 最终验证与文档收口

**Files:**
- Modify: `docs/superpowers/specs/2026-03-23-home-topbar-cloud-sync-indicator-design.md`
- Modify: `docs/superpowers/plans/2026-03-23-home-topbar-cloud-sync-indicator.md`

- [ ] **Step 1: 运行目标测试**

Run:

```bash
cd app && npx jest --run-in-band --runTestsByPath \
  src/components/__tests__/CloudSyncStatusButton.test.tsx \
  src/services/__tests__/showCloudSyncStatusAlert.test.ts \
  src/store/__tests__/cloudSyncIndicatorStore.test.ts \
  src/store/__tests__/syncStore.test.ts \
  src/services/__tests__/cloudSyncService.test.ts \
  src/database/__tests__/operations.test.ts \
  src/store/__tests__/entryStore.test.ts \
  src/services/__tests__/photoUploadQueue.test.ts \
  src/services/__tests__/voiceUploadQueue.test.ts \
  src/components/__tests__/SettingsPage.test.tsx \
  src/components/__tests__/SearchBar.safe-area.test.tsx \
  src/components/__tests__/Timeline.v2.view-mode.test.tsx \
  app/__tests__/_layout.photo-upload.test.tsx
```

Expected: PASS

- [ ] **Step 2: 运行类型检查与 diff 检查**

Run:

```bash
cd app && npx tsc --noEmit
git diff --check
```

Expected:

- `npx tsc --noEmit` PASS
- `git diff --check` 无空白错误

- [ ] **Step 3: 手动验证首页顶部行为**

在 Android 模拟器上至少验证：

1. 开启云端模式后，首页顶部出现同步状态按钮，位置在视图切换按钮右侧
2. 新增一条文本记录后，顶部从 `已同步` 变为 `待同步`
3. 删除一条已同步记录后，顶部显示 `待同步`
4. 触发手动同步时，顶部显示“云朵呼吸 + 外环扫描”
5. 同步成功后，顶部回到绿点
6. 断网后手动同步失败，顶部显示红点
7. 点击顶部按钮与点击设置页“同步状态”，弹出的字段和按钮一致

- [ ] **Step 4: 更新文档状态并记录最终结果**

在 spec 中补齐：

- `当前状态：已实现`
- `实现完成日期`
- `实现结果`
- `实现偏差说明`
- `最终验证结果`

在 plan 中补齐：

- 各 task 勾选状态
- 实际执行说明
- 最终验证结果

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-03-23-home-topbar-cloud-sync-indicator-design.md docs/superpowers/plans/2026-03-23-home-topbar-cloud-sync-indicator.md
git commit -m "docs: close out home topbar cloud sync indicator work"
```
