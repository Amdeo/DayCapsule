# Maestro Android Cloud Sync Tests Design

## 背景

当前项目已经补齐了云端媒体完整性校验、异常媒体检测、修复提示和修复入口，也已经有较完整的 Jest 级测试覆盖以下能力：

- 云端同步状态摘要
- 云端媒体下载后校验
- repair issue 收集与持久化
- 状态弹窗里的异常媒体/可修复媒体展示
- 修复提示与修复确认流程

但这些测试仍停留在逻辑层和组件层，缺少 Android 真实运行时的端到端验证。尤其是以下链路，只靠 Jest 还不够：

1. 用户从设置页进入“同步状态”
2. Android 端真实弹窗与页面切换是否可用
3. 可修复异常媒体出现后，是否能通过 UI 重新拉起修复提示
4. 真实云端 happy path 与本地注入异常场景是否都能稳定回归

项目当前已有一份 Android Maestro smoke 设计，但还没有真正落地 `.maestro` 目录和 flow 文件。因此这次工作应在现有 smoke 设计基础上，补一组专门面向云同步/媒体修复的 Android Maestro flows。

## 目标

为 Android 模拟器增加一组围绕云同步与异常媒体修复的 Maestro UI flows，并满足以下目标：

1. 真实后端验证核心云同步 happy path
2. 通过测试注入稳定覆盖异常媒体与修复相关场景
3. 所有 flow 可单独运行，也可按目录批量执行
4. 优先使用稳定 `testID`，避免依赖文案和坐标点击
5. 将异常场景与真实后端解耦，避免脆弱数据准备

## 非目标

本次不覆盖以下范围：

- iOS 平台 Maestro flows
- 云端冲突副本的完整回归
- 同步失败后的重试矩阵
- 录音、拍照、相册权限链路
- CI 集成
- 真实后端上构造坏媒体文件

这些内容可以放到后续 P1/P2 批次。

## 测试策略

本次采用混合模式：

### 方案 A：全部走真实后端

优点：

- 最接近真实用户行为
- 不需要新增测试入口

缺点：

- 坏媒体、repairable、repair pending 等异常场景很难稳定复现
- 流程依赖测试数据和后端状态，失败时难以定位
- 自动化脆弱，维护成本高

不采用。

### 方案 B：全部走本地测试注入

优点：

- 非常稳定
- 执行速度快
- 异常场景覆盖最容易

缺点：

- 对真实云同步 happy path 信心不足
- 无法证明 Android 运行时与真实后端之间的链路可用

不采用。

### 方案 C：真实后端 happy path + 本地测试注入异常场景

优点：

- 真实后端链路有覆盖
- 异常媒体/修复类场景可稳定复现
- 覆盖率、稳定性和维护成本最平衡

缺点：

- 需要额外增加一个仅测试可见的场景注入入口

这是本次采用的方案。

## P0 场景矩阵

首批 Android Maestro flows 先覆盖 5 条 P0 场景：

### 场景 1：`happy-path-restore`

类型：真实后端

目标：

- 验证用户在 Android 端可以完成云端恢复
- 验证恢复后能从 UI 看到同步状态摘要

前置条件：

- 测试账号已登录
- 云端已有至少 1 条包含照片的记录

断言重点：

- “云同步完成”或“云同步部分完成”
- “本地数据”“云端数据”“媒体同步状态”区块存在

### 场景 2：`status-from-settings`

类型：真实后端

目标：

- 验证设置页里的“同步状态”入口可达
- 验证状态弹窗基础统计信息存在

前置条件：

- 测试账号已登录

断言重点：

- “待同步条数”
- “待上传媒体”
- “最近媒体错误”

### 场景 3：`suspect-media`

类型：测试注入

目标：

- 验证异常媒体和可修复媒体在状态弹窗中能正确显示

前置条件：

- 通过测试入口注入：
  - `status = partial`
  - `suspect = 1`
  - `repairable = 1`
  - 一条 `repair_prompt_required` issue

断言重点：

- “异常媒体数 1”
- “可修复媒体数 1”
- “修复异常媒体”按钮存在

### 场景 4：`repair-confirm`

类型：测试注入

目标：

- 验证修复提示可以被拉起
- 验证点击“立即修复”后 UI 状态发生变化

前置条件：

- 注入一条可修复 issue

断言重点：

- 出现“发现云端媒体异常”
- 点击“立即修复”后提示关闭
- 再进入同步状态时，展示 `repair_pending` 对应状态或可修复计数下降

### 场景 5：`repair-later`

类型：测试注入

目标：

- 验证点击“稍后处理”后，修复入口仍能从状态弹窗再次拉起

前置条件：

- 注入一条可修复 issue

断言重点：

- 修复提示出现
- 点击“稍后处理”后提示关闭
- 进入“同步状态”
- 点击“修复异常媒体”后提示可再次出现

## 测试注入入口设计

为了让异常场景稳定复现，本次会增加一个仅测试环境可见的设置页区域：`E2E Sync Lab`。

### 显示策略

不直接依赖 `__DEV__`，而是采用显式环境开关，例如：

```text
EXPO_PUBLIC_E2E_SYNC_LAB=1
```

只有开关开启时，设置页里才显示该区域。正式用户不会看到。

### 入口位置

放在设置页内，而不是深链、手势或隐藏入口。原因：

- Maestro 最稳定的是显式按钮和 `testID`
- 不需要额外解释如何进入
- 更利于后续扩展更多同步异常场景

### 提供的测试动作

测试区域提供原子按钮，而不是复杂表单：

- `注入 suspect + repairable`
- `注入 repair_pending`
- `清空同步测试数据`
- `显示修复提示`

### 稳定锚点

这些按钮需要稳定 `testID`：

- `e2e-sync-lab-root`
- `e2e-sync-fixture-suspect`
- `e2e-sync-fixture-repair-pending`
- `e2e-sync-fixture-clear`
- `e2e-sync-show-repair-prompt`

### 注入范围

测试注入只改本地状态，不依赖真实后端：

- `syncStore.lastMediaValidationSummary`
- `mediaRepairStore.issues`
- 必要时增加 1 条本地 photo entry，保证状态页或时间线有上下文

`clear` 动作需要清空上述状态，并回到默认同步摘要。

## 交互与选择器设计

选择器优先级：

1. 优先使用 `id`，对应 React Native `testID`
2. 无稳定 `id` 时再退回文本选择器
3. 不使用坐标点击

除测试注入入口外，本次还需要为云同步路径补充稳定锚点，例如：

- 设置页里的“同步状态”入口
- `E2E Sync Lab` 根节点
- 可能需要补的“恢复/初始化同步”相关按钮

若某些现有按钮已经可以用稳定 `testID` 命中，则不重复加点。

## 文件结构

建议目录如下：

```text
app/.maestro/
  README.md
  env/
    android-dev.yaml
  common/
    launch-app.yaml
    open-sidebar.yaml
    open-settings.yaml
    open-sync-status.yaml
    open-e2e-sync-lab.yaml
    clear-e2e-sync-fixture.yaml
  flows/
    smoke/
      ...
    cloud-sync/
      happy-path-restore.yaml
      status-from-settings.yaml
      suspect-media.yaml
      repair-confirm.yaml
      repair-later.yaml
```

说明：

- 沿用现有 Maestro smoke 目录设计，不另起体系
- `common/` 放可复用步骤
- `flows/cloud-sync/` 放本次专项云同步用例
- 真实后端 flow 与测试注入 flow 共用同一套公共子 flow

## Flow 结构设计

### 公共子 flow

#### `launch-app.yaml`

职责：

- 启动 Android app
- 确认首页基础锚点出现

#### `open-sidebar.yaml`

职责：

- 从首页打开侧边栏

#### `open-settings.yaml`

职责：

- 复用 `open-sidebar`
- 进入设置页

#### `open-sync-status.yaml`

职责：

- 从设置页点击“同步状态”
- 等待状态弹窗出现

#### `open-e2e-sync-lab.yaml`

职责：

- 从设置页滚动到 `E2E Sync Lab`
- 断言测试区域可见

#### `clear-e2e-sync-fixture.yaml`

职责：

- 点击清理按钮
- 等待测试状态恢复

### 场景 flow

每条 flow 都应满足以下规则：

- 显式设置 `appId`
- 从 `launch-app.yaml` 起步
- 页面切换点优先 `assertVisible`
- 只在必要处补 `extendedWaitUntil`
- 结束前清理测试注入状态，避免串场

## 验收标准

实现完成后，需要满足：

1. 5 条 flow 单独执行全部通过
2. `maestro test app/.maestro/flows/cloud-sync` 批量执行通过
3. Android 模拟器冷启动后重复执行仍通过
4. README 清晰说明：
   - Android 启动前提
   - 真实后端场景所需账号/数据
   - 如何开启 `E2E Sync Lab`
   - 单条与批量执行命令
   - 哪些 flow 会改本地状态以及如何清理

## 代码改动边界

允许的改动：

1. `app/.maestro/**`
2. 设置页和同步状态路径上的少量可测性增强
3. `E2E Sync Lab` 及其注入逻辑

不在本次范围内：

- 广泛重构云同步业务逻辑
- 新增后端测试接口
- 改造正式用户同步流程
- 把冲突和失败重试一并做完

## 后续扩展

P1 可以继续补：

1. 冲突副本可视化回归
2. 同步失败后重试
3. 时间线右上角同步状态按钮入口
4. 修复完成后的下一轮真实同步验证

P0 的目标不是做完整云同步矩阵，而是先把 Android 端 Maestro 对云同步状态和异常媒体修复链路建立起来。
