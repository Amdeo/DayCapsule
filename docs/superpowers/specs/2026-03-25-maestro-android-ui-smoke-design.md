# Maestro Android UI Smoke Tests Design

## 背景

当前 app 已经有较完整的组件级 Jest 测试，但缺少真实运行时的 UI 自动化测试。对于侧边栏导航、设置页入口和标签管理入口这类跨页面交互，单元测试很难覆盖 Android 端的真实页面切换、可见性和选择器稳定性。

项目当前使用 `expo run:android` 启动 Android 原生构建，而不是 Expo Go。现有代码中已经有一批可复用的 `testID`，例如：

- `searchbar-menu-button`
- `sidebar-shell`
- `settings-page-root`
- `stats-page-root`
- `tag-management-root`
- `settings-backend-card`
- `settings-backend-input`

这意味着首批 Maestro 用例可以优先围绕这些稳定锚点构建，不需要先做大规模可测性改造。

## 目标

为当前 app 增加一组可在 Android 模拟器上执行的 Maestro UI 冒烟用例，并满足以下目标：

1. 使用 `launchApp` 驱动已编译安装的 Android 应用
2. 首批覆盖高稳定、低外部依赖的跨页面导航路径
3. 复用现有 `testID`，仅在缺少稳定锚点的位置补最少量 `testID`
4. 支持单条 flow 执行和目录级批量执行
5. 提供简洁的运行文档，便于后续扩展第二批用例

## 非目标

本次不覆盖以下范围：

- 录音、拍照、图片选择等受系统权限影响的流程
- 依赖真实网络连通性的“测试后端连接成功/失败”断言
- 复杂数据准备、mock 服务或预置数据库
- iOS 专用 flow
- 将 Maestro 集成进 CI

## 首批覆盖范围

首批 smoke 流程聚焦“能稳定证明 app 关键入口没有回归”的场景：

### 场景 1：首页进入统计页

流程：

1. 启动 app
2. 断言首页菜单按钮可见
3. 打开侧边栏
4. 点击“统计”
5. 断言统计页根节点可见
6. 返回首页

### 场景 2：首页进入设置页

流程：

1. 启动 app
2. 打开侧边栏
3. 点击“设置”
4. 断言设置页根节点可见
5. 返回首页

### 场景 3：设置页进入预制标签管理

流程：

1. 启动 app
2. 打开侧边栏并进入设置页
3. 点击“预制标签管理”
4. 断言标签管理页根节点可见
5. 返回设置页
6. 再返回首页

### 场景 4：设置页后端卡片可见

流程：

1. 启动 app
2. 进入设置页
3. 断言后端卡片和后端输入框可见
4. 不执行网络测试，仅验证入口存在且可见

## 方案比较

### 方案 A：直接用文本选择器写用例

优点：

- 实现最快
- 不需要改动现有组件

缺点：

- 侧边栏菜单项的文案选择在后续文案调整时容易脆弱
- 某些页面存在重复文案时，选择器歧义更高

不采用。

### 方案 B：复用现有 `testID`，缺失处补少量稳定锚点

优点：

- 稳定性最好
- 对现有业务逻辑零侵入
- 便于后续继续扩展 smoke 和 regression flows

这是本次采用的方案。

### 方案 C：直接覆盖核心记录流

优点：

- 更贴近核心业务

缺点：

- 依赖当前首页数据状态、编辑器初始状态和潜在动画时序
- 作为首批 Maestro 接入成本偏高

暂不采用，放到第二批。

## 交互与选择器设计

### 选择器优先级

1. 优先使用 `id`，对应 React Native `testID`
2. 仅在无稳定 `id` 时回退到文本选择器
3. 避免坐标点击

### 需要补充的稳定锚点

当前侧边栏容器有 `sidebar-shell`，但菜单项本身没有稳定 `testID`。本次补充：

- `sidebar-menu-stats`
- `sidebar-menu-settings`
- `sidebar-menu-tags`

如设置页里的“预制标签管理”按钮没有足够稳定的选择器，则补充：

- `settings-open-tag-management`

补点原则：

- 只补测试锚点
- 不改页面逻辑
- 不改交互语义
- 不引入平台分支

## 文件结构

建议新增以下目录：

```text
app/.maestro/
  README.md
  common/
    open-sidebar.yaml
    open-settings.yaml
  flows/
    smoke/
      home-to-stats.yaml
      home-to-settings.yaml
      settings-to-tag-management.yaml
      settings-backend-card-visible.yaml
```

说明：

- `common/open-sidebar.yaml` 只负责从首页打开侧边栏
- `common/open-settings.yaml` 在 `open-sidebar` 基础上进入设置页
- 各 smoke flow 保持扁平，避免公共步骤过深导致排障困难

## Maestro 流程设计

### 启动方式

使用 `launchApp` 启动已安装到 Android 模拟器的原生应用，不采用 Expo Go 的 `openLink` 方案。

### 稳定性策略

- 在每个页面切换后使用 `assertVisible`
- 必要时使用短时间 `extendedWaitUntil` 等待目标节点出现
- 不在首批用例中处理权限弹窗或网络错误弹窗
- 每条 flow 独立可运行，避免顺序依赖

### 执行方式

支持：

- 单条执行：`maestro test app/.maestro/flows/smoke/home-to-settings.yaml`
- 目录执行：`maestro test app/.maestro/flows/smoke`

## 代码改动边界

本次代码改动只允许落在两类文件中：

1. UI 测试资产
   - `app/.maestro/**`
2. 可测性增强
   - 与侧边栏菜单项或设置页按钮相关的少量 `testID` 补充

不在本次范围内：

- 业务逻辑重构
- 状态管理修改
- 页面布局调整

## 验证方案

实现阶段采用以下验证顺序：

1. 先补测试锚点
2. 编写首条 smoke flow
3. 在 Android 模拟器上单条运行并修正选择器/等待时序
4. 补齐剩余 smoke flow
5. 批量运行 `app/.maestro/flows/smoke`
6. 运行与改动组件相关的 Jest 测试，确认补 `testID` 未引入回归

## 后续扩展

第二批可以按价值递增扩展：

1. 新建文本记录并保存
2. 进入记录详情页并返回
3. 设置页后端地址输入与保存按钮状态
4. 标签管理页具体交互

首批目标是先把 Android 端 Maestro 基建和稳定 smoke 流水线建立起来。
