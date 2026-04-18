# 文本卡片复制提示锚定设计

**状态：** 已实现

**评审记录：**

- 2026-04-19：用户确认“已复制”提示不再固定全局位置，而是优先显示在被长按文本卡片上方；上方空间不足时自动翻到卡片下方
- 2026-04-19：实现已完成（Task 1 commits：`fe82c75`、`59c44ab`；Task 2 commit：`ee88449476ce40a4ffe7eade4c1fa4979d483e72`），并已运行 `cd app && rtk pnpm test --runInBand --runTestsByPath src/components/__tests__/TransientFeedbackHost.test.tsx src/components/__tests__/EntryCard.test.tsx`（2 个测试套件、79 个用例全部通过）、`cd app && rtk pnpm run lint`（通过）、`cd app && rtk pnpm run typecheck`（通过）

## Context

上一轮实现已经完成文本卡片长按复制正文，并通过 [`TransientFeedbackHost.tsx`](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/TransientFeedbackHost.tsx) 在全局底部显示 `已复制` 短提示。当前短提示能力的边界是：

- 只支持单条纯文本消息
- 通过 [`showTransientFeedback.ts`](/Users/cooper/Documents/code/MemoryCapsule/app/src/services/showTransientFeedback.ts) 触发
- 位置固定在屏幕底部安全区上方
- 不感知触发来源元素的位置

现在用户希望把“已复制”提示改成更贴近操作目标本身的反馈：

- 长按哪张文本卡片，就在那张卡片附近显示 `已复制`
- 优先显示在卡片上方
- 如果卡片顶部空间不足，则自动翻到卡片下方

这意味着当前“全局固定底部 toast”模型需要升级为“支持元素锚点的短提示”，但仍然要保持它的最小边界，不能借这次需求扩成复杂 overlay 系统。

## 目标

- 让文本卡片复制成功提示锚定到被长按的卡片附近
- 优先显示在卡片上方，不够时翻到卡片下方
- 保持提示是短时、非阻塞、自动消失
- 保持文本卡片复制行为本身不变
- 保持失败反馈仍走现有 `showErrorFeedback`

## 非目标

- 不修改复制内容，仍然只复制 `entry.content`
- 不修改 photo / voice 卡片行为
- 不引入箭头气泡、复杂动效、队列系统
- 不改成卡片内部局部自绘 overlay
- 不把这次需求扩成通用浮层管理框架

## 方案对比

### 方案 1：继续使用全局 host，但支持锚点坐标

做法：

- `EntryCard` 成功复制后测量当前卡片的屏幕位置
- `showTransientFeedback(...)` 支持携带锚点矩形
- `TransientFeedbackHost` 根据锚点决定最终渲染坐标

优点：

- 复用现有短提示通道
- 仍由全局 host 统一处理层级、自动消失和边界保护
- 改动范围集中，可控

缺点：

- 需要增加一次卡片测量和位置计算
- host 定位逻辑会比现在稍复杂

结论：采用。

### 方案 2：把 `已复制` 做成 `EntryCard` 局部浮层

优点：

- 视觉上和卡片更贴
- 状态天然局部

缺点：

- 每种卡片容器都要自己处理层级和边界
- 复制成功提示能力会从全局 host 分裂出去
- 日历和时间线卡片要重复承担 overlay 责任

结论：不采用。

### 方案 3：引入通用锚定浮层系统

优点：

- 长期复用性最好

缺点：

- 对这次需求明显过度设计
- 会扩大到新的抽象层和更多调用方

结论：不采用。

## 最终设计

采用方案 1：

- 继续使用全局 `TransientFeedbackHost`
- 将短提示模型从“message only”升级为“message + 可选 anchorRect”
- 文本卡片复制成功时测量当前卡片的屏幕矩形并作为锚点传入
- `TransientFeedbackHost` 有锚点时优先渲染在卡片上方
- 如果上方放不下，则渲染在卡片下方
- 如果没有锚点，保留当前默认定位行为，避免影响其他潜在调用方

## 交互设计

### 成功提示位置规则

锚定对象：

- 触发复制成功的那张文本卡片

默认定位：

- 提示显示在卡片上方
- 水平居中对齐卡片
- 与卡片保持小间距

回退规则：

- 如果卡片上方空间不足以完整显示提示，则翻到卡片下方
- 如果下方也紧张，优先保证提示在屏幕内，不裁出屏幕
- 左右方向都要做边界保护，避免提示超出屏幕边缘

### 用户感知效果

用户长按文本卡片后：

1. 正文被复制
2. `已复制` 在当前卡片附近出现
3. 常规情况下显示在卡片上方
4. 卡片靠近顶部时，自动改到卡片下方
5. 提示短时自动消失，不阻塞继续浏览

## 实现设计

### 1. `transientFeedbackStore` 数据模型扩展

当前 store 只有：

- `currentMessage`
- `sequence`

需要扩展为：

- `currentMessage`
- `sequence`
- `anchorRect?: { x: number; y: number; width: number; height: number } | null`

目的：

- 让 host 能根据元素屏幕坐标做定位

保持约束：

- 仍然只支持单条消息
- 不引入消息队列

### 2. `showTransientFeedback` 服务扩展

从：

```ts
showTransientFeedback(message: string)
```

扩成：

```ts
showTransientFeedback(message: string, options?: {
  anchorRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
})
```

保持约束：

- 只增加一个可选 `anchorRect`
- 不增加复杂样式、时长、优先级参数

### 3. `EntryCard` 测量职责

复制成功提示要贴近卡片，测量责任放在 `EntryCard` 这一侧最合适。

推荐做法：

- 为 `Pressable` 或其外层卡片容器保留一个 `ref`
- 复制成功后使用 `measureInWindow(...)` 或等价方式读取卡片屏幕位置
- 把测量结果作为 `anchorRect` 交给 `showTransientFeedback`

设计约束：

- 只在文本卡片复制成功路径里测量
- 测量失败时允许回退到无锚点的默认全局位置，而不是中断提示

### 4. `TransientFeedbackHost` 定位职责

`TransientFeedbackHost` 继续负责：

- 自动消失
- 无障碍播报
- 全局最高层渲染

新增职责：

- 根据 `anchorRect` 计算最终 `top` / `left`
- 支持“上方优先 / 空间不足翻到下方”
- 做左右边界裁切

建议定位规则：

- 预估提示宽度使用固定最大宽度区间，而不是运行时复杂回流
- 上方位置：`anchorRect.y - gap - toastHeight`
- 下方位置：`anchorRect.y + anchorRect.height + gap`
- 水平位置：卡片中心对齐，最终 clamp 到屏幕边界内

如果没有 `anchorRect`：

- 保持当前底部默认位置

### 5. 无障碍与时序

上一轮已经为短提示加了：

- `sequence` 防 stale timer
- `AccessibilityInfo.announceForAccessibility(...)`

这次要保留，不得回归。

另外，提示位置改成锚定后：

- 无障碍仍然以文案播报为主
- 不要求把锚点位置信息暴露给读屏

## 文件改动范围

| 文件 | 改动 |
| --- | --- |
| `app/src/store/transientFeedbackStore.ts` | 扩展短提示状态，支持 `anchorRect` |
| `app/src/services/showTransientFeedback.ts` | 扩展服务签名，支持可选锚点参数 |
| `app/src/components/TransientFeedbackHost.tsx` | 增加锚定定位与上下翻转逻辑 |
| `app/src/components/EntryCard.tsx` | 为卡片提供可测量 ref 或承载测量入口 |
| `app/src/components/entry-card/useEntryCardController.ts` | 在文本卡片复制成功后测量并传入锚点 |
| `app/src/components/__tests__/TransientFeedbackHost.test.tsx` | 新增锚点定位、上方/下方翻转、边界保护测试 |
| `app/src/components/__tests__/EntryCard.test.tsx` | 新增复制成功时携带锚点调用短提示的测试 |

## 测试设计

### `TransientFeedbackHost` 测试

新增覆盖：

- 有 `anchorRect` 时，优先使用卡片上方定位
- 上方空间不足时，自动翻到卡片下方
- 左右贴边时，位置被 clamp 在屏幕内
- 没有 `anchorRect` 时，保留默认底部定位

### `EntryCard` 测试

新增覆盖：

- 文本卡片复制成功时，会把当前卡片测量结果传给 `showTransientFeedback`
- 测量失败时，仍会显示 `已复制`，只是没有锚点

保留现有覆盖：

- 复制成功
- 复制失败
- photo / voice 不复制
- 短按详情不回归

## 风险与处理

### 风险 1：锚点测量时序不稳定

处理：

- 只在复制成功后测量一次
- 测量失败时回退到默认全局位置

### 风险 2：提示位置贴边或被裁切

处理：

- `TransientFeedbackHost` 统一做左右 clamp
- 顶部空间不足自动翻下

### 风险 3：把短提示系统过度抽象

处理：

- 只新增一个可选 `anchorRect`
- 不增加更多外观和行为参数

## 验收标准

- 长按文本卡片复制成功后，`已复制` 显示在当前卡片附近
- 常规情况下提示显示在卡片上方
- 卡片靠近顶部时提示自动翻到卡片下方
- 提示不会溢出屏幕左右边界
- 没有锚点时仍保留默认底部定位
- 复制功能本身、失败反馈、短按详情都不回归
