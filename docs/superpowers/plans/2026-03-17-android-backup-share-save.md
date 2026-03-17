# Android 备份分享与保存修复 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 Android 上备份 ZIP 无法通过微信分享、无法保存到文件管理器的问题；导出后改为弹出操作面板，提供“发送到微信 / 保存到文件 / 更多方式 / 取消”。

**Architecture:** 保留 `BackupService.createBackup()` 生成内部 ZIP；新增 Android 导出层负责将内部 ZIP 转成可共享 URI 或保存到用户选目录；`BackupPage` 改为“导出成功后弹面板”，历史备份分享也走同一条导出层；新增独立 `BackupExportSheet` 组件承载交互。

**Tech Stack:** React Native, Expo FileSystem legacy (`getContentUriAsync`, `StorageAccessFramework`), React Native `Share`, Jest, @testing-library/react-native, TypeScript

---

## File Structure

| 操作 | 文件 | 职责 |
|---|---|---|
| 改 | `app/src/services/backupService.ts` | 新增 Android 可共享 URI / 保存到用户目录能力 |
| 改 | `app/src/services/__tests__/backupService.test.ts` | 为 Android 分享与保存链路补单元测试 |
| 新 | `app/src/components/BackupExportSheet.tsx` | 导出操作底部面板 |
| 新 | `app/src/components/__tests__/BackupExportSheet.test.tsx` | 面板渲染与回调测试 |
| 改 | `app/src/components/BackupPage.tsx` | 导出流程改为“生成 ZIP -> 打开面板 -> 选择微信/保存/更多方式” |
| 改 | `app/src/components/__tests__/BackupPage.test.tsx` | 覆盖导出面板、历史备份、微信/文件链路 |

---

## Chunk 1: 先补服务层失败测试

### Task 1: 为 Android 导出层新增测试

**Files:**
- Modify: `app/src/services/__tests__/backupService.test.ts`

- [ ] **Step 1: 补 `getAndroidShareableUri()` 的失败测试**

为 `BackupService` 新增一组测试，覆盖：

- Android 上调用时会使用 `FileSystem.getContentUriAsync(fileUri)`
- 非 Android 平台直接返回原始 `fileUri`

测试中 mock：

```ts
jest.spyOn(Platform, 'OS', 'get').mockReturnValue('android');
(FileSystem.getContentUriAsync as jest.Mock).mockResolvedValue('content://backup.zip');
```

断言：

```ts
await expect(
  BackupService.getAndroidShareableUri('file:///app/backups/a.zip')
).resolves.toBe('content://backup.zip');
```

- [ ] **Step 2: 补 `saveBackupToUserDirectory()` 的失败测试**

新增测试覆盖：

- 调用 `StorageAccessFramework.requestDirectoryPermissionsAsync()`
- 授权成功后创建目标文件
- 从原始 ZIP 读取 base64 内容并写入 SAF 文件

关键 mock：

```ts
FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync.mockResolvedValue({
  granted: true,
  directoryUri: 'content://tree/primary:Download',
});
FileSystem.StorageAccessFramework.createFileAsync.mockResolvedValue('content://doc/backup.zip');
FileSystem.readAsStringAsync.mockResolvedValue('bW9ja3ppcA==');
```

断言：

- `createFileAsync` 收到不带扩展名的文件名或与实现约定一致的文件名
- `StorageAccessFramework.writeAsStringAsync()` 用 base64 内容写入目标 URI

- [ ] **Step 3: 补用户取消目录选择的测试**

模拟：

```ts
FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync.mockResolvedValue({
  granted: false,
  directoryUri: null,
});
```

断言：

- 不写入任何文件
- 返回一个明确的结果（推荐 `{ saved: false, canceled: true, fileName: null }`），而不是抛异常

- [ ] **Step 4: 补同名文件处理测试**

新增一条测试，要求保存到文件时如果目标文件名已存在，会自动追加 ` (1)`、` (2)`。

可通过 mock `StorageAccessFramework.createFileAsync()` 第一次抛“已存在”错误，第二次成功，来驱动重试逻辑。

- [ ] **Step 5: 运行测试确认失败**

Run:

```bash
cd app && npx jest src/services/__tests__/backupService.test.ts --no-coverage
```

Expected:
- FAIL
- 失败原因是 `BackupService` 还没有这些新方法或未处理 Android 保存逻辑

---

## Chunk 2: 实现 BackupService Android 导出层

### Task 2: 新增分享 URI 与保存到用户目录能力

**Files:**
- Modify: `app/src/services/backupService.ts`

- [ ] **Step 1: 扩展 `expo-file-system/legacy` 依赖使用**

确保 `backupService.ts` 继续使用 `expo-file-system/legacy`，并访问：

- `FileSystem.getContentUriAsync`
- `FileSystem.StorageAccessFramework`

不要切换到另一套文件系统 API，避免和现有测试/mocks 断裂。

- [ ] **Step 2: 实现 `getAndroidShareableUri(fileUri)`**

建议签名：

```ts
static async getAndroidShareableUri(fileUri: string): Promise<string>
```

行为：

- `Platform.OS === 'android'` 时调用 `FileSystem.getContentUriAsync(fileUri)`
- 其他平台直接返回 `fileUri`

- [ ] **Step 3: 实现 `saveBackupToUserDirectory(fileUri, fileName)`**

建议签名：

```ts
static async saveBackupToUserDirectory(
  fileUri: string,
  fileName: string
): Promise<{ saved: boolean; canceled: boolean; fileName: string | null }>
```

实现要点：

1. 请求目录权限
2. 若用户取消，返回 `{ saved: false, canceled: true, fileName: null }`
3. 读取原始 ZIP 为 base64
4. 在用户目录中创建目标文件
5. 将 base64 内容写入 SAF URI
6. 返回成功结果

- [ ] **Step 4: 实现同名文件自动递增策略**

新增一个私有辅助函数，例如：

```ts
private static buildBackupCandidateNames(fileName: string): string[]
```

或在保存函数内部循环生成：

- `backup_xxx.zip`
- `backup_xxx (1).zip`
- `backup_xxx (2).zip`

直到创建成功，避免覆盖已有文件。

- [ ] **Step 5: 运行服务层测试确认通过**

Run:

```bash
cd app && npx jest src/services/__tests__/backupService.test.ts --no-coverage
```

Expected:
- PASS

- [ ] **Step 6: 提交**

```bash
cd app
git add src/services/backupService.ts src/services/__tests__/backupService.test.ts
git commit -m "feat: add android backup export helpers"
```

---

## Chunk 3: 先补面板组件测试

### Task 3: 为导出操作面板写测试

**Files:**
- Create: `app/src/components/__tests__/BackupExportSheet.test.tsx`

- [ ] **Step 1: 写渲染测试**

测试 `visible={true}` 时会出现：

- `发送到微信`
- `保存到文件`
- `更多方式`
- `取消`

- [ ] **Step 2: 写回调测试**

分别点击每个按钮，断言：

- `onWechatShare`
- `onSaveToFiles`
- `onMoreShare`
- `onClose`

各自被调用一次。

- [ ] **Step 3: 运行测试确认失败**

Run:

```bash
cd app && npx jest src/components/__tests__/BackupExportSheet.test.tsx --no-coverage
```

Expected:
- FAIL
- 因为组件尚不存在

---

## Chunk 4: 实现 BackupExportSheet

### Task 4: 新增底部导出面板组件

**Files:**
- Create: `app/src/components/BackupExportSheet.tsx`
- Create: `app/src/components/__tests__/BackupExportSheet.test.tsx`

- [ ] **Step 1: 新建 `BackupExportSheet`**

使用现有项目风格的 `Modal` + 底部卡片结构。建议 props：

```ts
interface BackupExportSheetProps {
  visible: boolean;
  fileName: string;
  onWechatShare: () => void;
  onSaveToFiles: () => void;
  onMoreShare: () => void;
  onClose: () => void;
}
```

- [ ] **Step 2: 增加明确测试锚点**

至少为以下按钮加 `testID`：

- `backup-export-wechat`
- `backup-export-save`
- `backup-export-more`
- `backup-export-cancel`

- [ ] **Step 3: 保持组件职责收敛**

组件只负责 UI 和回调转发，不直接 import `BackupService` 或 `Share`。

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd app && npx jest src/components/__tests__/BackupExportSheet.test.tsx --no-coverage
```

Expected:
- PASS

- [ ] **Step 5: 提交**

```bash
cd app
git add src/components/BackupExportSheet.tsx src/components/__tests__/BackupExportSheet.test.tsx
git commit -m "feat: add backup export action sheet"
```

---

## Chunk 5: 先补 BackupPage 失败测试

### Task 5: 为新导出流程和历史备份行为补测试

**Files:**
- Modify: `app/src/components/__tests__/BackupPage.test.tsx`

- [ ] **Step 1: mock 新导出能力和分享能力**

在 `BackupPage` 测试中 mock：

- `BackupService.createBackup`
- `BackupService.getAndroidShareableUri`
- `BackupService.saveBackupToUserDirectory`
- `Share.share`

确保不会再真实调用旧分享链路。

- [ ] **Step 2: 写“导出后打开面板”的失败测试**

点击 `导出` 后，断言：

- `createBackup(entries)` 被调用
- 页面不再立刻 `Share.share`
- 出现 `发送到微信 / 保存到文件 / 更多方式`

- [ ] **Step 3: 写“发送到微信”链路测试**

断言点击该按钮后：

- 调用 `BackupService.getAndroidShareableUri(exportUri)`
- 再调用 `Share.share({ url: shareableUri, title: ... })`

- [ ] **Step 4: 写“保存到文件”链路测试**

断言点击该按钮后：

- 调用 `BackupService.saveBackupToUserDirectory(exportUri, fileName)`
- 成功时展示成功提示，或至少不走 `Share.share`

- [ ] **Step 5: 写“历史备份分享图标也走面板”的测试**

点击历史备份分享图标后，断言：

- 打开同一个导出面板
- 没有直接 `Share.share(originalUri)`

这是防止旧逻辑绕过新导出层的关键回归。

- [ ] **Step 6: 运行测试确认失败**

Run:

```bash
cd app && npx jest src/components/__tests__/BackupPage.test.tsx --no-coverage
```

Expected:
- FAIL

---

## Chunk 6: 改造 BackupPage 导出流程

### Task 6: 接入导出面板与 Android 导出层

**Files:**
- Modify: `app/src/components/BackupPage.tsx`

- [ ] **Step 1: 删除页面里直接 `Share.share(originalUri)` 的做法**

移除：

- `handleExport()` 中导出后直接 `Share.share`
- `handleShareBackup(uri)` 中直接 `Share.share`

- [ ] **Step 2: 增加导出目标状态**

在页面中新增：

```ts
type ExportTarget = { name: string; uri: string } | null;
const [exportTarget, setExportTarget] = useState<ExportTarget>(null);
const [showExportSheet, setShowExportSheet] = useState(false);
const [isSavingToFiles, setIsSavingToFiles] = useState(false);
```

- [ ] **Step 3: 改写 `handleExport()`**

新流程：

1. `createBackup(entries)`
2. `refreshBackupInfo()`
3. `setExportTarget({ name, uri })`
4. `setShowExportSheet(true)`

这里 `name` 建议直接从 `uri.split('/').pop()` 获取，避免 service 再返回另一份命名。

- [ ] **Step 4: 改写历史备份分享入口**

将 `handleShareBackup(uri)` 改成接受 `{ name, uri }` 或从已有 `BackupFile` 读出完整对象，直接打开面板，而不是立刻分享。

- [ ] **Step 5: 新增面板动作回调**

实现：

- `handleWechatShare`
- `handleSaveToFiles`
- `handleMoreShare`
- `handleCloseExportSheet`

其中：

- `handleWechatShare` 和 `handleMoreShare` 都先调用 `getAndroidShareableUri()`
- `handleSaveToFiles` 调用 `saveBackupToUserDirectory()`
- `handleMoreShare` 的系统分享文案保持中性，不限定微信

- [ ] **Step 6: 接入 `BackupExportSheet`**

在 `BackupPage` 底部渲染面板，传入当前 `exportTarget` 的文件名和回调。

- [ ] **Step 7: 增加用户提示**

处理以下提示：

- 导出失败
- 分享失败
- 保存失败
- 保存成功

用户取消目录授权时不弹错误。

- [ ] **Step 8: 运行页面测试确认通过**

Run:

```bash
cd app && npx jest src/components/__tests__/BackupPage.test.tsx --no-coverage
```

Expected:
- PASS

- [ ] **Step 9: 提交**

```bash
cd app
git add src/components/BackupPage.tsx src/components/__tests__/BackupPage.test.tsx
git commit -m "feat: add android backup export flows"
```

---

## Chunk 7: 最终验证

### Task 7: 回归验证

**Files:**
- No file changes required

- [ ] **Step 1: 运行相关测试**

Run:

```bash
cd app && npx jest \
  src/services/__tests__/backupService.test.ts \
  src/components/__tests__/BackupExportSheet.test.tsx \
  src/components/__tests__/BackupPage.test.tsx \
  --no-coverage
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

- [ ] **Step 4: Android 人工验证**

在 Android 真机或模拟器上验证：

1. 点击“导出”，导出成功后弹出 `BackupExportSheet`
2. 选择“发送到微信”，系统分享面板可正常选择微信，微信不再报“获取资源失败”
3. 选择“保存到文件”，能选目录并看到 ZIP 真正落盘
4. 点击历史备份分享图标，同样进入导出面板
5. 取消目录选择时，无错误提示

---

## Notes for Executor

- 严格按 TDD 执行，这轮不要先改页面再补测试。
- Android 保存链路必须基于 `StorageAccessFramework`，不要继续尝试用 `Share.share()` 兜底“保存到文件”。
- `发送到微信` 这个动作名称可以保留，但实现上仍然是“可被微信读取的系统分享”，不要误做成微信 SDK 集成。
- 不要在本轮顺手改 iCloud 区块、导入逻辑、备份 ZIP 结构或自动备份策略。
