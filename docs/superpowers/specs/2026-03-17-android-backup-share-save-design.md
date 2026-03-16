# 设计文档：Android 备份分享与保存修复

**日期：** 2026-03-17  
**状态：** 已批准  
**影响范围：** `BackupService`、`BackupPage`、新增 `BackupExportSheet` 组件

---

## 背景

当前 `备份与同步` 页面在 Android 上支持：

- 导出当前数据为 ZIP 备份
- 查看最近备份历史
- 点击分享图标复用系统分享面板

但现有实现直接把应用沙盒内的 `file://.../Documents/backups/*.zip` 传给 `Share.share()`。这在 Android 上对第三方 App 并不可靠，尤其是：

- 微信会出现“获取资源失败”
- 文件管理器可能无提示或无法落盘

这说明问题不在“有没有分享入口”，而在“分享源文件对目标 App 不可访问”。

---

## 目标

修复 Android 上备份导出后的两条核心链路：

1. 用户可以把备份直接发送到微信
2. 用户可以把备份保存到文件管理器 / 用户选择的目录

同时保留系统分享作为兜底方式，但不再直接分享应用私有目录中的 ZIP 文件。

---

## 非目标

本轮不做以下事项：

- 不新增服务端云备份
- 不实现 iPhone 专门适配
- 不改变 ZIP 备份格式
- 不改变导入逻辑（仍然从文件中选择 ZIP 并解析）
- 不在本轮做微信 SDK 级别集成

---

## 现状问题

### 现有导出路径

- `BackupPage.handleExport()` 调用 `BackupService.createBackup(entries)`
- 导出成功后直接调用 `Share.share({ url: uri, title })`
- 历史备份分享 `handleShareBackup(uri)` 也是同一做法

### 根因判断

Android 上当前分享的 URI 属于应用私有沙盒路径。第三方 App 或系统文件提供方无法稳定读取这个 `file://` 路径，因此会出现：

- 微信无法读取附件，显示“获取资源失败”
- 部分文件管理器不报错但也不执行导出

结论：必须在“生成备份”之后，再增加一层“导出为外部可访问文件”的转换。

---

## 方案对比

### 方案一：先生成可共享副本，再分别走分享和保存（推荐）

保留当前 ZIP 备份生成逻辑；新增 Android 导出层，把内部 ZIP 复制或转换成外部可访问的 URI：

- 分享链路：把内部 `file://` 转成 Android 可供其他应用读取的 `content://`
- 保存链路：通过 Android Storage Access Framework 让用户选择目录，再把 ZIP 写入该目录

**优点：**

- 直接命中当前故障根因
- 复用现有 ZIP 备份结构
- 新导出和历史备份可复用同一套导出层

**缺点：**

- 需要新增一层导出服务能力
- 需要处理 Android 目录授权和失败提示

### 方案二：微信分享和保存文件分别做两套完全独立实现

页面上直接提供“发送到微信”和“保存到文件”两个功能，各自走不同底层实现。

**优点：**

- 用户意图最明确

**缺点：**

- 逻辑容易分叉
- 历史备份与新导出容易出现行为不一致

### 方案三：只修保存到文件，微信要求用户自行二次分享

先保证用户能把 ZIP 保存到可见目录，再让用户从文件管理器里转发到微信。

**优点：**

- 实现风险最低

**缺点：**

- 不能满足“直接通过微信发送”的目标

### 结论

采用**方案一**。  
核心思路是：

- 备份 ZIP 仍然在应用内部生成
- 对外动作不再直接使用内部 ZIP URI
- 分享和保存都先经过 Android 外部可访问文件层

---

## 交互设计

### 导出入口

当前“导出”按钮不再直接拉起系统分享，而是改为：

1. 点击“导出”
2. 显示导出中状态
3. 调用 `BackupService.createBackup(entries)` 生成内部 ZIP
4. 导出成功后弹出底部操作面板

### 导出操作面板

新增 `BackupExportSheet`，包含以下选项：

- `发送到微信`
- `保存到文件`
- `更多方式`
- `取消`

### 选项行为

#### 发送到微信

- 先将内部 ZIP 转成 Android 可共享的 URI
- 再调起系统分享
- 由用户在系统分享面板中选择微信/文件传输助手

说明：本轮不做微信 SDK 直连；`发送到微信` 本质上是“以适合微信读取的方式调起系统分享”。如果设备上没有微信，或用户改选了其他 App，也仍然属于预期行为。

#### 保存到文件

- 先调起 Android 目录选择器
- 用户选择一个目录
- 再把 ZIP 写入目标目录
- 成功后提示具体文件名

#### 更多方式

- 与“发送到微信”共用同一个 Android 可共享 URI
- 继续调用系统分享面板
- 用于邮件、聊天软件、其他文件 App 等兜底场景

### 历史备份入口

备份历史中每条记录现有的分享图标不再直接 `Share.share(uri)`，而是：

- 点击图标
- 打开同一个 `BackupExportSheet`
- 对该历史 ZIP 执行相同的“微信 / 保存到文件 / 更多方式”流程

这样可以保证：

- 新导出的备份
- 历史备份

在 Android 上行为完全一致。

---

## 架构设计

### 1. `BackupService`

继续负责：

- 生成内部 ZIP 备份
- 列出历史备份
- 维护备份目录和保留策略

新增职责：

- 为现有 ZIP 生成 Android 可共享 URI
- 将现有 ZIP 保存到用户通过 SAF 选择的目录

建议新增方法：

```ts
static async getAndroidShareableUri(fileUri: string): Promise<string>
static async saveBackupToUserDirectory(fileUri: string, fileName: string): Promise<void>
```

行为约束：

- `getAndroidShareableUri()` 在 Android 上将内部 `file://` 转换为 `content://`
- 非 Android 平台先返回原 URI，为后续 iPhone 适配留接口
- `saveBackupToUserDirectory()` 仅负责目录授权、创建目标文件并写入内容

### 2. `BackupPage`

页面职责调整为：

- 创建 ZIP
- 控制导出中、保存中等页面状态
- 打开/关闭 `BackupExportSheet`
- 响应面板动作并调用 `BackupService`

不再负责：

- 直接把内部 ZIP 交给 `Share.share`
- 在页面组件内部处理 Android 目录授权细节

建议增加页面层状态：

```ts
type ExportTarget = { name: string; uri: string } | null;
const [exportTarget, setExportTarget] = useState<ExportTarget>(null);
const [showExportSheet, setShowExportSheet] = useState(false);
const [isSavingToFiles, setIsSavingToFiles] = useState(false);
```

### 3. `BackupExportSheet`

新增独立底部面板组件，职责单一：

- 展示选项
- 将点击事件回传父组件

建议 props：

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

该组件不直接依赖 `BackupService`，避免面板和文件系统耦合。

---

## Android 技术方案

### 微信 / 系统分享链路

对外分享前，不再直接使用应用私有目录 `file://` URI，而是先调用 Android 文件共享转换：

- 输入：内部 ZIP 的 `file://` URI
- 输出：Android 可被其他应用读取的 `content://` URI

然后再调用系统分享：

```ts
Share.share({ url: shareableUri, title: 'MemoryCapsule 备份' })
```

这一步的目标不是“强行只打开微信”，而是保证微信在系统分享面板中拿到一个可读的文件资源。

### 保存到文件链路

保存到文件不走 `Share.share()`，改为 Android Storage Access Framework：

1. 请求用户选择目标目录
2. 在所选目录中创建 ZIP 文件
3. 将内部 ZIP 内容复制进目标 SAF 文件

保存成功后提示：

- 文件已保存
- 文件名

同名文件处理策略：

- 默认不覆盖已有文件
- 若目标目录已存在同名文件，则自动追加序号后缀，例如：
  - `backup_xxx.zip`
  - `backup_xxx (1).zip`
  - `backup_xxx (2).zip`

用户取消目录授权时视为中止操作，不弹错误。

---

## 状态与错误处理

### 页面状态

需要明确区分：

- `isExporting`：正在生成 ZIP
- `showExportSheet`：导出面板显示中
- `isSavingToFiles`：正在写入用户目录

避免“导出中”和“保存中”混成一个布尔状态。

### 错误提示

#### 导出失败

提示：

- `导出失败`
- `无法生成备份文件，请重试`

#### 分享失败

提示：

- `分享失败`
- `无法分享该备份文件，请重试`

#### 保存到文件失败

提示：

- `保存失败`
- `无法将备份保存到所选目录，请重试`

#### 用户取消选择目录

- 不提示错误
- 仅关闭 loading / 保持当前页面

---

## 测试要点

### `BackupService`

- Android 分享 URI 转换成功时返回可共享 URI
- 目录授权成功时可将 ZIP 写入用户目录
- 用户取消目录授权时不抛误导性错误

### `BackupExportSheet`

- 四个选项正常渲染
- 点击各选项触发正确回调
- `取消` 正常关闭

### `BackupPage`

- 点击“导出”后，生成 ZIP 并打开导出面板
- 点击“发送到微信”时调用分享链路，而不是直接分享原始内部 URI
- 点击“保存到文件”时调用保存链路
- 历史备份点击分享图标后打开同一套导出面板，而不是继续直接 `Share.share(originalUri)`

### Android 人工验证

1. 导出当前备份后，选择“发送到微信”，微信不再提示“获取资源失败”
2. 导出当前备份后，选择“保存到文件”，用户可在所选目录看到 ZIP 文件
3. 历史备份点击分享图标后，同样可发送到微信
4. 历史备份点击分享图标后，同样可保存到文件
5. 用户取消目录选择时，页面不出现误报失败

---

## 不变部分

- ZIP 结构保持现有格式：`manifest.json`、`data.json`、`media/`
- 导入流程继续沿用当前 `pickAndParseBackup()` 与 `extractMediaFromZip()`
- 自动备份策略、备份保留策略不变
- iCloud 区块说明和导入 UI 不变

---

## 实施备注

本轮应优先保证 Android 真机上的“可用性”，而不是在 UI 上扩展更多导出入口。  
如果 Android 修复后 iPhone 需要专门优化，再基于 `BackupService` 这层平台抽象补充 iOS 分支，而不是把平台判断散落到 `BackupPage` 和面板组件中。
