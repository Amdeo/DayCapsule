# 设计文档：备份导出面板收敛为仅保存到文件

**日期：** 2026-03-17  
**状态：** 已批准  
**影响范围：** `BackupExportSheet`、`BackupPage`

---

## 背景

上一轮 Android 备份导出修复中，导出成功后会弹出 `BackupExportSheet`，提供：

- `发送到微信`
- `保存到文件`
- `更多方式`
- `取消`

但当前需求已经收敛，不再需要任何“分享”语义。用户希望：

- 去掉 `发送到微信`
- 去掉 `更多方式`
- 保留底部面板
- 历史备份右侧图标保留，但点击后仍只进入同一个底部面板

这意味着导出动作从“导出后选择分享或保存”收敛为“导出后只支持保存到文件”。

---

## 目标

将当前导出面板收敛为仅保留：

- `保存到文件`
- `取消`

并保持以下行为一致：

1. 点击顶部“导出”按钮，仍先生成 ZIP，再弹出底部面板
2. 点击历史备份右侧图标，仍打开同一个底部面板
3. 点击 `保存到文件`，继续调用现有 `BackupService.saveBackupToUserDirectory()`

---

## 非目标

本轮不做以下事项：

- 不改变 `BackupService` 的 Android 保存能力
- 不修改导入逻辑
- 不改历史备份数据结构
- 不新增其它导出方式
- 不修改 Android Storage Access Framework 的保存实现

---

## 方案对比

### 方案一：保留面板，但只保留保存动作（推荐）

`BackupExportSheet` 继续存在，但只保留一个主选项：

- `保存到文件`
- `取消`

顶部“导出”和历史备份右侧图标都继续打开同一个面板。

**优点：**

- 改动最小
- 现有“生成 ZIP -> 选动作”流程不需要重写
- 以后如果要再加其它导出方式，也有明确插槽

**缺点：**

- 面板只剩一个主动作，交互层级略显多一层

### 方案二：取消面板，直接进入保存到文件

点击“导出”或历史备份图标后，直接进入目录选择和保存流程。

**优点：**

- 路径最短

**缺点：**

- 去掉了一层确认
- 当前历史图标与顶部导出按钮的点击语义会显得过于直接
- 后续若再加导出方式，需要重新引入面板

### 结论

采用**方案一**。  
即：保留面板，但只保留 `保存到文件` 和 `取消`。

---

## 交互设计

### 顶部导出按钮

1. 用户点击 `导出`
2. 页面生成 ZIP
3. 导出成功后打开底部面板
4. 面板中只显示：
   - `保存到文件`
   - `取消`
5. 点击 `保存到文件` 后，继续进入 Android 保存流程

### 历史备份右侧图标

1. 用户点击右侧图标
2. 打开同一个底部面板
3. 面板中仍只显示：
   - `保存到文件`
   - `取消`

注意：

- 右侧图标可以先保留现状，不在本轮改图标语义
- 图标的行为不再是“分享”，而是“为该备份打开保存面板”

---

## 组件设计

### `BackupExportSheet`

当前 props 需要收缩为：

```ts
interface BackupExportSheetProps {
  visible: boolean;
  fileName: string;
  onSaveToFiles: () => void;
  onClose: () => void;
}
```

面板内容调整为：

- 标题：`导出备份`
- 副标题：当前文件名
- 主按钮：`保存到文件`
- 次按钮：`取消`

需要删除：

- `onWechatShare`
- `onMoreShare`
- 对应按钮和 `testID`

### `BackupPage`

页面保留：

- `exportTarget`
- `showExportSheet`
- `handleOpenExportSheet()`
- `handleCloseExportSheet()`
- `handleSaveToFiles()`

页面删除：

- `Share` import
- `handleSystemShare()`
- 与分享相关的错误提示

面板接入改为：

```tsx
<BackupExportSheet
  visible={showExportSheet}
  fileName={exportTarget?.name ?? ''}
  onSaveToFiles={handleSaveToFiles}
  onClose={handleCloseExportSheet}
/>
```

---

## 测试要点

### `BackupExportSheet`

- 面板可见时只渲染：
  - `保存到文件`
  - `取消`
- 不再渲染：
  - `发送到微信`
  - `更多方式`
- 点击 `保存到文件` 触发 `onSaveToFiles`
- 点击 `取消` 触发 `onClose`

### `BackupPage`

- 点击顶部 `导出` 后，成功打开底部面板
- 点击历史备份右侧图标后，成功打开同一个底部面板
- 页面不再调用 `Share.share`
- 点击 `保存到文件` 后，仍调用 `BackupService.saveBackupToUserDirectory()`
- 保存成功提示仍正常显示

---

## 不变部分

- `BackupService.saveBackupToUserDirectory()` 的实现不变
- Android 目录选择、同名文件递增和保存逻辑不变
- 导出 ZIP 的生成逻辑不变
- 历史备份列表展示和排序不变

---

## 实施备注

这次本质上是一个 UI 和页面流程的收缩，不是能力重写。  
执行时应优先删除分享相关分支，而不是在保留旧 props/旧回调的前提下“空置不用”，避免后续代码残留造成误解。
