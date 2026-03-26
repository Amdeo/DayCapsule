# Backup And Sync Test Granularity Design

## 背景

上一轮前端测试细化已经补齐了登录、设置页账户区、同步状态入口与设置页测试稳定性，但云端相关模块里还有两块明显偏粗：

1. `BackupPage` 已有主路径覆盖，但导出、导入、媒体恢复和异常回退仍然聚集在少量大测试里
2. `CloudSyncStatusButton` 目前只覆盖静态渲染和点击回调，未锁定 `syncing` 态的专属结构以及动画启停/清理语义
3. 这两个模块都属于“数据安全 / 同步状态感知”链路，回归风险高，但当前自动化颗粒度还不足以快速定位问题

本次工作不重新设计产品能力，而是把备份与同步状态相关测试继续按模块拆细，补齐高风险边界，并保持测试文件可持续维护。

## 目标

- 为 `BackupPage` 补齐导出、导入、历史列表和媒体恢复相关的高风险细粒度测试
- 为 `CloudSyncStatusButton` 补齐结构语义和动画生命周期测试
- 明确哪些行为应该留在页面集成测试，哪些应拆到组件/动画层测试
- 在不修改生产逻辑的前提下提升回归定位能力
- 为下一步 implementation plan 提供可直接执行的任务边界

## 非目标

- 不新增备份、恢复、iCloud 或云同步产品能力
- 不重构 `useBackupPageController`、`BackupService`、`SyncService` 或动画实现
- 不把备份/同步所有逻辑都下沉成 hook 单测
- 不扩大 `Maestro` 范围到备份页的所有分支
- 不改动现有业务文案或 UI 结构，除非测试无法稳定定位元素

## 方案比较

### 方案 A：只扩页面集成测试

做法：

- 继续在 `BackupPage.test.tsx` 和 `CloudSyncStatusButton.test.tsx` 里堆积分支

优点：

- 改动最小
- 推进速度快

缺点：

- `BackupPage.test.tsx` 会继续膨胀
- `CloudSyncStatusButton` 的动画启停无法被精确锁定
- 后续排查失败时很难快速定位是内容渲染问题还是动画生命周期问题

### 方案 B：页面集成 + 小模块行为拆分

这是推荐方案。

做法：

- `BackupPage` 保留总装测试，同时把高风险边界继续细化为更明确的场景用例
- `CloudSyncStatusButton` 拆成“内容结构”与“动画生命周期”两层测试
- 页面层只验证用户可见语义，动画层只验证 `Animated` 生命周期，不混在一个文件里

优点：

- 颗粒度足够细，但仍围绕真实用户行为
- 失败定位清晰
- 与现有 React Native/Jest 测试资产最一致

缺点：

- 需要增加少量 mock 和额外测试文件

### 方案 C：改为 hook/controller 主导

做法：

- 直接给 `useBackupPageController` 和 `useCloudSyncStatusButtonAnimation` 写大量 hook 级单测

优点：

- 分支可拆到最细

缺点：

- mock 成本高
- 容易过度绑定实现细节
- 回归价值不如页面语义测试直观

## 最终方案

采用方案 B。

分层原则：

1. 页面级用户行为放在 `BackupPage` 集成测试中验证
2. 纯渲染结构和状态差异放在 `CloudSyncStatusButton` 内容测试中验证
3. 动画启停与资源清理放在动画专属测试中验证
4. 不为了“细”而把同一语义在多个层次重复断言

## 范围拆分

### 1. `BackupPage`

目标文件：

- `app/src/components/BackupPage.tsx`
- `app/src/components/backup-page/useBackupPageController.ts`
- `app/src/components/backup-page/BackupPageSections.tsx`
- `app/src/components/BackupExportSheet.tsx`
- `app/src/components/backup-export-sheet/BackupExportSheetContent.tsx`
- `app/src/components/__tests__/BackupPage.test.tsx`

本次重点：

- 导出失败和保存失败/取消分支
- 导入取消、媒体恢复失败、空恢复结果分支
- 本地备份历史的显示与裁剪语义
- iCloud 区域可用/不可用文案

### 2. `CloudSyncStatusButton`

目标文件：

- `app/src/components/CloudSyncStatusButton.tsx`
- `app/src/components/cloud-sync-status-button/CloudSyncStatusButtonContent.tsx`
- `app/src/components/cloud-sync-status-button/useCloudSyncStatusButtonAnimation.ts`
- `app/src/components/__tests__/CloudSyncStatusButton.test.tsx`
- `app/src/components/__tests__/cloud-sync-status-button/CloudSyncStatusButton.animation.test.tsx`

本次重点：

- `syncing` 与非 `syncing` 状态的结构差异
- 动画在进入 `syncing`、切换出 `syncing`、组件卸载时的启动、停止和 reset 语义

## 细粒度场景清单

### A. `BackupPage`

#### `BP-01 无本地备份时不渲染备份历史区`

- 前置条件：`BackupService.listBackups()` 返回空数组
- 操作步骤：渲染 `BackupPage`
- 预期结果：不出现“备份历史”标题，不出现历史分享按钮

#### `BP-02 备份历史只显示最新三条记录`

- 前置条件：`BackupService.listBackups()` 返回 4 条以上备份
- 操作步骤：渲染 `BackupPage`
- 预期结果：只展示前 3 条记录，超出部分不渲染分享入口

#### `BP-03 iCloud 可用时显示可用文案`

- 前置条件：`SyncService.isICloudAvailable()` 返回 `true`
- 操作步骤：渲染 `BackupPage`
- 预期结果：显示 `iCloud Drive 可用`，不显示 `仅限 iOS 设备`

#### `BP-04 导出归档创建失败时展示品牌化反馈`

- 前置条件：`BackupService.createBackup()` reject
- 操作步骤：点击“导出”
- 预期结果：调用 `showErrorFeedback`，标题为“导出失败”，`dedupeKey` 为 `backup-export-create-failed`
- 补充约束：不打开导出 sheet

#### `BP-05 保存到文件被用户取消时保持 sheet 打开`

- 前置条件：已打开导出 sheet，`saveBackupToUserDirectory()` 返回 `{ canceled: true }`
- 操作步骤：点击主操作按钮
- 预期结果：不弹成功提示，不报错误反馈，sheet 仍然可见

#### `BP-06 保存到文件抛异常时展示保存失败反馈`

- 前置条件：已打开导出 sheet，`saveBackupToUserDirectory()` reject
- 操作步骤：点击主操作按钮
- 预期结果：调用 `showErrorFeedback`，`dedupeKey` 为 `backup-export-save-failed`

#### `BP-07 用户取消导入选文件时静默结束`

- 前置条件：`SyncService.pickAndParseBackup()` 返回 `null`
- 操作步骤：点击“导入”
- 预期结果：不调用 `restoreEntries`，不调用 `extractMediaFromZip`，不展示错误反馈

#### `BP-08 记录恢复成功但媒体解压失败时显示部分恢复提示`

- 前置条件：`restoreEntries()` 返回至少 1 个 id，`extractMediaFromZip()` reject
- 操作步骤：点击“导入”
- 预期结果：弹出“部分恢复”提示，不展示“导入成功”，不调用品牌化错误反馈

#### `BP-09 未恢复任何新记录时跳过媒体恢复`

- 前置条件：`restoreEntries()` 返回空数组
- 操作步骤：点击“导入”
- 预期结果：不调用 `extractMediaFromZip`，不调用 `updateEntry`，最终提示 `已恢复 0 / N 条记录`

#### `BP-10 恢复后的媒体路径会回写到新插入记录`

- 前置条件：已恢复记录，`extractMediaFromZip()` 返回带媒体 `uri` 的记录
- 操作步骤：点击“导入”
- 预期结果：仅对本次插入成功的记录调用 `updateEntry` 回写媒体数组

### B. `CloudSyncStatusButton`

#### `CSB-01 syncing 态只渲染 spinner，不渲染状态点`

- 前置条件：`uiState='syncing'`
- 操作步骤：渲染按钮
- 预期结果：存在 `cloud-sync-spinner`，不存在任意 `cloud-sync-dot-*`

#### `CSB-02 非 syncing 态渲染对应状态点`

- 前置条件：分别传入 `synced`、`pending`、`failed`
- 操作步骤：渲染按钮
- 预期结果：存在对应 `cloud-sync-dot-*`，不存在 `cloud-sync-spinner`

#### `CSB-03 进入 syncing 态时启动两组循环动画`

- 前置条件：mock `Animated.loop`
- 操作步骤：渲染 `uiState='syncing'`
- 预期结果：`Animated.loop` 被调用两次，对应呼吸动画和旋转动画，并且各自 `start()`

#### `CSB-04 从 syncing 切回非 syncing 时停止并重置动画值`

- 前置条件：先以 `syncing` 渲染，再 rerender 为 `synced`
- 操作步骤：切换状态
- 预期结果：已启动的 loop 调用 `stop()`，`breathe` 重置到 `1`，`spin` 重置到 `0`

#### `CSB-05 组件卸载时清理动画资源`

- 前置条件：`uiState='syncing'`
- 操作步骤：卸载组件
- 预期结果：动画 loop 停止，底层 `Animated.Value.stopAnimation()` 和 `setValue()` 被调用

## 文件边界与组织

### `BackupPage`

- 继续使用现有 `app/src/components/__tests__/BackupPage.test.tsx`
- 不额外拆新 helper，避免这轮过早抽象
- 允许把现有未提交的 `BackupPage.test.tsx` 草稿继续吸收进正式实现，但不得覆盖其已新增场景

### `CloudSyncStatusButton`

- `app/src/components/__tests__/CloudSyncStatusButton.test.tsx`
  负责用户可见结构、状态点和点击行为
- `app/src/components/__tests__/cloud-sync-status-button/CloudSyncStatusButton.animation.test.tsx`
  负责动画生命周期

## 验证策略

实现完成后至少执行：

```bash
cd app && npm test -- --runTestsByPath \
  src/components/__tests__/BackupPage.test.tsx \
  src/components/__tests__/CloudSyncStatusButton.test.tsx \
  src/components/__tests__/cloud-sync-status-button/CloudSyncStatusButton.animation.test.tsx \
  --runInBand
```

如果需要对已有云同步首页链路做回归补充，再追加：

```bash
cd app && npm test -- --runTestsByPath \
  src/components/__tests__/timeline/timeline.home.sync-status.test.tsx \
  src/components/__tests__/CloudSyncStatusButton.test.tsx \
  src/components/__tests__/cloud-sync-status-button/CloudSyncStatusButton.animation.test.tsx \
  --runInBand
```

## 风险与约束

- `BackupPage.test.tsx` 当前已经存在本地未提交扩展草稿，实现阶段必须在其基础上增量调整，不能直接覆盖
- 动画测试会 mock `Animated`，断言应聚焦生命周期调用，不要对插值对象内部结构做脆弱快照
- 这轮只扩测试，不改生产逻辑；若实现阶段发现测试无法稳定定位元素，再最小化补充 `testID`

## 推荐执行顺序

1. 先整理并完成 `BackupPage.test.tsx` 的高风险分支
2. 再补 `CloudSyncStatusButton` 的结构测试
3. 最后补动画生命周期测试
4. 跑专项命令确认通过后，再决定是否把它们并入新的前端测试脚本
