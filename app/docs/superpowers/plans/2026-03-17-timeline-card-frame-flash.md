# Timeline 卡片粗框残影消除 Implementation Plan

> **For agentic workers:** REQUIRED: Use @superpowers:subagent-driven-development (if subagents available) or @superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除“列表 / 按月”切换时单张卡片的入场和退场动画，彻底消除卡片先露出粗框再显示内容的残影问题。

**Architecture:** 问题集中在 [src/components/Timeline.v2.tsx](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/Timeline.v2.tsx) 的 `EntryMarker` 渲染链路，而不是 [src/components/EntryCard.tsx](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/EntryCard.tsx) 的静态样式。实现上保留视图级别的 `DotsLoader` 切换，但移除卡片级 `opacity` 延迟、`FadeOut`、`LinearTransition`、stagger delay 和通过 `animationEpoch` 强制 remount 的机制，让卡片直接以稳定最终状态渲染。

**Tech Stack:** React Native, TypeScript, react-native-reanimated, Jest, @testing-library/react-native

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/Timeline.v2.tsx` | 修改 | 移除卡片级入场/退场动画、去掉 `animationEpoch`/`enterDelay` 链路、稳定 `SectionList` key |
| `src/components/__tests__/Timeline.v2.view-mode.test.tsx` | 新建 | 为视图切换回归添加测试，覆盖稳定 key 和切换后直接渲染卡片 |
| `src/components/__tests__/EntryCard.test.tsx` | 只运行，不改动 | 确认 Timeline 调整没有破坏卡片既有交互 |
| `src/components/__tests__/EntryCard.missing-media.test.tsx` | 只运行，不改动 | 确认媒体卡片交互没有回归 |

---

## Chunk 1: 回归测试先行

### 任务 1: 为视图切换新增结构性回归测试

**Files:**
- Create: `src/components/__tests__/Timeline.v2.view-mode.test.tsx`

- [ ] **Step 1: 写出失败测试，锁定稳定 key 行为**

在新测试文件中先搭一个最小 Timeline 测试夹具，mock 掉与本问题无关的依赖，只保留：
- `useEntryStore`
- `SearchBar`
- `SearchOverlay`
- `EntryEditor`
- `CalendarView`
- `FABMenu`
- `useSafeAreaInsets`
- `EntryCard`

测试核心断言：

```tsx
it('uses stable SectionList keys when switching between list and monthly views', () => {
  const capturedKeys: string[][] = [];

  mockSectionListImplementation(({ sections, keyExtractor }) => {
    const keys = sections.flatMap((section: any) =>
      section.data.map((item: any) => keyExtractor(item))
    );
    capturedKeys.push(keys);
    return <View testID="section-list-mock" />;
  });

  const screen = render(<Timeline />);

  fireEvent.press(screen.getByTestId('searchbar-view-mode-toggle'));
  fireEvent.press(screen.getByText('按月'));
  act(() => {
    jest.advanceTimersByTime(600);
  });

  expect(capturedKeys[0]).toEqual(['entry-1', 'entry-2']);
  expect(capturedKeys[capturedKeys.length - 1]).toEqual(['entry-1', 'entry-2']);
});
```

这个测试在改动前应失败，因为当前 `keyExtractor` 返回的是 ``${item.id}-${animationEpoch}``。

- [ ] **Step 2: 运行单测，确认它先失败**

Run:
```bash
pnpm test -- src/components/__tests__/Timeline.v2.view-mode.test.tsx --runInBand
```

Expected:
- FAIL
- 断言里能看到 key 包含 `-0`、`-1` 之类的 epoch 后缀，证明当前切换会强制 remount 卡片

- [ ] **Step 3: 在同一文件补一个切换后仍直接渲染卡片的烟雾测试**

增加第二个测试，保证去掉卡片级动画后不会把卡片切没：

```tsx
it('renders entry cards again after switching to monthly mode', () => {
  const screen = render(<Timeline />);

  fireEvent.press(screen.getByTestId('searchbar-view-mode-toggle'));
  fireEvent.press(screen.getByText('按月'));
  act(() => {
    jest.advanceTimersByTime(600);
  });

  expect(screen.getAllByTestId('mock-entry-card')).toHaveLength(2);
});
```

`EntryCard` mock 建议长这样：

```tsx
jest.mock('../EntryCard', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    EntryCard: ({ entry }: { entry: { id: string } }) => (
      <Text testID="mock-entry-card">{entry.id}</Text>
    ),
  };
});
```

- [ ] **Step 4: Commit**

```bash
git add src/components/__tests__/Timeline.v2.view-mode.test.tsx
git commit -m "test: add timeline view mode frame flash regressions"
```

---

## Chunk 2: 移除卡片级动画链路

### 任务 2: 先去掉强制 remount 和 stagger delay

**Files:**
- Modify: `src/components/Timeline.v2.tsx`
- Test: `src/components/__tests__/Timeline.v2.view-mode.test.tsx`

- [ ] **Step 1: 删除 `animationEpoch` 状态和相关写入**

在 [src/components/Timeline.v2.tsx](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/Timeline.v2.tsx) 中移除：

```tsx
const [animationEpoch, setAnimationEpoch] = useState(0);
```

并把视图切换 `useEffect` 里的这行删掉：

```tsx
setAnimationEpoch(e => e + 1);
```

这样切视图时不会再因为 key 变化导致卡片整批卸载重建。

- [ ] **Step 2: 把 `keyExtractor` 改回稳定 key**

把：

```tsx
const keyExtractor = useCallback((item: Entry) => {
  return `${item.id}-${animationEpoch}`;
}, [animationEpoch]);
```

改成：

```tsx
const keyExtractor = useCallback((item: Entry) => item.id, []);
```

- [ ] **Step 3: 移除 `globalIndexMap`、`enterDelay` 计算和透传**

删掉：
- `EntryMarkerProps` 里的 `enterDelay?: number`
- `EntryMarker` 参数默认值 `enterDelay = 0`
- `globalIndexMap` 这个 `useMemo`
- `renderItem` 内部的 `globalIndex` / `enterDelay` 计算
- `<EntryMarker ... enterDelay={enterDelay} />`

这是当前 stagger 逐张出现的入口。

- [ ] **Step 4: 运行单测，确认前面的失败测试转绿**

Run:
```bash
pnpm test -- src/components/__tests__/Timeline.v2.view-mode.test.tsx --runInBand
```

Expected:
- PASS
- `keyExtractor` 不再输出 epoch 后缀

- [ ] **Step 5: Commit**

```bash
git add src/components/Timeline.v2.tsx src/components/__tests__/Timeline.v2.view-mode.test.tsx
git commit -m "fix: stop remounting timeline cards during view switches"
```

---

### 任务 3: 去掉 `EntryMarker` 的透明度和退出动画

**Files:**
- Modify: `src/components/Timeline.v2.tsx`

- [ ] **Step 1: 删除 `fadeOpacity` 和延迟淡入逻辑**

从 `EntryMarker` 中删除：

```tsx
const fadeOpacity = useRef(new RNAnimated.Value(0)).current;

useEffect(() => {
  const timer = setTimeout(() => {
    RNAnimated.timing(fadeOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, enterDelay);
  return () => clearTimeout(timer);
}, []);
```

并删除外层：

```tsx
<RNAnimated.View style={{ opacity: fadeOpacity }}>
```

改成直接渲染稳定容器。

- [ ] **Step 2: 删除 `EntryMarker` 上的 `exiting` 和 `layout`**

把当前：

```tsx
<Animated.View
  exiting={FadeOut.duration(200)}
  layout={LinearTransition.duration(200)}
  style={{ ... }}
>
```

改成普通静态容器，例如：

```tsx
<View style={{ paddingLeft: 64, paddingRight: 24, paddingBottom: isLast ? 0 : cardSpacing, position: 'relative' }}>
```

注意：
- 这里只替换 `EntryMarker` 这一级
- 不要误删 `EmptyState`、筛选条等与本问题无关的 `FadeIn` / `FadeOut`

- [ ] **Step 3: 清理不再使用的导入**

在文件头部检查并删除已经不用的导入，例如：
- `LinearTransition`（大概率可删）
- 若 `FadeOut` 仍被筛选条使用，则保留

- [ ] **Step 4: 运行与 Timeline 和 EntryCard 相关的回归测试**

Run:
```bash
pnpm test -- src/components/__tests__/Timeline.v2.view-mode.test.tsx src/components/__tests__/EntryCard.test.tsx src/components/__tests__/EntryCard.missing-media.test.tsx --runInBand
```

Expected:
- PASS
- Timeline 新增测试通过
- EntryCard 既有测试继续通过

- [ ] **Step 5: 运行类型检查**

Run:
```bash
pnpm run typecheck
```

Expected:
- PASS
- 没有 `enterDelay`、`animationEpoch`、`globalIndexMap` 遗留类型错误

- [ ] **Step 6: Commit**

```bash
git add src/components/Timeline.v2.tsx
git commit -m "fix: remove timeline card transition wrappers"
```

---

## Chunk 3: 视觉回归验证

### 任务 4: 手工验证“完全不出现粗框”

**Files:**
- Modify: none

- [ ] **Step 1: 本地运行应用并进入时间轴页面**

Run:
```bash
pnpm start
```

手工验证路径：
- 进入时间轴
- 展开视图切换面板
- 在“列表”和“按月”之间连续切换至少 10 次

- [ ] **Step 2: 按以下清单逐项确认**

必须同时满足：
- 卡片出现前不再先显示一圈浅灰/白色粗框
- 卡片退出后不再残留圆角壳、阴影壳或空白容器
- 文本、图片、语音卡片都没有该现象
- 左滑、长按、点击播放/查看图片仍正常

- [ ] **Step 3: 如果仍有粗框，继续做二次收口**

只在仍复现时执行：
- 检查 `SectionList` 上下文是否还有导致列表项重排的动画来源
- 优先继续移除与卡片项重排相关的动画，而不是回到 `EntryCard` 里补边框遮罩

- [ ] **Step 4: Commit**

```bash
git add src/components/Timeline.v2.tsx src/components/__tests__/Timeline.v2.view-mode.test.tsx
git commit -m "fix: eliminate timeline card frame flash during view switch"
```

---

## 完成标准

- “列表 / 按月”切换时，卡片不再先显示粗框再显示内容
- 卡片退出时不再残留外框或阴影壳
- 新增 Timeline 回归测试通过
- `EntryCard` 既有测试和 `typecheck` 通过
