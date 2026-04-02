# Image Viewer Lifecycle Regression Design

## 状态

- 当前状态：已确认修订设计，待按修订方案重做实现
- 用户确认日期：2026-03-27

## 背景

当前仓库里和图片查看器相关的自动化覆盖已经有一定基础：

- `image-viewer.actions.test.ts`：覆盖保存到相册、分享、权限拒绝等动作逻辑
- `image-viewer.action-sheet.test.tsx`：覆盖 action sheet 的显隐和按钮 wiring
- `image-viewer.navigation.test.tsx`：覆盖 Android back close 入口和 action sheet wiring
- `ImageViewer.shared-element.test.tsx`：覆盖查看器可见时的外壳渲染 smoke
- `EntryCard.test.tsx`：覆盖从卡片打开查看器时 URI 传递与多图入口差异

这些测试说明“局部能力存在”，但还没有锁住查看器作为一个完整交互单元的生命周期：

1. `visible=false` 时是否真的不渲染查看器根节点，缺少明确回归
2. `visible=true` 时是否稳定展示当前图片，没有页面级生命周期测试
3. 图片源切换时是否会正确跟随新的图片重渲染，没有锁住
4. 关闭动作触发后页面是否真正收回查看器外壳，没有完整闭环断言

这类问题的典型风险是：

- 查看器能打开，但关闭后残留遮罩或旧状态
- 多图切换后还显示旧图
- `visible` 状态切回 `false`，页面上仍留有 viewer shell

因此本轮要补的是 `ImageViewer` 组件壳层的生命周期回归，而不是继续往 action hook 或 EntryCard 入口上堆断言。

## 目标

为 `ImageViewer` 增加一组聚焦生命周期的 Jest 页面级回归，并满足以下目标：

1. 锁住 `visible=false` 时的空渲染契约
2. 锁住 `visible=true` 时查看器根节点与当前图片的展示
3. 锁住图片源变化时查看器对新图的更新行为
4. 锁住关闭动作触发后查看器从页面上消失的闭环
5. 保持现有 `actions / action-sheet / navigation` 套件职责不变，不把所有断言堆回旧文件

## 非目标

本次不覆盖以下范围：

- EntryCard 到 ImageViewer 的入口链路
- 缺图 / 坏图 / 修复提示链路
- 分享、保存到相册、权限请求等动作细节
- 手势缩放、拖拽关闭、共享元素过渡动画细节
- Android 真机返回键或前后台切换

这些内容已有现有测试，或应放到后续单独测试任务中处理。

## 范围与分层

本次固定为 `Jest-Page` 层，落点在 `ImageViewer` 组件壳层与 `ImageViewerScene` 装配之后的用户可见行为。

职责边界如下：

- `useImageViewerActions` 测试：继续负责动作逻辑
- `ImageViewerActionSheet` 测试：继续负责 action sheet 结构和按钮
- `image-viewer.navigation.test.tsx`：继续负责 Android back / onRequestClose wiring
- 新的 lifecycle 测试：负责查看器“显示、更新、关闭”的完整页面状态闭环

本轮不再新增 hook 级测试，因为当前缺口不在纯逻辑层，而在组件壳层行为层。

## 方案比较

### 方案 A：继续往 `image-viewer.navigation.test.tsx` 里加断言

优点：

- 文件少
- 改动路径短

缺点：

- 会把“navigation wiring”和“viewer lifecycle”两个职责继续混在一起
- 文件后续会越来越像杂项回归收纳箱

不采用。

### 方案 B：新建一个独立 lifecycle 测试文件

优点：

- 职责清楚
- 可以把“打开 / 切换 / 关闭”作为一个单独主题维护
- 和现有 `navigation / actions / action-sheet` 测试形成互补

缺点：

- 需要最小补一套 viewer shell mock 场景

这是本次采用的方案。

### 方案 C：直接去补 `EntryCard -> ImageViewer` 入口集成测试

优点：

- 更贴近用户真实点击入口

缺点：

- 与 `EntryCard.test.tsx` 已有覆盖重叠较多
- 容易把 viewer 生命周期问题混成入口问题

本轮不采用。

## 最终方案

### 1. 测试文件布局

本轮新增一个独立测试文件，放在：

- `app/src/components/__tests__/image/`

命名聚焦 `ImageViewer lifecycle`，只承接查看器壳层生命周期回归。

现有文件职责保持：

- `image-viewer.navigation.test.tsx`：保留 Android back 和 action sheet wiring
- `image-viewer.actions.test.ts`：保留保存 / 分享逻辑
- `image-viewer.action-sheet.test.tsx`：保留 action sheet 结构

### 2. 测试策略

本轮测试对象是 `ImageViewer` 组件本身，且 `IVL-02` 到 `IVL-04` 必须直连真实 `useImageViewerController` 主路径，不允许再用 controller mock 人工注入 `phase`、`handleRequestClose` 或其他生命周期结果。

允许的 mock 范围：

- `react-native-gesture-handler`
- `react-native-reanimated`
- `safe-area-context`
- `@/src/utils/logger`

不允许的做法：

- 对 `useImageViewerController` 做整体验证路径上的 mock
- 为了测试去改写 `ImageViewer` 的业务逻辑
- 把整个 `ImageViewerScene` 替换成失真过大的空壳
- 为测试添加大段与生产代码无关的分支

如果需要稳定断言 viewer 根节点或当前图片，优先复用已有：

- `image-viewer-root`

只有在当前组件没有稳定图片节点时，才补最小 testID。

补充约束：

- `IVL-02` 和 `IVL-03` 必须证明 `visible=true` 后真实 controller 能把 viewer 推进到可见主图态，而不是只验证“给定 `phase='open'` 时 scene 会渲染”
- `IVL-04` 必须验证 `Modal -> controller.handleRequestClose -> onClose -> visible=false rerender` 这条真实接线，不得把 `handleRequestClose` 和 `onClose` 简化成同一个 mock 函数对象
- 对 hidden/close 的断言可以读取 `Modal.props.visible` 作为补充证据，但不要把测试核心建立在 RN/Jest 对 `Modal visible=false` 是否保留子树的内部语义上

### 3. 首批回归用例

本轮首批锁定 4 条行为。

#### `IVL-01` 不可见时不渲染 viewer shell

- 前置条件：`visible=false`
- 操作步骤：渲染 `ImageViewer`
- 预期结果：页面上不存在 `image-viewer-root`
- 风险点：关闭后查看器外壳残留在页面树中

#### `IVL-02` 可见时渲染 viewer shell 和当前图片

- 前置条件：`visible=true`，传入一个图片 URI
- 操作步骤：渲染 `ImageViewer`
- 预期结果：存在 viewer 根节点；当前图片节点对应传入 URI
- 风险点：viewer 打开了但内部没有跟当前图片源对齐

#### `IVL-03` 图片源变化时跟随新图更新

- 前置条件：初始可见，传入第一张图片
- 操作步骤：`rerender` 为第二张图片
- 预期结果：viewer 仍存在，且当前展示图片已切到第二张 URI
- 风险点：多图切换或重新打开时残留旧图状态

#### `IVL-04` 关闭后 viewer shell 消失

- 前置条件：初始可见
- 操作步骤：通过 `onRequestClose` 或关闭回调触发关闭，再以 `visible=false` rerender
- 预期结果：viewer 根节点消失
- 风险点：关闭动作只触发回调，但页面树未真正收回

### 4. 允许的最小可测性增强

如果现有组件无法稳定断言“当前图片 URI”，允许做一处最小增强：

- 在 `ImageViewerScene` 的主图片节点上补一个稳定 `testID`
- 或补一个仅用于读取当前图片 URI 的轻量文本/属性锚点

约束：

- 不改变布局和交互语义
- 不引入测试专用业务分支
- 不扩展成手势或动画调试接口

### 5. 实现顺序

实现阶段按 TDD 执行，顺序固定为：

1. 先写 `IVL-01`
2. 跑失败，确认失败原因正确
3. 做最小实现或最小可测性增强
4. 跑绿
5. 再写 `IVL-02`
6. 重复到 `IVL-04`

这样可以确保每一步失败点单一，不会一口气把 viewer mock 改成大工程。

## 验证方案

实现阶段的验证顺序固定为：

1. 每新增一条 lifecycle 用例，先单独运行新测试文件
2. 新文件全绿后，回归：
   - `image-viewer.navigation.test.tsx`
   - `image-viewer.actions.test.ts`
   - `image-viewer.action-sheet.test.tsx`
3. 最后运行前端全量 Jest

本轮完成时至少需要有以下验证证据：

- 新增 lifecycle 文件通过
- 现有 viewer 三组测试保持通过
- `cd app && pnpm test --runInBand` 通过

## 风险与取舍

本轮核心取舍是：

- 优先补查看器壳层生命周期，而不是继续扩入口集成
- 优先保持测试文件职责清晰，而不是把一切都堆进 `navigation` 文件
- 优先做最小 testID 增强，而不是对 viewer 组件做结构性改造

这意味着本轮不会覆盖所有图片查看器相关风险，但会把“打开 / 更新 / 关闭”这条最容易静默回归的主链路锁住。为了确保这条主链路真正被锁住，本轮允许接受少量环境 mock，但不再接受 controller 层的 shortcut mock。

## 后续扩展

如果本轮完成后边界仍然清晰，下一批可以继续沿 viewer 主题扩展：

1. `EntryCard -> ImageViewer` 多图入口闭环
2. 缺图 / 坏图下的 viewer 退化行为
3. 修复提示和 viewer 状态联动
4. 手势关闭和动画阶段切换

这些都不在本轮实现范围内，只作为后续方向保留。
