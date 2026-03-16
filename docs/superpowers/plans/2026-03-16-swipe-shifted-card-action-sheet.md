# 左滑停靠后弹出底部操作面板 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `EntryCard` 左滑后先明显左移并停靠在固定位置，再延迟弹出非 spring 的底部操作面板；关闭时面板先退场，卡片再复位。

**Architecture:** 保留 `Swipeable` 只做手势触发检测，不再依赖它提供可见位移效果。`EntryCard` 自己维护卡片跟手、停靠和复位动画；`EntryActionSheet` 只负责面板和删除确认，并将动画统一改为 `timing`。`Timeline.v2` 继续用 `activeActionSheetId` 做多卡片互斥。

**Tech Stack:** React Native, `react-native-gesture-handler` `Swipeable`, `react-native-reanimated`, React Native `Modal`, `PanResponder`, `@testing-library/react-native`, Jest, TypeScript

---

## File Structure

| 操作 | 文件 | 职责 |
|---|---|---|
| 改 | `app/src/components/EntryCard.tsx` | 负责卡片左滑跟手、固定停靠、延迟弹面板、关闭后复位 |
| 改 | `app/src/components/EntryActionSheet.tsx` | 负责非 spring 的面板进出场、遮罩、删除确认 |
| 改 | `app/src/components/Timeline.v2.tsx` | 负责多卡片活动态互斥 |
| 改 | `app/src/components/__tests__/EntryCard.test.tsx` | 覆盖普通卡片的新交互时序 |
| 改 | `app/src/components/__tests__/EntryCard.missing-media.test.tsx` | 覆盖缺失媒体场景下的新交互 |
| 改 | `app/src/components/__tests__/EntryActionSheet.test.tsx` | 覆盖面板动画策略和关闭顺序相关行为 |

---

## Chunk 1: EntryCard 交互时序

### Task 1: 先补 EntryCard 交互测试

**Files:**
- Modify: `app/src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: 在现有 Swipeable mock 中保留 `onSwipeableOpen`，并让它可被测试手动触发**

确认 mock 结构允许这样调用：

```tsx
act(() => {
  getByTestId('swipeable').props.onSwipeableOpen('right');
});
```

- [ ] **Step 2: 写失败测试，断言左滑触发后先显示“卡片进入活动态”而不是直接依赖旧抽屉**

在 `describe('EntryCard swipe actions')` 中新增一个测试，使用 mock 的 `EntryActionSheet`，要求：

```tsx
it('marks card as shifted and then shows action sheet after swipe open', () => {
  jest.useFakeTimers();
  const { getByTestId, queryByTestId } = render(
    <EntryCard entry={mockEntry} onDelete={jest.fn()} />
  );

  act(() => {
    getByTestId('swipeable').props.onSwipeableOpen('right');
  });

  expect(getByTestId('entry-card-container').props.style).toEqual(
    expect.arrayContaining([expect.objectContaining({})])
  );

  expect(queryByTestId('entry-action-sheet')).toBeNull();

  act(() => {
    jest.advanceTimersByTime(100);
  });

  expect(getByTestId('entry-action-sheet')).toBeTruthy();
  jest.useRealTimers();
});
```

测试名和断言可微调，但必须验证“不是立刻弹面板”。

- [ ] **Step 3: 写失败测试，断言关闭面板时先关闭面板，再让卡片复位**

新增测试，要求顺序是：
1. 触发左滑
2. 推进定时器让面板出现
3. 点击取消
4. 立即断言面板关闭
5. 再推进退出动画时间，断言卡片复位状态

- [ ] **Step 4: 运行单测确认失败**

Run:

```bash
cd app && npx jest src/components/__tests__/EntryCard.test.tsx --no-coverage
```

Expected:
- FAIL
- 失败原因是当前实现不满足“延迟弹出”或“关闭顺序”

- [ ] **Step 5: 提交测试红灯基线（如果团队当前流程允许红灯提交则跳过；默认不提交）**

不提交红灯代码，继续进入实现。

---

### Task 2: 实现 EntryCard 的停靠与时序控制

**Files:**
- Modify: `app/src/components/EntryCard.tsx`

- [ ] **Step 1: 为卡片容器增加明确的测试锚点**

给承载实际位移动画的卡片外层增加：

```tsx
testID="entry-card-container"
```

以便测试读取当前活动态和位移样式。

- [ ] **Step 2: 引入卡片交互状态**

在组件内新增：

```tsx
type CardInteractionState = 'idle' | 'cardShifted' | 'sheetOpen' | 'closing';
const [interactionState, setInteractionState] = useState<CardInteractionState>('idle');
```

以及用于控制定时的 `ref`：

```tsx
const openSheetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const resetCardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

- [ ] **Step 3: 新增卡片位移动画值**

在 `EntryCard.tsx` 内创建：

```tsx
const cardTranslateX = useSharedValue(0);
```

并用 `useAnimatedStyle` 生成卡片位移动画样式：

```tsx
const cardAnimatedStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: cardTranslateX.value }],
}));
```

- [ ] **Step 4: 抽出“卡片停靠”和“卡片复位”两个动作函数**

实现两个最小辅助函数：

```tsx
const shiftCardToRestingPosition = () => {
  cardTranslateX.value = withTiming(-28, {
    duration: 160,
    easing: Easing.out(Easing.cubic),
  });
};

const resetCardPosition = () => {
  cardTranslateX.value = withTiming(0, {
    duration: 160,
    easing: Easing.out(Easing.cubic),
  });
};
```

- [ ] **Step 5: 重写 `onSwipeableOpen` 的时序**

当前是立即 `setShowActionSheet(true)`；改为：

1. 先 `swipeableRef.current?.close()`
2. `setInteractionState('cardShifted')`
3. 调用 `shiftCardToRestingPosition()`
4. 清理旧定时器
5. 启动 `100ms` 定时器，在回调中：
   - `setShowActionSheet(true)`
   - `setInteractionState('sheetOpen')`
   - `onActionSheetOpen?.(entry.id)`

- [ ] **Step 6: 抽出统一的关闭流程**

实现：

```tsx
const closeActionSheetAndResetCard = () => {
  setInteractionState('closing');
  setShowActionSheet(false);
  clear existing reset timeout;
  resetCardTimeoutRef.current = setTimeout(() => {
    resetCardPosition();
    setInteractionState('idle');
  }, 220);
};
```

这里的 `220ms` 与面板退出时长保持一致。

- [ ] **Step 7: 让 `EntryActionSheet` 的三个出口都走统一关闭流程**

更新传参：

```tsx
onEdit={() => {
  onEdit?.(entry);
  closeActionSheetAndResetCard();
}}
onDelete={() => {
  onDelete(entry.id);
  closeActionSheetAndResetCard();
}}
onClose={closeActionSheetAndResetCard}
```

- [ ] **Step 8: 处理互斥关闭**

保留 `isActionSheetActive`，但从“直接关面板”改成：

```tsx
useEffect(() => {
  if (isActionSheetActive === false && interactionState !== 'idle') {
    closeActionSheetAndResetCard();
  }
}, [isActionSheetActive, interactionState]);
```

- [ ] **Step 9: 在卸载时清理定时器**

新增 `useEffect` cleanup，清掉：

- `openSheetTimeoutRef`
- `resetCardTimeoutRef`

- [ ] **Step 10: 运行单测确认通过**

Run:

```bash
cd app && npx jest src/components/__tests__/EntryCard.test.tsx --no-coverage
```

Expected:
- PASS

- [ ] **Step 11: 提交**

```bash
cd app
git add src/components/EntryCard.tsx src/components/__tests__/EntryCard.test.tsx
git commit -m "feat: add shifted swipe timing for entry cards"
```

---

## Chunk 2: EntryActionSheet 非 spring 动画

### Task 3: 先补 EntryActionSheet 行为测试

**Files:**
- Modify: `app/src/components/__tests__/EntryActionSheet.test.tsx`

- [ ] **Step 1: 增加一个失败测试，断言 visible=true 后不会立刻走 spring 动画配置**

用 `jest.mock('react-native-reanimated/mock')` 的环境，测试重点不是内部实现细节，而是可观察行为：

1. `visible=true` 时面板存在
2. `visible=false` 后不会立刻从树中消失
3. 推进退出时长后才真正消失

- [ ] **Step 2: 增加一个失败测试，断言关闭后会在退出时长后才触发完全卸载**

示例结构：

```tsx
it('keeps sheet mounted until timing-based exit finishes', () => {
  jest.useFakeTimers();
  const { rerender, queryByText } = render(
    <EntryActionSheet {...baseProps} visible={true} />
  );

  rerender(<EntryActionSheet {...baseProps} visible={false} />);
  expect(queryByText('编辑')).toBeTruthy();

  act(() => {
    jest.advanceTimersByTime(220);
  });

  expect(queryByText('编辑')).toBeNull();
  jest.useRealTimers();
});
```

- [ ] **Step 3: 运行测试确认失败**

Run:

```bash
cd app && npx jest src/components/__tests__/EntryActionSheet.test.tsx --no-coverage
```

Expected:
- FAIL
- 当前行为与目标时序不完全一致

---

### Task 4: 将 EntryActionSheet 动画从 spring 改为 timing

**Files:**
- Modify: `app/src/components/EntryActionSheet.tsx`

- [ ] **Step 1: 将面板入场动画改为 `withTiming`**

当前实现里打开时仍使用：

```tsx
translateY.value = withSpring(0, ...)
```

改为：

```tsx
translateY.value = withTiming(0, {
  duration: 240,
  easing: Easing.out(Easing.cubic),
});
```

- [ ] **Step 2: 将拖拽取消后的回位动画也改为 `withTiming`**

当前 `PanResponder` 中拖拽取消时仍有 `withSpring(0, ...)`，统一改为：

```tsx
translateY.value = withTiming(0, {
  duration: 180,
  easing: Easing.out(Easing.cubic),
});
```

- [ ] **Step 3: 保持退出动画为 `withTiming`，并统一时长常量**

在文件顶部或组件内定义：

```tsx
const SHEET_ENTER_DURATION = 240;
const SHEET_EXIT_DURATION = 220;
const SHEET_RETURN_DURATION = 180;
```

所有相关定时与动画都引用这些常量，避免 `EntryCard` 与 `EntryActionSheet` 时长脱节。

- [ ] **Step 4: 导出或本地复用退出时长常量给 `EntryCard`**

优先方案：
- 在 `EntryActionSheet.tsx` 中导出 `ENTRY_ACTION_SHEET_EXIT_DURATION = 220`
- 在 `EntryCard.tsx` 中 import 这个常量，用于“面板退场后卡片复位”的定时

避免两个文件手写两个不同的 `220`

- [ ] **Step 5: 运行单测确认通过**

Run:

```bash
cd app && npx jest src/components/__tests__/EntryActionSheet.test.tsx --no-coverage
```

Expected:
- PASS

- [ ] **Step 6: 提交**

```bash
cd app
git add src/components/EntryActionSheet.tsx src/components/__tests__/EntryActionSheet.test.tsx src/components/EntryCard.tsx
git commit -m "feat: switch entry action sheet animations to timing"
```

---

## Chunk 3: Timeline 互斥与缺失媒体回归

### Task 5: 更新缺失媒体测试以覆盖新交互时序

**Files:**
- Modify: `app/src/components/__tests__/EntryCard.missing-media.test.tsx`

- [ ] **Step 1: 新增失败测试，断言缺失媒体卡片左滑后不会立即弹面板**

对图片丢失、音频丢失场景分别加一条测试：

1. 触发 `onSwipeableOpen('right')`
2. 立即断言 `entry-action-sheet` 不存在
3. 推进 `100ms`
4. 断言 `entry-action-sheet` 出现

- [ ] **Step 2: 新增失败测试，断言缺失媒体卡片关闭面板后也会正确复位**

模拟：
1. 左滑
2. 等待面板出现
3. 点击取消
4. 推进退出时间
5. 断言卡片容器已回到非活动态

- [ ] **Step 3: 运行测试确认失败**

Run:

```bash
cd app && npx jest src/components/__tests__/EntryCard.missing-media.test.tsx --no-coverage
```

Expected:
- FAIL

---

### Task 6: 验证 `Timeline.v2` 的互斥行为

**Files:**
- Modify: `app/src/components/Timeline.v2.tsx`

- [ ] **Step 1: 检查 `activeActionSheetId` 是否需要额外“关闭通知”**

如果当前只有“打开新卡片时切换 active id”，那就足够；不要为了本计划额外加复杂状态，除非测试证明必要。

- [ ] **Step 2: 若测试暴露互斥问题，再最小化修正**

只允许以下最小修正之一：

- 在 `EntryCard` 的 `closeActionSheetAndResetCard` 结束后通知父层清空活动态
- 或在 `Timeline` 中保持“最后一个打开者即活动者”的逻辑不变，由 `EntryCard` 自行根据 `isActionSheetActive` 收尾

不要引入额外的全局动画状态表。

- [ ] **Step 3: 运行缺失媒体测试确认通过**

Run:

```bash
cd app && npx jest src/components/__tests__/EntryCard.missing-media.test.tsx --no-coverage
```

Expected:
- PASS

- [ ] **Step 4: 运行相关组件测试**

Run:

```bash
cd app && npx jest src/components/__tests__/EntryCard.test.tsx src/components/__tests__/EntryCard.missing-media.test.tsx src/components/__tests__/EntryActionSheet.test.tsx --no-coverage
```

Expected:
- PASS

- [ ] **Step 5: 提交**

```bash
cd app
git add src/components/Timeline.v2.tsx src/components/__tests__/EntryCard.missing-media.test.tsx
git commit -m "feat: preserve shifted swipe interaction across timeline cards"
```

---

## Chunk 4: 最终验证

### Task 7: 全量验证并记录结果

**Files:**
- No file changes required

- [ ] **Step 1: 运行全部测试**

Run:

```bash
cd app && npx jest --no-coverage
```

Expected:
- PASS
- 全部 test suites 通过

- [ ] **Step 2: 运行类型检查**

Run:

```bash
cd app && npx tsc --noEmit
```

Expected:
- 无 TypeScript 错误

- [ ] **Step 3: 人工核对需求映射**

逐条核对 spec：

- 卡片左滑有明显位移反馈
- 卡片松手后停靠在固定 `-28px`
- 面板不是立刻跳出，而是停顿后上移
- 面板进入/退出没有回弹
- 关闭顺序是“面板先退，卡片再回”

- [ ] **Step 4: 汇总结果**

在执行会话中输出：

- 修改了哪些文件
- 哪些测试新增或更新
- `jest` 与 `tsc` 的最新结果
- 是否存在未解决风险

---

## Notes for Executor

- 严格按 TDD 执行：每个行为先补失败测试，再改实现。
- 不要为了这次需求去重构整个手势层。
- 如果发现 `Swipeable` 无法提供足够的拖动进度供“跟手位移”使用，先停下来回报；不要私自切换到全自定义 pan 手势。
- 如果需要读取拖动进度，优先调查 `renderRightActions(progress, dragX)` 或 `onSwipeableOpenStartDrag` 一类现有回调是否足够，不要直接重写交互。
