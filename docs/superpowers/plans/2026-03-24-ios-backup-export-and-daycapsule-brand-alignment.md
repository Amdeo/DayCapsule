# iOS 备份导出修复与 DayCapsule 品牌对齐 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 iOS 上误走 Android-only 备份保存链路的问题，并把用户可见品牌名称统一为 `DayCapsule`，同时保持当前安装包身份不变。

**Architecture:** 先用 TDD 锁定平台分流行为，再在 `useBackupPageController` 和相关服务中引入 iOS 导出分支。UI 层只做最小收敛，主动作文案按平台变化；原生配置只修改显示名和权限文案，不触碰 bundle id / application id。

**Tech Stack:** React Native, Expo, TypeScript, Jest, @testing-library/react-native, iOS Info.plist

---

## File Structure

| 操作 | 文件 | 职责 |
|---|---|---|
| 改 | `app/src/components/backup-page/useBackupPageController.ts` | 按平台分流导出行为 |
| 改 | `app/src/components/backup-export-sheet/BackupExportSheetContent.tsx` | 主动作文案按平台变化 |
| 改 | `app/src/components/BackupExportSheet.tsx` | 透传主动作文案 |
| 改 | `app/src/components/BackupPage.tsx` | 连接新的平台化导出 props |
| 改 | `app/src/services/backupService.ts` | 收敛 iOS/Android 导出辅助能力 |
| 改 | `app/src/components/__tests__/BackupExportSheet.test.tsx` | 验证面板文案与回调 |
| 改 | `app/src/components/__tests__/BackupPage.test.tsx` | 验证 iOS/Android 导出分支 |
| 改 | `app/src/services/__tests__/backupService.test.ts` | 如新增服务方法，验证其平台行为 |
| 改 | `app/app.json` | 保持 Expo 品牌配置为 DayCapsule |
| 改 | `app/ios/MemoryCapsule/Info.plist` | 对齐 iOS 显示名与权限文案 |

---

## Chunk 1: 先补失败测试

### Task 1: 锁定 iOS/Android 导出差异

**Files:**
- Modify: `app/src/components/__tests__/BackupPage.test.tsx`
- Modify: `app/src/components/__tests__/BackupExportSheet.test.tsx`

- [ ] **Step 1: 在 `BackupPage` 测试中添加 iOS 导出分支用例**

新增测试覆盖：

- iOS 下点击导出后的主按钮
- 断言不会调用 `BackupService.saveBackupToUserDirectory()`
- 断言会调用系统分享或对应的 iOS 导出辅助方法

- [ ] **Step 2: 在 `BackupPage` 测试中保留 Android 现有路径**

明确断言：

- Android 下点击同一个主按钮
- 继续调用 `BackupService.saveBackupToUserDirectory()`

- [ ] **Step 3: 在 `BackupExportSheet` 测试中锁定平台文案**

新增断言：

- Android 时显示 `保存到文件`
- iOS 时显示 `导出/分享`

- [ ] **Step 4: 运行相关测试确认失败**

Run:

```bash
cd app && npx jest src/components/__tests__/BackupPage.test.tsx src/components/__tests__/BackupExportSheet.test.tsx --runInBand --no-coverage
```

Expected:
- FAIL
- 因为当前实现尚未按平台分流，也未切换 iOS 主动作文案

---

## Chunk 2: 实现平台化导出行为

### Task 2: 收敛 `BackupService` 与控制器职责

**Files:**
- Modify: `app/src/services/backupService.ts`
- Modify: `app/src/components/backup-page/useBackupPageController.ts`
- Modify: `app/src/components/BackupPage.tsx`

- [ ] **Step 1: 为 iOS 导出定义明确入口**

在 `BackupService` 中新增或收敛一个只面向 iOS 的导出/分享辅助方法，例如：

```ts
static async shareBackup(fileUri: string): Promise<void>
```

要求：

- iOS 下调用系统分享
- 不复用 `saveBackupToUserDirectory()`

- [ ] **Step 2: 保持 Android 保存逻辑不变**

继续保留：

- `saveBackupToUserDirectory()`
- Android 历史备份和新导出都使用这一链路

- [ ] **Step 3: 在 `useBackupPageController` 中按平台选择主动作**

实现逻辑：

- 若 `Platform.OS === 'ios'`，走 iOS 导出/分享入口
- 否则走 `saveBackupToUserDirectory()`

并在成功时统一关闭导出面板。

- [ ] **Step 4: 运行相关测试确认通过**

Run:

```bash
cd app && npx jest src/components/__tests__/BackupPage.test.tsx --runInBand --no-coverage
```

Expected:
- PASS

---

## Chunk 3: 收敛导出面板文案

### Task 3: 让主动作文案按平台变化

**Files:**
- Modify: `app/src/components/backup-export-sheet/BackupExportSheetContent.tsx`
- Modify: `app/src/components/BackupExportSheet.tsx`
- Modify: `app/src/components/BackupPage.tsx`

- [ ] **Step 1: 为导出面板增加可配置主按钮文案**

将主动作文案从写死的 `保存到文件` 改成外部传入，例如：

```ts
primaryActionLabel: string
```

- [ ] **Step 2: 在页面层按平台传值**

规则：

- Android: `保存到文件`
- iOS: `导出/分享`

- [ ] **Step 3: 运行面板测试确认通过**

Run:

```bash
cd app && npx jest src/components/__tests__/BackupExportSheet.test.tsx --runInBand --no-coverage
```

Expected:
- PASS

---

## Chunk 4: 对齐 DayCapsule 用户可见配置

### Task 4: 修改 Expo 与 iOS 可见品牌字段

**Files:**
- Modify: `app/app.json`
- Modify: `app/ios/MemoryCapsule/Info.plist`

- [ ] **Step 1: 保持 `app.json` 的 DayCapsule 品牌字段一致**

确认并保留：

- `expo.name`
- 权限文案中的 `DayCapsule`

不要修改：

- `bundleIdentifier`
- `android.package`

- [ ] **Step 2: 将 iOS 用户可见字段改为 `DayCapsule`**

更新：

- `CFBundleDisplayName`
- `NSCameraUsageDescription`
- `NSMicrophoneUsageDescription`
- `NSPhotoLibraryUsageDescription`
- `NSPhotoLibraryAddUsageDescription`

必要时同步 URL scheme 中的主用户可见 scheme 为 `daycapsule`，但不改 bundle id。

- [ ] **Step 3: 确认未误改安装包身份**

检查并保持不变：

- `PRODUCT_BUNDLE_IDENTIFIER = com.memorycapsule.app`
- Android `applicationId 'com.memorycapsule.app'`

---

## Chunk 5: 验证

### Task 5: 运行回归验证

**Files:**
- No file changes required

- [ ] **Step 1: 运行本次需求相关测试**

Run:

```bash
cd app && npx jest src/components/__tests__/BackupPage.test.tsx src/components/__tests__/BackupExportSheet.test.tsx src/services/__tests__/backupService.test.ts --runInBand --no-coverage
```

Expected:
- PASS

- [ ] **Step 2: 运行类型检查**

Run:

```bash
cd app && npx tsc --noEmit
```

Expected:
- 无 TypeScript 错误

- [ ] **Step 3: 运行 iOS 模拟器编译**

Run:

```bash
xcodebuild -workspace app/ios/MemoryCapsule.xcworkspace -scheme MemoryCapsule -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.2' -derivedDataPath /tmp/MemoryCapsuleDerivedData CODE_SIGNING_ALLOWED=NO build
```

Expected:
- `BUILD SUCCEEDED`

- [ ] **Step 4: 说明全量测试基线中的独立失败**

如全量 `jest` 仍因既有的 `runtime-regressions.test.ts` 失败，需要在交付时明确说明这是已有基线问题，不属于本轮引入。

---

## Notes for Executor

- 严格遵守 TDD：先让新增测试失败，再写实现。
- 本轮不做安装包身份切换，不要改 `com.memorycapsule.app`。
- 本轮也不重命名原生 target / 工程目录，避免扩大风险面。
