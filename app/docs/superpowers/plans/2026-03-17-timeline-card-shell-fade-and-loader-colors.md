# Timeline 卡片整壳入场与加载点配色 Implementation Plan

> **For agentic workers:** REQUIRED: Use @superpowers:subagent-driven-development (if subagents available) or @superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让整张卡片壳体一起 `FadeInRight` 入场，并让视图切换时的 3 个加载点分别使用文字、照片、语音三种主题色，同时保持卡片移除时无退出动画。

**Architecture:** [src/components/Timeline.v2.tsx](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/Timeline.v2.tsx) 继续负责错峰 `enterDelay` 和 `DotsLoader`，但不承担整行卡片动画。[src/components/EntryCard.tsx](/Users/cooper/Documents/code/MemoryCapsule/app/src/components/EntryCard.tsx) 负责把 `FadeInRight` 从内部内容层上移到最外层卡片容器，让阴影、圆角背景和内容作为一个整体进入；时间点和时间文本保持静态。

**Tech Stack:** React Native, TypeScript, react-native-reanimated, Jest, @testing-library/react-native

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/EntryCard.tsx` | 修改 | 将 `FadeInRight` 从内部内容层移动到最外层卡片容器 |
| `src/components/Timeline.v2.tsx` | 修改 | 让 `DotsLoader` 的 3 个点分别使用三种主题色，并在需要时补充 `testID` 便于断言 |
| `src/components/__tests__/EntryCard.test.tsx` | 修改 | 更新 entering 挂载点测试，验证动画移到整张卡片容器且无 `exiting` |
| `src/components/__tests__/Timeline.v2.view-mode.test.tsx` | 修改 | 补 `DotsLoader` 三色断言，保留 `enterDelay` 和稳定 key 回归 |
| `src/components/__tests__/EntryCard.missing-media.test.tsx` | 只运行，不改动 | 确认媒体相关交互不因动画层级变化而回归 |

---

## Chunk 1: 测试先行

### 任务 1: 更新 EntryCard 测试，锁定 entering 迁移到整卡容器

**Files:**
- Modify: `src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: 写失败测试，验证最外层卡片容器承担 entering**

在现有 `FadeInRight` 测试基础上改成检查 `testID="entry-card-container"` 对应节点，而不是检查内部 `layout` 容器。

示例：

```tsx
it('applies FadeInRight entering on the outer card container with no exiting animation', () => {
  const screen = render(
    <EntryCard entry={mockEntry} onDelete={jest.fn()} enterDelay={120} />
  );

  const outerCard = screen.getByTestId('entry-card-container');

  expect(outerCard.props.entering).toBeDefined();
  expect(outerCard.props.exiting).toBeUndefined();
  expect((ReanimatedModule as any).__mockFadeInRight.duration).toHaveBeenCalledWith(expect.any(Number));
  expect((ReanimatedModule as any).__mockFadeInRight.delay).toHaveBeenCalledWith(120);
});
```

并删除或替换原来通过 `layout != null` 寻找内部节点的断言，避免测试继续绑定旧实现。

- [ ] **Step 2: 运行测试，确认它先失败**

Run:
```bash
pnpm test -- src/components/__tests__/EntryCard.test.tsx --runInBand
```

Expected:
- FAIL
- 失败原因应是 `entry-card-container` 当前还没有 `entering`

- [ ] **Step 3: Commit**

```bash
git add src/components/__tests__/EntryCard.test.tsx
git commit -m "test: cover shell-level fade in right entering"
```

---

### 任务 2: 给 DotsLoader 补三色加载点测试

**Files:**
- Modify: `src/components/__tests__/Timeline.v2.view-mode.test.tsx`
- Modify: `src/components/Timeline.v2.tsx`（仅当需要增加 `testID` 才动）

- [ ] **Step 1: 写失败测试，锁定 3 个加载点颜色**

先在测试中触发视图切换，使 `isTransitioning` 为 `true`，然后直接断言 3 个点的颜色。

为了让测试稳定，建议先给 3 个点分别增加：

```tsx
testID="view-loader-dot-text"
testID="view-loader-dot-photo"
testID="view-loader-dot-voice"
```

然后测试写成：

```tsx
it('renders loader dots with text, photo, and voice theme colors during view transition', () => {
  const screen = render(<Timeline />);

  fireEvent.press(screen.getByTestId('searchbar-view-mode-toggle'));
  fireEvent.press(screen.getByText('按月'));

  expect(screen.getByTestId('view-loader-dot-text')).toHaveStyle({ backgroundColor: '#A491D3' });
  expect(screen.getByTestId('view-loader-dot-photo')).toHaveStyle({ backgroundColor: '#77C9D4' });
  expect(screen.getByTestId('view-loader-dot-voice')).toHaveStyle({ backgroundColor: '#F5A623' });
});
```

这条测试不要先推进 600ms 定时器，因为要验证的是过渡中的 loader。

- [ ] **Step 2: 运行测试，确认它先失败**

Run:
```bash
pnpm test -- src/components/__tests__/Timeline.v2.view-mode.test.tsx --runInBand
```

Expected:
- FAIL
- 失败原因应是找不到这 3 个 loader dot，或者颜色仍是当前统一的 `#8B7355`

- [ ] **Step 3: Commit**

```bash
git add src/components/__tests__/Timeline.v2.view-mode.test.tsx
git commit -m "test: cover themed timeline loader dots"
```

---

## Chunk 2: 最小实现

### 任务 3: 把 FadeInRight 从内容层上移到整张卡片容器

**Files:**
- Modify: `src/components/EntryCard.tsx`
- Test: `src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: 将 `entering={FadeInRight...}` 挪到最外层 `entry-card-container`**

把当前结构从：

```tsx
<Animated.View testID="entry-card-container" style={[...]}>
  <Pressable ...>
    <Animated.View
      entering={FadeInRight.duration(360).delay(enterDelay)}
      layout={Layout.springify()}
    >
```

改成：

```tsx
<Animated.View
  testID="entry-card-container"
  entering={FadeInRight.duration(360).delay(enterDelay)}
  style={[...]}
>
  <Pressable ...>
    <Animated.View layout={Layout.springify()}>
```

注意：
- 只迁移 entering，不新增 `exiting`
- 内层内容容器去掉 entering，避免双重进场

- [ ] **Step 2: 确认 `cardAnimatedStyle` 与 entering 共存**

保持：

```tsx
style={[
  styles.cardShadow,
  cardAnimatedStyle,
  { backgroundColor: ..., marginBottom: cardSpacing },
]}
```

不要改动卡片左滑位移或按压背景逻辑。

- [ ] **Step 3: 运行 EntryCard 测试，确认转绿**

Run:
```bash
pnpm test -- src/components/__tests__/EntryCard.test.tsx --runInBand
```

Expected:
- PASS
- 新测试通过
- 既有滑动、长按、ActionSheet 行为测试继续通过

- [ ] **Step 4: Commit**

```bash
git add src/components/EntryCard.tsx src/components/__tests__/EntryCard.test.tsx
git commit -m "feat: animate timeline card shells with fade in right"
```

---

### 任务 4: 将 DotsLoader 改成三种主题色

**Files:**
- Modify: `src/components/Timeline.v2.tsx`
- Test: `src/components/__tests__/Timeline.v2.view-mode.test.tsx`

- [ ] **Step 1: 给 3 个点显式分配主题色**

把当前统一 `dotStyle.backgroundColor` 改成按点单独指定：

```tsx
const DOT_COLORS = {
  text: '#A491D3',
  photo: '#77C9D4',
  voice: '#F5A623',
};
```

然后渲染成：

```tsx
<RNAnimated.View
  testID="view-loader-dot-text"
  style={[dotStyle, { backgroundColor: DOT_COLORS.text, transform: [{ translateY: dot1 }] }]}
/>
<RNAnimated.View
  testID="view-loader-dot-photo"
  style={[dotStyle, { backgroundColor: DOT_COLORS.photo, transform: [{ translateY: dot2 }] }]}
/>
<RNAnimated.View
  testID="view-loader-dot-voice"
  style={[dotStyle, { backgroundColor: DOT_COLORS.voice, transform: [{ translateY: dot3 }] }]}
/>
```

保留：
- 跳动顺序
- `setTimeout` 节奏
- 点尺寸和间距

- [ ] **Step 2: 运行 Timeline 测试，确认转绿**

Run:
```bash
pnpm test -- src/components/__tests__/Timeline.v2.view-mode.test.tsx --runInBand
```

Expected:
- PASS
- 稳定 key 和 enterDelay 测试继续通过
- 新增 loader 三色测试通过

- [ ] **Step 3: Commit**

```bash
git add src/components/Timeline.v2.tsx src/components/__tests__/Timeline.v2.view-mode.test.tsx
git commit -m "feat: use themed colors for timeline loader dots"
```

---

## Chunk 3: 全量验证

### 任务 5: 回归验证动画和主题色改动

**Files:**
- Modify: none

- [ ] **Step 1: 运行相关自动化测试**

Run:
```bash
pnpm test -- src/components/__tests__/Timeline.v2.view-mode.test.tsx src/components/__tests__/EntryCard.test.tsx src/components/__tests__/EntryCard.missing-media.test.tsx --runInBand
```

Expected:
- PASS
- 整卡 entering 测试通过
- loader 三色测试通过
- 媒体卡片交互不回归

- [ ] **Step 2: 运行完整测试和类型检查**

Run:
```bash
pnpm test --runInBand
pnpm run typecheck
```

Expected:
- 全量 Jest 通过
- TypeScript 无错误

- [ ] **Step 3: 手工验证**

Run:
```bash
pnpm start
```

检查清单：
- 首次进入时间轴时，整张卡片壳体一起 `FadeInRight`
- 时间点圆点和时间文本不动
- 列表 / 按月切换时旧卡片直接消失，新卡片整体进入
- 左滑、长按、点击、ActionSheet 交互正常
- 过渡中的 3 个加载点分别是紫、青、橙
- 不重新出现粗框残影

- [ ] **Step 4: Commit**

```bash
git add src/components/EntryCard.tsx src/components/Timeline.v2.tsx src/components/__tests__/EntryCard.test.tsx src/components/__tests__/Timeline.v2.view-mode.test.tsx
git commit -m "fix: animate full timeline cards and theme loader dots"
```

---

## 完成标准

- `FadeInRight` 挂在整张卡片容器而不是仅内容层
- 时间点圆点和时间文本不参与入场动画
- `DotsLoader` 三个点分别对应文字、照片、语音主题色
- 卡片移除时仍无退出动画
- 自动化测试和 `typecheck` 通过
- 手工确认没有引入粗框残影
