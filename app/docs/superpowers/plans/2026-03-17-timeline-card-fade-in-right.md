# Timeline 卡片 FadeInRight 入场 Implementation Plan

> **For agentic workers:** REQUIRED: Use @superpowers:subagent-driven-development (if subagents available) or @superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让所有卡片在加载显示时使用错峰 `FadeInRight` 入场，同时保持卡片消失时完全没有退出动画，并避免重新引入粗框残影。

**Architecture:** 时间轴行容器 [Timeline.v2.tsx](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/Timeline.v2.tsx) 只负责计算稳定的错峰延迟并传给卡片，不再承担任何卡片级进出场动画。真正的 `FadeInRight` 只挂在 [EntryCard.tsx](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/EntryCard.tsx) 的卡片本体内容层，且不配置 `exiting`，这样保留入场感，避免旧卡片移除时残影回归。

**Tech Stack:** React Native, TypeScript, react-native-reanimated, Jest, @testing-library/react-native

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/Timeline.v2.tsx` | 修改 | 恢复用于卡片内容层的 stagger delay 计算，并把 delay 传给 `EntryCard` |
| `src/components/EntryCard.tsx` | 修改 | 新增可选入场延迟 prop，并把 `FadeInRight` 挂到卡片内容层，不加退出动画 |
| `src/components/__tests__/Timeline.v2.view-mode.test.tsx` | 修改 | 验证 `Timeline` 继续保持稳定 key，并把 enter delay 传递给 `EntryCard` |
| `src/components/__tests__/EntryCard.test.tsx` | 修改 | 验证 `EntryCard` 使用 `FadeInRight` entering 且没有 exiting |
| `src/components/__tests__/EntryCard.missing-media.test.tsx` | 只运行，不改动 | 确认媒体交互没有被入场动画回归破坏 |

---

## Chunk 1: 测试先行

### 任务 1: 给 Timeline 补 enter delay 回归测试

**Files:**
- Modify: `src/components/__tests__/Timeline.v2.view-mode.test.tsx`

- [ ] **Step 1: 写失败测试，验证 `Timeline` 会把错峰 delay 传给 `EntryCard`**

在现有 `EntryCard` mock 上扩展，让它把收到的 `enterDelay` 渲染出来，例如：

```tsx
jest.mock('../EntryCard', () => ({
  EntryCard: ({ entry, enterDelay = -1 }: { entry: { id: string }; enterDelay?: number }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return (
      <Text testID={`mock-entry-card-${entry.id}`}>
        {`${entry.id}:${enterDelay}`}
      </Text>
    );
  },
}));
```

然后新增测试：

```tsx
it('passes staggered enter delays to entry cards', () => {
  const screen = render(<Timeline />);

  expect(screen.getByTestId('mock-entry-card-entry-1').props.children).toBe('entry-1:0');
  expect(screen.getByTestId('mock-entry-card-entry-2').props.children).toBe('entry-2:50');
});
```

这里先只锁行为，不锁具体上限常量；两条数据足够验证“有顺序延迟、首条为 0”。

- [ ] **Step 2: 运行测试，确认它先失败**

Run:
```bash
npm test -- src/components/__tests__/Timeline.v2.view-mode.test.tsx --runInBand
```

Expected:
- FAIL
- 失败原因是当前 `EntryCard` 还没有收到 `enterDelay`，文本会是 `entry-1:-1` / `entry-2:-1`

- [ ] **Step 3: Commit**

```bash
git add src/components/__tests__/Timeline.v2.view-mode.test.tsx
git commit -m "test: cover timeline enter delay forwarding"
```

---

### 任务 2: 给 EntryCard 补 FadeInRight 挂载测试

**Files:**
- Modify: `src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: 调整 reanimated mock 以便断言 entering 配置**

保留现有 `react-native-reanimated/mock`，并在 mock 内给 `FadeInRight` 提供可链式调用的伪实现，例如：

```tsx
const makeEntering = () => ({
  duration: jest.fn().mockReturnThis(),
  delay: jest.fn().mockReturnThis(),
});

Reanimated.FadeInRight = makeEntering;
```

如果需要断言调用参数，把 `makeEntering` 改成返回可追踪的实例对象。

- [ ] **Step 2: 新增失败测试，验证卡片内容层用了 `FadeInRight` 且没有 `exiting`**

增加一个测试，渲染 `EntryCard` 时传入 `enterDelay={120}`，然后检查承载卡片主内容的 `Animated.View`：

```tsx
it('applies FadeInRight entering with the provided delay and no exiting animation', () => {
  const screen = render(
    <EntryCard entry={mockEntry} onDelete={jest.fn()} enterDelay={120} />
  );

  const animatedViews = screen.UNSAFE_getAllByType(require('react-native-reanimated').default.View);
  const contentAnimatedView = animatedViews.find((node: any) => node.props?.entering);

  expect(contentAnimatedView.props.entering).toBeDefined();
  expect(contentAnimatedView.props.exiting).toBeUndefined();
  expect(mockFadeInRightDuration).toHaveBeenCalledWith(expect.any(Number));
  expect(mockFadeInRightDelay).toHaveBeenCalledWith(120);
});
```

测试重点：
- 有 `entering`
- 没有 `exiting`
- delay 参数来自 props

- [ ] **Step 3: 运行测试，确认它先失败**

Run:
```bash
npm test -- src/components/__tests__/EntryCard.test.tsx --runInBand
```

Expected:
- FAIL
- 失败原因是当前 `EntryCard` 还没有 `enterDelay` prop，也没有 `FadeInRight`

- [ ] **Step 4: Commit**

```bash
git add src/components/__tests__/EntryCard.test.tsx
git commit -m "test: cover entry card fade in right entering"
```

---

## Chunk 2: 最小实现

### 任务 3: 在 Timeline 中恢复错峰延迟，但只用于传参

**Files:**
- Modify: `src/components/Timeline.v2.tsx`
- Test: `src/components/__tests__/Timeline.v2.view-mode.test.tsx`

- [ ] **Step 1: 给 `EntryMarkerProps` 和 `EntryCard` 调用链增加 `enterDelay`**

在 `EntryMarkerProps` 中新增：

```tsx
enterDelay?: number;
```

在 `EntryMarker` 参数中解构：

```tsx
enterDelay = 0,
```

并在 `<EntryCard />` 调用时透传：

```tsx
enterDelay={enterDelay}
```

- [ ] **Step 2: 恢复 `globalIndexMap` 和受限错峰计算**

在 `sections` 下面恢复：

```tsx
const globalIndexMap = useMemo(() => {
  const map = new Map<string, number>();
  let i = 0;
  for (const section of sections) {
    for (const entry of section.data) {
      map.set(entry.id, i++);
    }
  }
  return map;
}, [sections]);
```

并在 `renderItem` 中改成：

```tsx
const globalIndex = globalIndexMap.get(item.id) ?? 0;
const staggerIndex = Math.min(globalIndex, 8);
const enterDelay = staggerIndex * 50;
```

注意：
- 这里只恢复“计算与传参”
- 不恢复任何外层 `entering`、`exiting`、`layout` 动画

- [ ] **Step 3: 运行 Timeline 测试，确认转绿**

Run:
```bash
npm test -- src/components/__tests__/Timeline.v2.view-mode.test.tsx --runInBand
```

Expected:
- PASS
- 稳定 key 断言继续通过
- 新增的 enter delay 断言通过

- [ ] **Step 4: Commit**

```bash
git add src/components/Timeline.v2.tsx src/components/__tests__/Timeline.v2.view-mode.test.tsx
git commit -m "feat: forward staggered enter delays to entry cards"
```

---

### 任务 4: 在 EntryCard 内容层挂 `FadeInRight`

**Files:**
- Modify: `src/components/EntryCard.tsx`
- Test: `src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: 给 `EntryCardProps` 新增可选 `enterDelay`**

在接口里添加：

```tsx
enterDelay?: number;
```

并在函数参数中提供默认值：

```tsx
enterDelay = 0,
```

- [ ] **Step 2: 引入 `FadeInRight`，只挂在卡片内容层**

调整 reanimated import：

```tsx
import Animated, {
  FadeInRight,
  Layout,
  ...
} from 'react-native-reanimated';
```

然后把当前包裹卡片主内容的这层：

```tsx
<Animated.View layout={Layout.springify()}>
```

改成：

```tsx
<Animated.View
  entering={FadeInRight.duration(220).delay(enterDelay)}
  layout={Layout.springify()}
>
```

注意：
- 不添加 `exiting`
- 不把 `FadeInRight` 挂到最外层 `entry-card-container`
- 不改 `Swipeable`、`ActionSheet`、按压态逻辑

- [ ] **Step 3: 如果测试发现 `layout={Layout.springify()}` 与 entering 组合导致噪音，最小收口**

只在必要时执行：
- 把 `layout={Layout.springify()}` 从同一层移走，或保留一层仅用于 entering 的 wrapper
- 原则是不影响“无退出动画”和“避免粗框回归”

- [ ] **Step 4: 运行 EntryCard 测试，确认转绿**

Run:
```bash
npm test -- src/components/__tests__/EntryCard.test.tsx --runInBand
```

Expected:
- PASS
- 新增 FadeInRight 测试通过
- 既有滑动和长按行为测试继续通过

- [ ] **Step 5: Commit**

```bash
git add src/components/EntryCard.tsx src/components/__tests__/EntryCard.test.tsx
git commit -m "feat: add fade in right entering to entry cards"
```

---

## Chunk 3: 全量验证

### 任务 5: 跑完整回归并做手工验证

**Files:**
- Modify: none

- [ ] **Step 1: 运行相关自动化测试**

Run:
```bash
npm test -- src/components/__tests__/Timeline.v2.view-mode.test.tsx src/components/__tests__/EntryCard.test.tsx src/components/__tests__/EntryCard.missing-media.test.tsx --runInBand
```

Expected:
- PASS
- Timeline 传 delay 测试通过
- EntryCard FadeInRight 测试通过
- 媒体缺失交互测试不回归

- [ ] **Step 2: 运行完整测试和类型检查**

Run:
```bash
npm test -- --runInBand
npm run typecheck
```

Expected:
- 全量 Jest 通过
- TypeScript 无错误

- [ ] **Step 3: 手工验证动画体验**

Run:
```bash
npm start
```

手工检查：
- 首次进入时间轴时卡片从右向左错峰进入
- 列表 / 按月切换时新卡片有入场效果，旧卡片直接消失
- 搜索、筛选、分页加载时新卡片也有入场
- 不再出现粗框残影

- [ ] **Step 4: Commit**

```bash
git add src/components/Timeline.v2.tsx src/components/EntryCard.tsx src/components/__tests__/Timeline.v2.view-mode.test.tsx src/components/__tests__/EntryCard.test.tsx
git commit -m "fix: add staggered fade in right for timeline cards"
```

---

## 完成标准

- `Timeline` 继续使用稳定 key
- `Timeline` 只负责计算并传递错峰 `enterDelay`
- `EntryCard` 内容层使用 `FadeInRight` entering
- 卡片移除时没有退出动画
- 自动化测试和 `typecheck` 通过
- 手工确认未重新引入粗框残影
