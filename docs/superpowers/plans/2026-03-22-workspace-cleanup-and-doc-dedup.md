# 剩余工作区收口与旧文档去冲突 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 收口前两条已提交任务遗漏的兼容修复，并把旧 `cloud-mode-frontend-integration` 文档降级为历史文档，避免继续与新子任务文档冲突。

**Architecture:** 本轮不引入新能力，只做两类收尾：一类是把录音权限和 `Timeline/Calendar` 的接口边界与已提交行为对齐；另一类是把旧 2026-03-21 总方案文档改成历史背景文档，并指向 2026-03-22 的 authoritative 子任务文档。照片 / 媒体草稿与本地噪音全部排除，不允许混入本轮提交。

**Tech Stack:** Expo SDK 54, React Native, TypeScript, Jest, React Native Testing Library, Markdown docs, Git

**Spec:** `docs/superpowers/specs/2026-03-22-workspace-cleanup-and-doc-dedup-design.md`

---

## 变更记录

- 2026-03-22：基于已批准 spec 创建实现计划，范围限定为兼容修复与旧文档去冲突。

## 执行状态

| Task | 状态 | 说明 |
|------|------|------|
| Task 1 | 未开始 | `usePermissions` 兼容收口 |
| Task 2 | 未开始 | `Timeline / Calendar` 录音 props 去残留 |
| Task 3 | 未开始 | 旧 `2026-03-21` 文档降级与去冲突 |
| Task 4 | 未开始 | 验证、文档收口与 scoped commit |

## File Structure

### Modified Files

| File | Responsibility |
|------|---------------|
| `app/src/hooks/usePermissions.ts` | 与 `expo-audio` 权限 API 对齐，移除旧录音权限调用残留 |
| `app/src/hooks/__tests__/usePermissions.test.ts` | 验证麦克风权限检查优先复用已授权状态，否则再触发请求 |
| `app/src/components/Timeline.v2.tsx` | 去掉对废弃 `pause/resume recording` props 的透传 |
| `app/src/components/CalendarView.tsx` | 去掉对废弃 `pause/resume recording` props 的透传 |
| `app/src/components/CalendarTimelineItem.tsx` | 去掉对废弃 `pause/resume recording` props 的透传 |
| `app/src/components/__tests__/Timeline.v2.view-mode.test.tsx` | 继续验证 `Timeline -> CalendarView` 不再传递 `pause/resume` |
| `app/src/components/__tests__/CalendarView.test.tsx` | 验证 `CalendarView -> CalendarTimelineItem` 不再传递 `pause/resume` |
| `docs/superpowers/specs/2026-03-21-cloud-mode-frontend-integration-design.md` | 降级为历史背景 spec，并指向 2026-03-22 子任务文档 |
| `docs/superpowers/plans/2026-03-21-cloud-mode-frontend-integration.md` | 降级为历史背景 plan，并注明已被 2026-03-22 子任务拆分替代 |
| `docs/superpowers/specs/2026-03-22-workspace-cleanup-and-doc-dedup-design.md` | 执行后更新为 `已实现` 并补齐最终说明与验证结果 |
| `docs/superpowers/plans/2026-03-22-workspace-cleanup-and-doc-dedup.md` | 按任务更新状态并记录实际验证结果 |

## 执行约束

- 不修改 `app/src/services/photoService.ts` 与 `app/app/(tabs)/__tests__/index.photo.test.ts`
- 不并入 `.debug/`、`.gitignore`、`app/metro.config.js`、`docs/superpowers/plans/2026-03-22-cloud-sync-offline-first.md`
- 本轮只允许做 scoped commit，不得把照片草稿或本地噪音一起提交
- 当前工作区在目标兼容文件上已存在部分预改动；若某个“失败测试”步骤在当前基线已直接通过，需记录为“预存在工作区中的部分实现”，继续做 diff 复核与后续验证，不为了强行制造 FAIL 去回退用户工作区
- 如果发现 `Timeline / Calendar` 去掉 `pause/resume` 后还牵连新的未预期调用方，先停下来补充盘点，不扩成新功能任务

## Chunk 1: 兼容修复

### Task 1: `usePermissions` 与 `expo-audio` 权限 API 对齐

**Files:**
- Modify: `app/src/hooks/usePermissions.ts`
- Create: `app/src/hooks/__tests__/usePermissions.test.ts`

- [ ] **Step 1: 先写失败测试，锁定麦克风权限行为**

在 `app/src/hooks/__tests__/usePermissions.test.ts` 新增测试，至少覆盖：

```ts
it('returns true without requesting again when recording permission is already granted', async () => {
  mockGetRecordingPermissionsAsync.mockResolvedValueOnce({ granted: true });
  expect(await checkSpeechPermissions()).toBe(true);
  expect(mockRequestRecordingPermissionsAsync).not.toHaveBeenCalled();
});

it('requests recording permission when current permission is not granted', async () => {
  mockGetRecordingPermissionsAsync.mockResolvedValueOnce({ granted: false });
  mockRequestRecordingPermissionsAsync.mockResolvedValueOnce({ granted: true });
  expect(await checkSpeechPermissions()).toBe(true);
  expect(mockRequestRecordingPermissionsAsync).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: 运行测试确认当前实现与测试基线一致**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/hooks/__tests__/usePermissions.test.ts`
Expected: 如果测试文件新建，先看到 FAIL；补完实现后应 PASS

- [ ] **Step 3: 最小修改 `usePermissions.ts`**

要求：
- 麦克风权限只使用 `expo-audio`：

```ts
import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
```

- `checkPermission('microphone')` 先查当前状态，再在必要时请求
- `checkSpeechPermissions()` 同样先查当前状态，再按需请求
- 不再保留旧 `expo-av` 录音权限调用残留

- [ ] **Step 4: 重新跑目标测试确认通过**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/hooks/__tests__/usePermissions.test.ts`
Expected: PASS

### Task 2: 去掉 `Timeline / Calendar` 中废弃的 `pause/resume recording` 透传

**Files:**
- Modify: `app/src/components/Timeline.v2.tsx`
- Modify: `app/src/components/CalendarView.tsx`
- Modify: `app/src/components/CalendarTimelineItem.tsx`
- Modify: `app/src/components/__tests__/Timeline.v2.view-mode.test.tsx`
- Modify: `app/src/components/__tests__/CalendarView.test.tsx`

- [ ] **Step 1: 先补或调整失败测试，锁定 props 边界**

在 `app/src/components/__tests__/CalendarView.test.tsx` 调整 `CalendarTimelineItem` mock，使其暴露接收到的 props，并补断言：

```ts
expect(latestCalendarItemProps.onPauseRecording).toBeUndefined();
expect(latestCalendarItemProps.onResumeRecording).toBeUndefined();
expect(latestCalendarItemProps.onStopRecording).toBe(noop);
```

同时把测试输入夹具中的废弃 props 去掉，避免继续把旧接口当作必需输入。

- [ ] **Step 2: 运行目标测试确认失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/CalendarView.test.tsx src/components/__tests__/Timeline.v2.view-mode.test.tsx`
Expected: FAIL，原因是组件签名或测试夹具仍依赖废弃 props

- [ ] **Step 3: 最小修改三个组件**

要求：
- `Timeline.v2.tsx` 的 `TimelineProps` 不再包含：

```ts
onPauseRecording?: (id: string) => void;
onResumeRecording?: (id: string) => void;
```

- `CalendarView.tsx` 与 `CalendarTimelineItem.tsx` 同步移除上述 props
- 只做接口边界收口，不改动录音中的“停止”行为

- [ ] **Step 4: 重新跑目标测试确认通过**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/CalendarView.test.tsx src/components/__tests__/Timeline.v2.view-mode.test.tsx`
Expected: PASS

## Chunk 2: 文档去冲突与收尾

### Task 3: 把旧 `2026-03-21` 文档降级为历史背景文档

**Files:**
- Modify: `docs/superpowers/specs/2026-03-21-cloud-mode-frontend-integration-design.md`
- Modify: `docs/superpowers/plans/2026-03-21-cloud-mode-frontend-integration.md`

- [ ] **Step 1: 先写文档调整清单**

在开始改文档前，先按以下清单核对并逐项落实：

- 明确标注该旧文档已被 2026-03-22 子任务拆分替代
- 删除或改写与当前已提交事实冲突的语音规则：

```md
上传失败则不创建卡片，并删除本地数据
```

- 保留其作为历史背景的价值，但不再把它当作当前 authoritative 文档
- 在显著位置增加当前 authoritative 文档索引

- [ ] **Step 2: 修改旧 spec**

要求：
- 在 `2026-03-21-cloud-mode-frontend-integration-design.md` 顶部增加“历史文档 / 已拆分替代”说明
- 把 2026-03-21 后补的语音失败语义改成“已被 2026-03-22-voice-cloud-background-upload-* 替代”
- 若保留旧补充段落，必须显式标注为“历史方案，不代表当前实现”

- [ ] **Step 3: 修改旧 plan**

要求：
- 在 `2026-03-21-cloud-mode-frontend-integration.md` 顶部增加“该 plan 已被更小子任务拆分替代”的说明
- 删除或弱化所有把后续语音/媒体任务写成该旧 plan 当前执行真相的内容
- 指向当前实际已落地的 2026-03-22 文档

- [ ] **Step 4: 复核文档冲突已消除**

Run:
- `rg -n "上传失败则不创建卡片|删除本地数据" docs/superpowers/specs/2026-03-21-cloud-mode-frontend-integration-design.md docs/superpowers/plans/2026-03-21-cloud-mode-frontend-integration.md`
- `rg -n "已被 2026-03-22|authoritative|历史文档" docs/superpowers/specs/2026-03-21-cloud-mode-frontend-integration-design.md docs/superpowers/plans/2026-03-21-cloud-mode-frontend-integration.md`

Expected:
- 冲突语义不再作为当前规则存在
- 旧文档显式指向 2026-03-22 子任务

### Task 4: 验证、文档收口与 scoped commit

**Files:**
- Modify: `docs/superpowers/specs/2026-03-22-workspace-cleanup-and-doc-dedup-design.md`
- Modify: `docs/superpowers/plans/2026-03-22-workspace-cleanup-and-doc-dedup.md`

- [ ] **Step 1: 跑本轮目标验证**

Run:
- `cd app && npx jest --run-in-band --runTestsByPath src/hooks/__tests__/usePermissions.test.ts src/components/__tests__/CalendarView.test.tsx src/components/__tests__/Timeline.v2.view-mode.test.tsx`
- `cd app && npx tsc --noEmit`
- `git diff --check -- app/src/hooks/usePermissions.ts app/src/hooks/__tests__/usePermissions.test.ts app/src/components/Timeline.v2.tsx app/src/components/CalendarView.tsx app/src/components/CalendarTimelineItem.tsx app/src/components/__tests__/Timeline.v2.view-mode.test.tsx app/src/components/__tests__/CalendarView.test.tsx docs/superpowers/specs/2026-03-21-cloud-mode-frontend-integration-design.md docs/superpowers/plans/2026-03-21-cloud-mode-frontend-integration.md docs/superpowers/specs/2026-03-22-workspace-cleanup-and-doc-dedup-design.md docs/superpowers/plans/2026-03-22-workspace-cleanup-and-doc-dedup.md`

Expected:
- 目标测试通过
- TypeScript 零错误
- diff 无空白或冲突问题

- [ ] **Step 2: 更新本轮 spec / plan 状态**

要求：
- 把 `2026-03-22-workspace-cleanup-and-doc-dedup-design.md` 状态改为 `已实现`
- 在 spec 中补：
  - 实现结果
  - 最终说明
  - 验证结果
- 在本 plan 中：
  - 更新执行状态表
  - 补“实际执行说明”
  - 补“验证结果”

- [ ] **Step 3: 做 scoped commit**

只允许提交以下文件：

```bash
git add \
  app/src/hooks/usePermissions.ts \
  app/src/hooks/__tests__/usePermissions.test.ts \
  app/src/components/Timeline.v2.tsx \
  app/src/components/CalendarView.tsx \
  app/src/components/CalendarTimelineItem.tsx \
  app/src/components/__tests__/Timeline.v2.view-mode.test.tsx \
  app/src/components/__tests__/CalendarView.test.tsx \
  docs/superpowers/specs/2026-03-21-cloud-mode-frontend-integration-design.md \
  docs/superpowers/plans/2026-03-21-cloud-mode-frontend-integration.md \
  docs/superpowers/specs/2026-03-22-workspace-cleanup-and-doc-dedup-design.md \
  docs/superpowers/plans/2026-03-22-workspace-cleanup-and-doc-dedup.md
```

提交信息建议：

```bash
git commit -m "chore: clean up leftover sync compatibility changes"
```
