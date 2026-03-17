# Timeline 视图切换圆点加载动画 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 视图模式切换时显示三圆点弹跳加载动画（600ms），结束后卡片从上到下依次入场（80ms 间隔，前 10 张有 delay）。

**Architecture:** 用 `isTransitioning` 控制圆点动画显示，`useEffect` 监听 `viewMode` 变化后启动 600ms 定时器，期满后更新 `displayMode` + 递增 `animationEpoch`。`animationEpoch` 加入 `keyExtractor`，触发 SectionList 卡片重挂，`entering` 动画依次按 delay 播放。

**Tech Stack:** React Native `Animated as RNAnimated`，react-native-reanimated `FadeIn / FadeOut / LinearTransition`，TypeScript。

---

## 改动文件

| 操作 | 文件 |
|------|------|
| 修改 | `app/src/components/Timeline.v2.tsx` |

---

### Step 1：确认基线测试通过

- [ ] 运行测试：

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app && npx jest --passWithNoTests 2>&1 | tail -5
```

预期：所有测试通过（当前 132/132）。

---

### Step 2：新增 `DotsLoader` 组件

定位 `EntryMarker` 末尾（搜索 EntryMarker 组件后最后的 `}`）：

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app && grep -n "^const EntryMarker\|^});$\|^}$" src/components/Timeline.v2.tsx | head -20
```

在 `EntryMarker` 组件定义结束后插入 `DotsLoader` 组件（在文件中 `EntryMarker` 的 `});` 行之后，`const Timeline` 行之前）：

- [ ] 插入以下完整组件：

```tsx
const DotsLoader: React.FC = () => {
  const dot1 = useRef(new RNAnimated.Value(0)).current;
  const dot2 = useRef(new RNAnimated.Value(0)).current;
  const dot3 = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const makeBounce = (anim: RNAnimated.Value) =>
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(anim, { toValue: -8, duration: 200, useNativeDriver: true }),
          RNAnimated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ])
      );

    const a1 = makeBounce(dot1);
    let t2: ReturnType<typeof setTimeout>;
    let t3: ReturnType<typeof setTimeout>;
    let a2: RNAnimated.CompositeAnimation;
    let a3: RNAnimated.CompositeAnimation;

    a1.start();
    t2 = setTimeout(() => { a2 = makeBounce(dot2); a2.start(); }, 150);
    t3 = setTimeout(() => { a3 = makeBounce(dot3); a3.start(); }, 300);

    return () => {
      a1.stop();
      clearTimeout(t2);
      clearTimeout(t3);
      if (a2) a2.stop();
      if (a3) a3.stop();
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B7355',
    marginHorizontal: 3,
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <RNAnimated.View style={[dotStyle, { transform: [{ translateY: dot1 }] }]} />
        <RNAnimated.View style={[dotStyle, { transform: [{ translateY: dot2 }] }]} />
        <RNAnimated.View style={[dotStyle, { transform: [{ translateY: dot3 }] }]} />
      </View>
    </View>
  );
};
```

---

### Step 3：更新 `EntryMarkerProps` 和 `EntryMarker` 组件

- [ ] 定位 `EntryMarkerProps` 接口：

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app && grep -n "EntryMarkerProps\|cardSpacing: number" src/components/Timeline.v2.tsx
```

在 `EntryMarkerProps` 接口的 `cardSpacing: number;` 行后增加：

```ts
  enterDelay?: number;
```

- [ ] 定位 `EntryMarker` 函数参数的解构列表，在 `cardSpacing,` 行后增加：

```ts
  enterDelay = 0,
```

- [ ] 定位 `EntryMarker` 内的 `Animated.View`（当前只有 `exiting` 和 `layout`）：

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app && grep -n "exiting={FadeOut.duration(200)}" src/components/Timeline.v2.tsx
```

将该 `Animated.View` 的开标签改为：

```tsx
    <Animated.View
      entering={FadeIn.duration(250).delay(enterDelay)}
      exiting={FadeOut.duration(200)}
      layout={LinearTransition.duration(200)}
      style={{ paddingLeft: 64, paddingRight: 24, paddingBottom: isLast ? 0 : cardSpacing, position: 'relative' }}
    >
```

---

### Step 4：替换旧 fade 方案 state/refs，新增新方案 state/refs

定位现有 state 声明区域：

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app && grep -n "fadeAnim\|skipNextTransition\|displayMode\|viewMode" src/components/Timeline.v2.tsx | head -20
```

- [ ] 将以下三行（旧 fade 方案）：

```tsx
  const [displayMode, setDisplayMode] = useState<ViewMode>('list');
  const fadeAnim = useRef(new RNAnimated.Value(1)).current;
  const skipNextTransition = useRef(false);
```

替换为（新方案，紧随 `viewMode` state 之后）：

```tsx
  const [displayMode, setDisplayMode] = useState<ViewMode>('list');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [animationEpoch, setAnimationEpoch] = useState(0);
  const skipTransitionRef = useRef(false);
  const isInitialMountRef = useRef(true);
```

---

### Step 5：替换旧 `useEffect`（fade 动画），新增切换过渡 `useEffect` 和 `globalIndexMap`

- [ ] 定位旧 `useEffect`（视图切换淡出→更新→淡入）：

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app && grep -n "视图切换淡出\|displayMode === viewMode\|skipNextTransition.current" src/components/Timeline.v2.tsx
```

将整个旧 `useEffect` 块（从 `// 视图切换淡出→更新→淡入` 到 `}, [viewMode, displayMode]);`）替换为：

```tsx
  // 视图切换圆点动画：viewMode 变化 → 显示圆点 600ms → 更新 displayMode → 卡片入场
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    if (skipTransitionRef.current) {
      skipTransitionRef.current = false;
      return;
    }
    setIsTransitioning(true);
    const timer = setTimeout(() => {
      setDisplayMode(viewMode);
      setAnimationEpoch(e => e + 1);
      setIsTransitioning(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [viewMode]);
```

- [ ] 在 `sections` useMemo 之后，`hasEntries` 之前，新增 `globalIndexMap` useMemo：

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app && grep -n "hasEntries = displayEntries" src/components/Timeline.v2.tsx
```

在该行之前插入：

```tsx
  // 记录每个 entry 的全局位置，用于计算卡片入场 stagger delay
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

---

### Step 6：更新 `keyExtractor`

- [ ] 定位 `keyExtractor`：

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app && grep -n "keyExtractor\|item.id" src/components/Timeline.v2.tsx | head -10
```

将 `keyExtractor` 的 useCallback 改为（需让 animationEpoch 加入依赖）：

```tsx
  const keyExtractor = useCallback((item: Entry) => {
    return `${item.id}-${animationEpoch}`;
  }, [animationEpoch]);
```

---

### Step 7：更新 `renderItem`，传递 `enterDelay`

- [ ] 定位 `renderItem`：

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app && grep -n "const renderItem\|isLast = index" src/components/Timeline.v2.tsx
```

将 `renderItem` 函数体改为（增加 globalIndex 计算和 enterDelay 传递）：

```tsx
  const renderItem = useCallback(({ item, index, section }: { item: Entry; index: number; section: TimeSection }) => {
    const isLast = index === section.data.length - 1;
    const globalIndex = globalIndexMap.get(item.id) ?? 0;
    const enterDelay = Math.min(globalIndex, 10) * 80;
    return (
      <EntryMarker
        entry={item}
        onDeleteEntry={deleteEntry}
        onEditEntry={handleEditEntry}
        onPauseRecording={onPauseRecording}
        onResumeRecording={onResumeRecording}
        onStopRecording={onStopRecording}
        isActionSheetActive={activeActionSheetId === item.id}
        onActionSheetOpen={handleActionSheetOpen}
        isLast={isLast}
        cardSpacing={cardSpacing}
        enterDelay={enterDelay}
      />
    );
  }, [activeActionSheetId, cardSpacing, deleteEntry, globalIndexMap, handleActionSheetOpen, handleEditEntry, onPauseRecording, onResumeRecording, onStopRecording]);
```

---

### Step 8：更新 `handleToggleViewMode`

- [ ] 定位 `handleToggleViewMode`：

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app && grep -n "handleToggleViewMode\|skipNextTransition" src/components/Timeline.v2.tsx
```

将整个 `handleToggleViewMode` 函数替换为：

```tsx
  const handleToggleViewMode = () => {
    if (showViewToggle && viewMode !== 'list') {
      skipTransitionRef.current = true;
      setViewMode('list');
      setDisplayMode('list');
    }
    setShowViewToggle(v => !v);
  };
```

---

### Step 9：更新主内容区渲染（原子替换整个 `RNAnimated.View` 块）

- [ ] 先定位整个块的边界，确认行号：

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app && grep -n "opacity: fadeAnim\|连续的时间线 - 仅列表模式显示\|windowSize={21}\|</RNAnimated.View>" src/components/Timeline.v2.tsx
```

输出中会列出多个 `</RNAnimated.View>`，主内容区的那个紧跟在 `windowSize={21}` 所在 SectionList 关闭 `/>` 之后的内层 `</View>` 之后，行号较小的那个（另一个在更下方，属于返回顶部按钮）。

将从 `<RNAnimated.View style={{ flex: 1, opacity: fadeAnim }}>` 开始，到其对应的 `</RNAnimated.View>`（紧跟在 `windowSize={21}` 所在 SectionList 关闭标签 `/>` 之后的 `</View>` 和 `</RNAnimated.View>` 那两行）结束的**整个代码块**一次性替换为：

```tsx
      {isTransitioning ? (
        <DotsLoader />
      ) : displayMode === 'calendar' ? (
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
```

**注意**：这是一次原子替换，必须同时覆盖开标签 `<RNAnimated.View ...>` 和结束标签 `</RNAnimated.View>`，不可分两次操作。文件中 `</RNAnimated.View>` 出现多次，务必只替换主内容区对应的那一个（紧跟在 SectionList 内层 `</View>` 之后的那个）。

---

### Step 10：TypeScript 检查

- [ ] 运行 TypeScript 检查：

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app && npx tsc --noEmit 2>&1 | head -30
```

预期：0 个错误。若有错误，检查并修复后重新运行。

---

### Step 11：运行测试

- [ ] 运行测试：

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app && npx jest --passWithNoTests 2>&1 | tail -5
```

预期：全部通过（132/132）。

---

### Step 12：提交

- [ ] 提交代码：

```bash
cd /Users/cooper/Documents/code/MemoryCapsule && git add app/src/components/Timeline.v2.tsx && git commit -m "feat: add dots loader animation for timeline view mode switching"
```
