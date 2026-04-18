# 文本卡片长按复制设计

## Context

当前文本记录卡片复用 [`EntryCard.tsx`](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/EntryCard.tsx) 组件，核心交互收敛在 [`useEntryCardController.ts`](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/entry-card/useEntryCardController.ts)。现有代码里，`onLongPress` 会触发 `handleLongPress()`，其效果是把文本卡片切到展开态；对应测试也已经覆盖这条行为链路。

用户这次确认的目标更直接：

- 长按文本卡片时，直接复制 `entry.content`
- 复制成功后给一个轻提示
- 只复制正文，不拼接时间、标签
- 首页时间线和日历文本卡片都生效
- 短按查看详情行为保持不变

补充事实校验：

- 当前 `app/package.json` 没有剪贴板依赖，需要新增 Expo 官方剪贴板包
- 当前统一反馈入口 [`showErrorFeedback.ts`](/Users/cooper/Documents/code/MemoryCapsule/app/src/services/showErrorFeedback.ts) 挂到 [`FeedbackHost.tsx`](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/FeedbackHost.tsx)，底层是阻塞式 `Modal`，不符合“轻提示”体验

因此，这次设计不能简单把“复制成功”塞进现有错误反馈 Modal；否则交互会比需求更重。

## 目标

- 为所有文本卡片增加长按复制正文能力
- 保持图片卡片、语音卡片现有行为不变
- 保持文本卡片短按查看详情不变
- 提供非阻塞、短时展示的成功反馈
- 在失败场景下沿用现有错误反馈能力

## 非目标

- 不给图片卡片、语音卡片增加复制能力
- 不改文本详情页复制能力
- 不修改 ActionSheet 菜单项
- 不做通用通知中心或复杂消息系统
- 不顺带重做卡片展开/折叠体系，只处理文本卡片长按入口

## 方案对比

### 方案 1：在 `EntryCard` 控制器里直接复制，成功走现有 `showErrorFeedback`

优点：

- 改动最小
- 复用现有反馈入口

缺点：

- `FeedbackHost` 是阻塞式 Modal，不是轻提示
- 用户每次长按复制都要额外点确认，体验偏重

结论：不采用。

### 方案 2：在 `EntryCard` 控制器里直接复制，同时新增最小短提示通道

优点：

- 命中“长按卡片直接复制”的目标
- 复制成功是非阻塞提示，体验正确
- 失败仍复用现有错误反馈，边界清晰
- 改动范围仍可控制在卡片控制器和一个很小的反馈 host 内

缺点：

- 需要新增一个非常轻量的成功提示通道
- 需要新增剪贴板依赖

结论：采用。

### 方案 3：抽象通用“可复制内容卡片”框架

优点：

- 长期复用性最好

缺点：

- 对本需求明显过度设计
- 需要提前抽象图片/语音/其他内容的复制边界

结论：不采用。

## 最终设计

采用方案 2：

- 文本卡片长按时，直接复制 `entry.content`
- 复制成功后，通过新的最小非阻塞短提示 host 显示“已复制”
- 复制失败时，沿用 `showErrorFeedback`，提示“复制失败，请重试”
- 非文本卡片长按行为不新增复制逻辑
- 文本卡片短按查看详情不变

## 交互设计

### 行为矩阵

| 卡片类型 | 短按 | 长按 |
| --- | --- | --- |
| `text` | 保持查看详情 | 复制 `entry.content`，显示“已复制”短提示 |
| `photo` | 保持现有图片查看行为 | 保持现状，不新增复制逻辑 |
| `voice` | 保持现有播放行为 | 保持现状，不新增复制逻辑 |

### 文本卡片长按后的体验

1. 用户长按文本卡片
2. 卡片控制器判断 `entry.type === 'text'`
3. 调用剪贴板 API 写入 `entry.content`
4. 成功时显示非阻塞提示“已复制”
5. 不进入详情页
6. 不弹 ActionSheet
7. 不再依赖文本卡片原本的“长按展开”行为

### 关于现有“长按展开”

代码当前把长按绑定到 `setIsExpanded(true)`，但本次需求的优先级更高，且用户明确要“长按复制”。因此文本卡片的长按入口将从“展开”切换为“复制正文”。

为了保持边界稳定：

- 仅文本卡片迁移长按语义
- 文本卡片不再显示“点击展开更多”提示文案，避免复制语义下的误导
- 这次优先选择最小正确路径：文本卡片不再通过长按承担展开入口

## 实现设计

### 1. 剪贴板能力

新增 Expo 官方依赖：

- `expo-clipboard`

用途：

- 在文本卡片长按时调用 `Clipboard.setStringAsync(entry.content)`

约束：

- 不引入第三方非 Expo 剪贴板库
- 不额外封装复杂复制 SDK，只加一个薄服务或直接在控制器中调用

### 2. 成功反馈能力

现有 `FeedbackHost` 是阻塞式 Modal，不适合作为“已复制”提示。为满足需求，引入一条最小的成功短提示通道：

- 新增轻量状态：`app/src/store/transientFeedbackStore.ts`
- 新增轻量 host：`app/src/components/TransientFeedbackHost.tsx`
- 在根布局 [`app/_layout.tsx`](/Users/cooper/Documents/code/MemoryCapsule/app/app/_layout.tsx) 挂载该 host，和 `FeedbackHost` 并列
- 新增极薄服务：`app/src/services/showTransientFeedback.ts`

行为约束：

- 仅支持单条纯文本消息
- 自动消失，无需用户确认
- 不支持复杂按钮、详情列表或多种布局
- 先服务这次“已复制”场景，不扩成通用消息中心

建议展示策略：

- 文案：`已复制`
- 位置：屏幕底部安全区域上方或底部栏上方
- 持续时间：约 1.2s 到 1.8s

### 3. 失败反馈能力

复制失败仍复用现有错误反馈通道：

- 服务：[`showErrorFeedback.ts`](/Users/cooper/Documents/code/MemoryCapsule/app/src/services/showErrorFeedback.ts)
- Host：[`FeedbackHost.tsx`](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/FeedbackHost.tsx)

建议文案：

- 标题：`复制失败`
- 文案：`复制文本失败，请重试`

失败处理保留阻塞式确认是合理的，因为失败属于异常路径，不要求轻提示体验。

### 4. `EntryCard` 控制器改动

核心落点放在 [`useEntryCardController.ts`](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/entry-card/useEntryCardController.ts)。

设计调整：

- `handleLongPress` 改为按 `entry.type` 分支
- `text` 类型：
  - 调用复制逻辑
  - 成功后触发短提示
  - 失败后触发错误反馈
- 非 `text` 类型：
  - 保持当前最小行为，不额外引入复制

推荐形态：

```ts
const handleLongPress = useCallback(async () => {
  if (entry.type !== 'text') {
    return;
  }

  try {
    await Clipboard.setStringAsync(entry.content);
    showTransientFeedback('已复制');
  } catch (error) {
    showErrorFeedback({
      title: '复制失败',
      message: '复制文本失败，请重试',
      actions: [{ label: '知道了', role: 'primary' }],
    });
  }
}, [entry.content, entry.type]);
```

说明：

- 这里故意不复用当前的 `setIsExpanded(true)` 路径
- 文本卡片长按复制后不改变本卡片展开状态

### 5. `EntryCard` 组件层

[`EntryCard.tsx`](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/EntryCard.tsx) 继续保留统一的 `onLongPress={handleLongPress}`，不调整事件绑定位置。

这样能保证：

- 首页时间线卡片生效
- 日历里的文本卡片也自动生效
- 不需要在多个上层列表组件重复接线

## 文件改动范围

| 文件 | 改动 |
| --- | --- |
| `app/package.json` | 新增 `expo-clipboard` 依赖 |
| `app/app/_layout.tsx` | 挂载新的短提示 host |
| `app/src/components/EntryCard.tsx` | 只维持现有长按入口，不做复杂改动 |
| `app/src/components/entry-card/useEntryCardController.ts` | 把文本卡片长按从“展开”改为“复制 + 提示/失败反馈” |
| `app/src/components/TransientFeedbackHost.tsx` | 新增最小短提示 host |
| `app/src/store/transientFeedbackStore.ts` | 新增短提示状态 |
| `app/src/services/showTransientFeedback.ts` | 新增短提示服务 |
| `app/src/components/__tests__/EntryCard.test.tsx` | 更新长按文本卡片测试 |
| `app/app/__tests__/_layout.photo-upload.test.tsx` | 如根布局 host 数量断言受影响，则同步更新 |

## 测试设计

### 单元测试

优先更新 [`EntryCard.test.tsx`](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/__tests__/EntryCard.test.tsx)：

- 文本卡片长按时调用剪贴板复制
- 文本卡片长按成功时触发短提示
- 文本卡片长按失败时触发 `showErrorFeedback`
- 文本卡片短按查看详情不回归
- 图片卡片、语音卡片长按不触发文本复制

现有测试里有两条与长按展开相关的断言，需要替换：

- “expands card on long press instead of showing action sheet”
- “does not show action sheet options on long press”

替换方向：

- 文本卡片长按改为断言复制行为
- 如非文本卡片仍保持“长按无 ActionSheet”，则保留对应断言，但不再将“展开”视为文本卡片的预期结果

### Host 测试

为新的短提示 host 增补最小测试：

- 有请求时渲染文案
- 超时后自动消失
- 连续触发时以后一次消息覆盖前一次消息

### 验证命令

实现阶段至少运行：

```bash
cd app
pnpm test --runInBand --runTestsByPath src/components/__tests__/EntryCard.test.tsx app/__tests__/_layout.photo-upload.test.tsx
pnpm run lint
pnpm run typecheck
```

如果新增了短提示 host 独立测试，再追加对应测试文件。

## 风险与处理

### 风险 1：文本卡片长按从“展开”切到“复制”，可能影响现有隐藏交互

处理：

- 以这次需求为准，明确更新测试
- 仅改变 `text` 类型长按语义，不扩散到其他卡片

### 风险 2：轻提示实现过度抽象

处理：

- 只支持单条短文本自动消失
- 不做按钮、队列、富文本、详情视图

### 风险 3：根布局新增 host 可能影响现有布局测试

处理：

- 只在根布局中按现有 host 模式并列挂载
- 如果测试 mock 数量变化，做最小同步

## 验收标准

- 所有文本卡片都支持长按复制正文
- 复制内容仅为 `entry.content`
- 复制成功显示非阻塞短提示“已复制”
- 复制失败显示现有错误反馈
- 图片卡片、语音卡片不回归
- 文本卡片短按查看详情不回归
- 相关测试、lint、typecheck 通过
