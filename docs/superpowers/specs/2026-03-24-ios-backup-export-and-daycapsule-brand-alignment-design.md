# 设计文档：iOS 备份导出修复与 DayCapsule 品牌对齐

**日期：** 2026-03-24  
**状态：** 已批准  
**影响范围：** `BackupPage`、`BackupExportSheet`、`BackupService`、iOS 原生配置、测试

---

## 背景

当前应用最近主要在 Android 模拟器上开发和验证，因此出现了两类 iOS 遗留问题：

- 备份导出流程沿用了 Android-only 的 `StorageAccessFramework` 保存链路，iOS 也走了同一入口
- Expo 配置与原生 iOS/Android 配置出现品牌漂移：`app.json` 已改为 `DayCapsule`，但原生工程仍大量保留 `MemoryCapsule`

静态检查和一次真实 iOS 模拟器构建表明，当前 iOS 工程可以成功编译运行，问题不在“原生工程损坏”，而在“平台行为未分流”和“用户可见配置未对齐”。

---

## 目标

本轮完成两件事：

1. 修复 iOS 上的备份导出行为，使其不再调用 Android 专用保存逻辑
2. 将用户可见的品牌名称统一为 `DayCapsule`，尤其是 iOS 权限文案和显示名称

---

## 非目标

本轮不做以下事项：

- 不重命名 Xcode target、原生工程目录或 Pod target
- 不修改现有安装包身份
- 不修改 `bundleIdentifier` / `applicationId`
- 不变更数据库名、沙盒目录结构或已有本地数据位置
- 不处理服务端、Sentry、邮件域名等与品牌升级相关的外围资产

---

## 方案对比

### 方案一：只修 iOS 导出，不处理品牌漂移

仅把 iOS 导出改为系统分享，保留现有 `MemoryCapsule` / `DayCapsule` 混用状态。

**优点：**

- 改动最小
- 风险最低

**缺点：**

- `app.json`、iOS 原生配置、Android 原生配置继续不一致
- 权限文案、显示名称和后续配置会持续产生认知成本

### 方案二：修 iOS 导出，并统一用户可见品牌为 `DayCapsule`（推荐）

修平台分支，同时把应用名称、权限文案和相关可见配置统一成 `DayCapsule`，但不改变安装包身份。

**优点：**

- 直接解决真实的 iOS 功能问题
- 消除最明显的品牌漂移
- 不引入“变成一个新 App”的风险

**缺点：**

- 内部 target 名和 bundle id 仍保留 `MemoryCapsule`
- 品牌对齐属于“最小一致”，不是彻底改名

### 方案三：全量改名，包括 bundle id / application id / scheme

除方案二外，再把安装包身份也全部切到 `DayCapsule`。

**优点：**

- 品牌最一致

**缺点：**

- 风险最高
- 现有安装会被系统视为不同 App
- 深链、第三方配置和历史数据迁移都可能受影响

### 结论

采用**方案二**。  
即：修 iOS 导出分支，统一用户可见品牌为 `DayCapsule`，但保留当前安装包身份。

---

## 交互设计

### 备份导出

当前导出面板只提供“保存到文件”。这个交互在 Android 上合理，但在 iOS 上应改为更符合平台习惯的系统分享/导出面板。

导出行为调整为：

- Android：
  - 保持现状
  - 点击面板中的主动作，继续走 `BackupService.saveBackupToUserDirectory()`
- iOS：
  - 点击面板中的主动作时，调用系统 `Share.share({ url })`
  - 按钮文案从“保存到文件”切换为“导出/分享”
  - 成功调起系统面板后关闭当前导出面板

历史备份右侧图标仍复用同一个导出面板，但进入面板后的主动作也按平台分流。

### 品牌展示

用户可见名称统一为 `DayCapsule`：

- Expo 应用名称
- iOS `CFBundleDisplayName`
- iOS 权限文案
- iOS 相册写入权限文案

本轮不要求把源码里的所有内部命名都改成 `DayCapsule`；重点是用户真实能看到的内容一致。

---

## 架构设计

### 1. `BackupService`

继续保留：

- ZIP 备份生成
- Android Storage Access Framework 保存逻辑
- 备份列表与保留策略

新增或收敛：

- 提供一个面向 iOS 的导出/分享入口，避免控制器直接内联平台细节
- 让控制器不再把 iOS 误导到 `saveBackupToUserDirectory()`

设计原则：

- Android-only 逻辑继续留在 `BackupService`
- iOS 分享逻辑可放在 `BackupService` 或控制器中，但必须明确平台边界
- 不让一个名为“保存到用户目录”的方法在 iOS 上被复用

### 2. `useBackupPageController`

控制器负责：

- 维护 `exportTarget`
- 打开/关闭导出面板
- 根据 `Platform.OS` 决定主动作
- 成功后关闭面板或展示错误反馈

控制器不应再假设所有平台的导出动作都叫“保存到文件”。

### 3. `BackupExportSheet`

面板本身保持轻量：

- 接收当前文件名
- 接收主动作文案
- 接收主动作回调
- 仍保留取消关闭

这样平台差异停留在 controller 层，不扩散到更多 UI 组件。

### 4. iOS 原生配置

需要最小对齐的字段：

- `CFBundleDisplayName`
- URL scheme 中用户可见主 scheme
- `NSCameraUsageDescription`
- `NSMicrophoneUsageDescription`
- `NSPhotoLibraryUsageDescription`
- `NSPhotoLibraryAddUsageDescription`

需要注意：

- `PRODUCT_BUNDLE_IDENTIFIER` 继续保留 `com.memorycapsule.app`
- 原生 target 名继续保留 `MemoryCapsule`

---

## 测试策略

本轮必须先补失败测试，再写实现。

### 备份页面测试

至少覆盖：

- iOS 下点击导出面板主按钮，走系统分享而不是 `saveBackupToUserDirectory()`
- Android 下点击同一按钮，仍走 `saveBackupToUserDirectory()`
- 历史备份入口仍能打开同一个导出面板
- iOS / Android 的主按钮文案按平台切换

### 服务层测试

如新增 `BackupService` 的 iOS 导出方法，需要补单测，覆盖：

- iOS 时调用 `Share.share`
- Android 分支不误入 iOS 导出逻辑

### 配置回归

至少通过文件级断言避免以下回退：

- `app.json` 再次漂移到与原生显示名不一致
- iOS 权限文案继续保留 `MemoryCapsule` 或英文旧文案

---

## 风险与处理

### 风险一：把安装包身份一起改掉

若误改 `bundleIdentifier` / `applicationId`，本地安装会被系统视为不同应用。

**处理：**

- 明确限制本轮只改用户可见字段
- 测试和 diff review 时重点检查这些身份字段是否被触碰

### 风险二：iOS 分享与 Android 保存混在同一个按钮语义里

如果只改实现不改文案，用户会在 iOS 上看到“保存到文件”却弹出系统分享面板。

**处理：**

- 主动作文案按平台变化
- 测试断言按钮文案

### 风险三：现有全量测试基线不干净

当前 worktree 基线存在一个与本需求无关的已知失败：`runtime-regressions.test.ts` 中对 `BackupPage` 导入路径的断言已过时。

**处理：**

- 本轮先运行需求相关测试
- 最终验证时说明全量基线中存在的独立失败，不把它混淆成本次回归

---

## 实施备注

本轮本质上是“平台行为修正 + 品牌可见层对齐”，不是一次原生重构。

执行时应优先做到：

- 让 iOS 用户真实能完成备份导出
- 让 DayCapsule 成为用户可见的一致名称

而不是追求一次性把所有内部历史命名全部清空。
