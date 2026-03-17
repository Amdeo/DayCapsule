# 备份导出面板仅保留保存到文件 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除 `BackupExportSheet` 中的“发送到微信”和“更多方式”，保留“保存到文件”和“取消”；`BackupPage` 不再保留任何分享代码，但顶部导出按钮和历史备份右侧图标仍继续打开同一个底部面板。

**Architecture:** 这是一次 UI 与页面流程的收缩，不改 `BackupService.saveBackupToUserDirectory()`。`BackupExportSheet` 的 props 和渲染内容收缩；`BackupPage` 删除 `Share` 相关导入和 `handleSystemShare()`，只保留打开面板与保存到文件链路。测试同步删除分享相关断言，改为断言面板只剩“保存到文件”。

**Tech Stack:** React Native, Jest, @testing-library/react-native, TypeScript

---

## File Structure

| 操作 | 文件 | 职责 |
|---|---|---|
| 改 | `app/src/components/BackupExportSheet.tsx` | 删除分享入口，收缩 props |
| 改 | `app/src/components/__tests__/BackupExportSheet.test.tsx` | 调整为仅保存到文件的 UI/回调测试 |
| 改 | `app/src/components/BackupPage.tsx` | 删除分享代码，仅保留面板 + 保存到文件 |
| 改 | `app/src/components/__tests__/BackupPage.test.tsx` | 删除分享相关断言，改为验证 save-only 面板和保存流程 |

---

## Chunk 1: 先补失败测试

### Task 1: 把测试改成 save-only 预期

**Files:**
- Modify: `app/src/components/__tests__/BackupExportSheet.test.tsx`
- Modify: `app/src/components/__tests__/BackupPage.test.tsx`

- [ ] **Step 1: 收缩 `BackupExportSheet` 测试**

将测试改为：

- 面板可见时只渲染 `保存到文件`、`取消`
- `发送到微信` 和 `更多方式` 不存在
- 只断言：
  - `backup-export-save`
  - `backup-export-cancel`

- [ ] **Step 2: 收缩 `BackupPage` 测试**

修改测试预期：

- 点击 `导出` 后，打开面板并看到 `保存到文件`
- 不再查找 `发送到微信`
- 不再测试 `getAndroidShareableUri()` 和 `Share.share()`
- 顶部导出和历史备份图标都应进入同一个 save-only 面板
- 点击 `保存到文件` 后，继续调用 `BackupService.saveBackupToUserDirectory()`

- [ ] **Step 3: 运行测试确认失败**

Run:

```bash
cd app && npx jest src/components/__tests__/BackupExportSheet.test.tsx src/components/__tests__/BackupPage.test.tsx --no-coverage
```

Expected:
- FAIL
- 因为当前组件和页面仍然保留分享按钮/分享代码

---

## Chunk 2: 实现 save-only 面板

### Task 2: 收缩 `BackupExportSheet`

**Files:**
- Modify: `app/src/components/BackupExportSheet.tsx`

- [ ] **Step 1: 收缩 props**

将 props 改为：

```ts
interface BackupExportSheetProps {
  visible: boolean;
  fileName: string;
  onSaveToFiles: () => void;
  onClose: () => void;
}
```

删除：

- `onWechatShare`
- `onMoreShare`

- [ ] **Step 2: 删除分享按钮**

移除：

- `发送到微信`
- `更多方式`
- 对应 `testID`

保留：

- `backup-export-save`
- `backup-export-cancel`

- [ ] **Step 3: 保持标题与副标题不变**

以下内容不改：

- 标题 `导出备份`
- 文件名副标题
- handle、遮罩、取消按钮样式

- [ ] **Step 4: 运行组件测试确认通过**

Run:

```bash
cd app && npx jest src/components/__tests__/BackupExportSheet.test.tsx --no-coverage
```

Expected:
- PASS

---

## Chunk 3: 移除页面分享代码

### Task 3: 收缩 `BackupPage`

**Files:**
- Modify: `app/src/components/BackupPage.tsx`

- [ ] **Step 1: 删除 `Share` import**

页面不再需要：

```ts
import { Share } from 'react-native';
```

- [ ] **Step 2: 删除 `handleSystemShare()`**

完全移除分享逻辑：

- 不再调用 `BackupService.getAndroidShareableUri()`
- 不再调用 `Share.share()`
- 不再保留“分享失败”提示

- [ ] **Step 3: 保留面板打开逻辑**

以下逻辑继续保留：

- `handleExport()`
- `handleOpenExportSheet()`
- `handleCloseExportSheet()`
- `handleSaveToFiles()`

顶部导出和历史备份图标仍然通过 `exportTarget` + `showExportSheet` 打开同一个面板。

- [ ] **Step 4: 调整 `BackupExportSheet` 接入**

改为：

```tsx
<BackupExportSheet
  visible={showExportSheet}
  fileName={exportTarget?.name ?? ''}
  onSaveToFiles={handleSaveToFiles}
  onClose={handleCloseExportSheet}
/>
```

- [ ] **Step 5: 运行页面测试确认通过**

Run:

```bash
cd app && npx jest src/components/__tests__/BackupPage.test.tsx --no-coverage
```

Expected:
- PASS

---

## Chunk 4: 最终验证

### Task 4: 回归验证

**Files:**
- No file changes required

- [ ] **Step 1: 运行相关测试**

Run:

```bash
cd app && npx jest src/components/__tests__/BackupExportSheet.test.tsx src/components/__tests__/BackupPage.test.tsx --no-coverage
```

Expected:
- PASS

- [ ] **Step 2: 运行全量测试**

Run:

```bash
cd app && npx jest --no-coverage
```

Expected:
- PASS

- [ ] **Step 3: 运行类型检查**

Run:

```bash
cd app && npx tsc --noEmit
```

Expected:
- 无 TypeScript 错误

---

## Notes for Executor

- 这是一次收缩，不是重构。删除旧分享分支，不要留下不用的 props/回调。
- 不要改 `BackupService` 的保存实现。
- 不要改历史图标本身的视觉样式，这轮只改它打开面板后的行为语义。
