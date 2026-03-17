# Timeline 视图切换淡入淡出过渡实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 视图模式切换时整体内容区淡出（150ms）→ 切换数据 → 淡入（200ms），消除卡片逐个弹跳问题。

**Architecture:** 引入 `displayMode` state 延迟跟随 `viewMode`，`fadeAnim` 驱动容器透明度，`skipNextTransition` ref 处理收起重置场景跳过动画。所有修改集中在 `Timeline.v2.tsx` 的 `Timeline` 组件函数体内。

**Tech Stack:** React Native `Animated`（已 import 为 `RNAnimated`），`useState`、`useRef`、`useEffect`（已 import）

---

## Chunk 1: 实现淡入淡出过渡

### Task 1: 添加状态、refs 和动画 useEffect

**Files:**
- Modify: `app/src/components/Timeline.v2.tsx`

**当前代码参考（实施前请先阅读确认行号）：**
- 第 387 行：`const [viewMode, setViewMode] = useState<ViewMode>('list');`
- 第 396-398 行：现有 `RNAnimated` refs（`scrollTopOpacity`、`scrollTopScale`、`lastScrollY`）
- 第 406-409 行：`sections` useMemo
- 第 427-430 行：`handleToggleViewMode`
- 第 571 行：`{viewMode === 'calendar' ? ...`（主内容渲染起点）
- 第 291 行：`entering={FadeIn.duration(200)}`（EntryMarker）

---

- [ ] **Step 1: 确认基线测试通过**

```bash
cd app && npx jest --passWithNoTests 2>&1 | tail -5
```

预期：所有测试通过。

- [ ] **Step 2: 在 `viewMode` state 之后新增 `displayMode` state 和两个 refs**

在第 387 行 `const [viewMode, setViewMode] = useState<ViewMode>('list');` 之后，插入：

```tsx
const [displayMode, setDisplayMode] = useState<ViewMode>('list');
const fadeAnim = useRef(new RNAnimated.Value(1)).current;
const skipNextTransition = useRef(false);
```

- [ ] **Step 3: 在 `sections` useMemo 之前新增动画 useEffect**

在第 406 行 `// 生成时间分组数据` 注释之前，插入：

```tsx
// 视图切换淡出→更新→淡入
useEffect(() => {
  if (displayMode === viewMode) return;
  if (skipNextTransition.current) {
    skipNextTransition.current = false;
    setDisplayMode(viewMode);
    fadeAnim.setValue(1);
    return;
  }
  RNAnimated.timing(fadeAnim, {
    toValue: 0,
    duration: 150,
    useNativeDriver: true,
  }).start(() => {
    setDisplayMode(viewMode);
    RNAnimated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  });
}, [viewMode, displayMode]);
```

- [ ] **Step 4: 将 sections useMemo 的依赖和内部引用由 `viewMode` 改为 `displayMode`**

**注意：** Step 3 插入了新代码，`sections` useMemo 的行号已向下偏移。请用以下命令定位当前行号：

```bash
cd app && grep -n "if (viewMode === 'monthly')" src/components/Timeline.v2.tsx
```

找到该行后，将 useMemo 内部 `viewMode` 改为 `displayMode`，依赖数组 `[displayEntries, viewMode]` 改为 `[displayEntries, displayMode]`：

```tsx
const sections = useMemo(() => {
  if (displayMode === 'monthly') return generateMonthlySections(displayEntries);
  return generateTimeSections(displayEntries);
}, [displayEntries, displayMode]);
```

- [ ] **Step 5: 更新 `handleToggleViewMode`，收起重置时跳过动画**

将：
```tsx
const handleToggleViewMode = () => {
  if (showViewToggle && viewMode !== 'list') setViewMode('list');
  setShowViewToggle(v => !v);
};
```
改为：
```tsx
const handleToggleViewMode = () => {
  if (showViewToggle && viewMode !== 'list') {
    skipNextTransition.current = true;
    setViewMode('list');
  }
  setShowViewToggle(v => !v);
};
```

- [ ] **Step 6: 用 `RNAnimated.View` 包裹主内容区，并将渲染分支改用 `displayMode`**

先定位三路分支当前行号（Step 3 插入约 20 行后行号已偏移）：

```bash
cd app && grep -n "viewMode === 'calendar'" src/components/Timeline.v2.tsx
```

找到该行后，定位其所在的三路分支：
```tsx
{viewMode === 'calendar' ? (
  <CalendarView entries={displayEntries} />
) : !hasEntries ? (
  <EmptyState />
) : (
  <View style={{ flex: 1, position: 'relative' }}>
    {/* ... */}
  </View>
)}
```

替换为（用 `RNAnimated.View` 包裹，分支判断改用 `displayMode`）：
```tsx
<RNAnimated.View style={{ flex: 1, opacity: fadeAnim }}>
  {displayMode === 'calendar' ? (
    <CalendarView entries={displayEntries} />
  ) : !hasEntries ? (
    <EmptyState />
  ) : (
    <View style={{ flex: 1, position: 'relative' }}>
      {/* 连续的时间线 - 仅列表模式显示 */}
      <View
        style={{
          position: 'absolute',
          left: timelineLeft,
          top: 0,
          bottom: 0,
          width: 2,
          backgroundColor: '#E5E5E5',
          zIndex: 0,
        }}
      />

      <SectionList<Entry, TimeSection>
        ref={sectionListRef}
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={true}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        onEndReached={() => { if (hasMore) loadMore(); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isLoadingMore ? (
          <ActivityIndicator size="small" color="#8B7355" style={{ paddingVertical: 16 }} />
        ) : null}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={21}
      />
    </View>
  )}
</RNAnimated.View>
```

- [ ] **Step 6b: 验证 `ViewModeToggle` 的 `current` prop 未被误改**

```bash
cd app && grep -n "ViewModeToggle" src/components/Timeline.v2.tsx
```

预期输出中必须包含 `current={viewMode}`（不是 `current={displayMode}`）。`ViewModeToggle` 反映用户选中意图，必须保持 `viewMode`。

- [ ] **Step 7: 移除 `EntryMarker` 的 `entering` 属性**

定位 `EntryMarker` 的 `Animated.View`（搜索 `entering={FadeIn`）：

```bash
cd app && grep -n "entering={FadeIn" src/components/Timeline.v2.tsx
```

将该行所在的 `Animated.View` 从：
```tsx
<Animated.View
  entering={FadeIn.duration(200)}
  exiting={FadeOut.duration(200)}
  layout={LinearTransition.duration(200)}
  style={{ paddingLeft: 64, paddingRight: 24, paddingBottom: isLast ? 0 : cardSpacing, position: 'relative' }}
>
```
改为：
```tsx
<Animated.View
  exiting={FadeOut.duration(200)}
  layout={LinearTransition.duration(200)}
  style={{ paddingLeft: 64, paddingRight: 24, paddingBottom: isLast ? 0 : cardSpacing, position: 'relative' }}
>
```

- [ ] **Step 8: TypeScript 检查**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

预期：0 个错误。若报 `useEffect` 相关 lint 警告（exhaustive-deps），确认依赖数组为 `[viewMode, displayMode]` 即可。

- [ ] **Step 9: 运行测试**

```bash
cd app && npx jest --passWithNoTests 2>&1 | tail -5
```

预期：所有测试通过。

- [ ] **Step 10: 提交**

```bash
cd app && git add src/components/Timeline.v2.tsx && git commit -m "feat: add fade transition for view mode switching in Timeline"
```
