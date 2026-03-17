# Timeline 视图切换圆点加载动画设计

**日期**: 2026-03-17
**状态**: 已批准

## 背景

列表/按月/日历视图切换时，之前的淡出淡入过渡效果不够理想。改为：切换时显示三圆点弹跳加载动画（至少 600ms），动画结束后卡片从上到下逐个入场，视觉节奏更清晰自然。

## 方案：isTransitioning 状态 + SectionList key 强制重挂

### 核心机制

1. 用户点击视图 Tab → `viewMode` 更新
2. `useEffect` 监听 `viewMode` → 设 `isTransitioning = true`（显示圆点动画，隐藏内容区）
3. 600ms 后 → `displayMode = viewMode`，`animationEpoch++`，`isTransitioning = false`
4. 内容区恢复显示，`animationEpoch` 导致 `keyExtractor` 变化 → SectionList 所有卡片重挂 → `entering` 动画依次触发（80ms 间隔，前 10 张有 delay，之后无额外延迟）

### 收起面板重置场景

收起视图切换面板时若当前非列表模式，需静默重置回列表，不显示圆点动画：
- `handleToggleViewMode` 中设 `skipTransitionRef.current = true`
- 同步调用 `setViewMode('list')` + `setDisplayMode('list')`
- `useEffect` 检测到 `skipTransitionRef.current` 为 true 时，跳过 600ms 等待，直接 return

---

## 改动明细（`app/src/components/Timeline.v2.tsx`）

### 移除（来自上一次 fade 方案）

| 移除项 | 说明 |
|--------|------|
| `fadeAnim` ref | 不再需要 opacity 动画 |
| `skipNextTransition` ref | 替换为 `skipTransitionRef`（逻辑相同，重命名以匹配新方案） |
| 现有 `useEffect`（fade 动画序列） | 替换为新的 isTransitioning useEffect |
| `RNAnimated.View` 包裹层（opacity） | 替换为条件渲染（DotsLoader / 内容区） |

### 新增

| 新增项 | 类型 | 说明 |
|--------|------|------|
| `isTransitioning` | `useState<boolean>(false)` | 控制圆点动画显示 |
| `animationEpoch` | `useState<number>(0)` | 每次切换递增，加入 keyExtractor |
| `skipTransitionRef` | `useRef<boolean>(false)` | 跳过动画标记（收起重置场景） |
| `globalIndexMap` | `useMemo<Map<string, number>>` | 记录每个 entry 的全局位置，用于 stagger delay 计算 |
| `useEffect` | 监听 `[viewMode]` | 切换逻辑：isTransitioning=true → 600ms → 更新 displayMode + animationEpoch + isTransitioning=false |
| `DotsLoader` 组件 | React.FC（文件内定义） | 三圆点弹跳加载动画 |

### 修改

| 位置 | 修改内容 |
|------|---------|
| `sections` useMemo | 依赖保持 `[displayEntries, displayMode]`，内部判断保持 `displayMode`（不变） |
| `keyExtractor` | 改为 `` `${item.id}-${animationEpoch}` `` |
| `renderItem` | 从 `globalIndexMap` 取 globalIndex，传 `enterDelay={Math.min(globalIndex, 10) * 80}` 给 EntryMarker |
| `EntryMarker` props | 新增 `enterDelay: number`（默认 0） |
| `EntryMarker` Animated.View | 新增 `entering={FadeIn.duration(250).delay(enterDelay)}`，保留 `exiting={FadeOut.duration(200)}` 和 `layout={LinearTransition.duration(200)}` |
| `handleToggleViewMode` | 重置时设 `skipTransitionRef.current = true` + 同步 `setDisplayMode('list')`，跳过圆点动画 |
| 主内容区渲染 | `isTransitioning` 为 true → 显示 `<DotsLoader />`；为 false → 显示原内容区三路分支（用 `displayMode` 判断） |

---

## DotsLoader 组件规格

```
位置：Timeline.v2.tsx 文件内，EntryMarker 组件定义之后
```

- **圆点数量**：3 个
- **圆点尺寸**：直径 8px，圆形（`borderRadius: 4`）
- **颜色**：`#8B7355`（与 app 现有棕色调一致）
- **间距**：圆点之间 6px
- **布局**：水平排列，外层 View `flex: 1`，`justifyContent: 'center'`，`alignItems: 'center'`
- **动画**：每个点用 `RNAnimated.loop(RNAnimated.sequence([...]))` 做 Y 轴位移
  - 向上 -8px（duration: 200ms）→ 回原位 0px（duration: 200ms）
  - 循环：不传 `iterations`（默认无限循环）
- **错开**：第 1 个点立即启动，第 2 个延迟 150ms，第 3 个延迟 300ms（用 `useEffect` + `setTimeout` 延迟启动后两个点的动画）
- **清理**：`useEffect` cleanup 中停止所有动画（`.stop()`），清理 setTimeout

---

## globalIndexMap 计算

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

---

## useEffect 逻辑

首次挂载时需跳过（否则初始加载会出现 600ms 圆点动画），用 `isInitialMountRef` ref 标记：

```tsx
useEffect(() => {
  // 首次挂载跳过
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

新增 ref：`const isInitialMountRef = useRef(true);`

---

## handleToggleViewMode 改动

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

## 卡片入场 delay 规则

| globalIndex | enterDelay |
|-------------|------------|
| 0 | 0ms |
| 1 | 80ms |
| 2 | 160ms |
| ... | ... |
| 10 | 800ms |
| 11+ | 800ms（封顶） |

---

## viewMode vs displayMode 使用区分

| 用途 | 使用哪个 |
|------|---------|
| `sections` useMemo 数据分组 | `displayMode` |
| 主内容区渲染分支判断 | `displayMode` |
| `ViewModeToggle current=` 选中态 | `viewMode` |
| `handleToggleViewMode` 重置判断 | `viewMode` |
| `useEffect` 依赖 | `[viewMode]` |
| `isTransitioning` 控制圆点显示 | — |

---

## calendar 模式说明

切换到 `calendar` 模式（或从 `calendar` 切出）时，同样会显示 600ms 圆点动画，但 `CalendarView` 组件不是 SectionList，无 stagger 入场效果。这是预期行为：calendar 模式本身无卡片列表，不需要逐个入场动画。

## 性能说明

`animationEpoch` 加入 `keyExtractor` 会导致 SectionList 在视图切换时认为所有 item 均为新条目，触发全量卸载 + 重挂。由于 SectionList 启用了虚拟化（`initialNumToRender=10`，`windowSize=21`），实际同时挂载的卡片数量有限（可视区域内约 10-15 张），全量 key 变更的实际性能影响可接受。

## 改动范围

```
修改  app/src/components/Timeline.v2.tsx
```

无新文件，无接口变更，无状态层改动。
