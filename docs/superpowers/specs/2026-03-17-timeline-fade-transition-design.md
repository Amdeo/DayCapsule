# Timeline 视图切换淡入淡出过渡设计

**日期**: 2026-03-17
**状态**: 已批准

## 背景

列表/按月视图切换时，卡片逐个重新动画效果不理想（图片卡片跳动明显）。改为整体内容区淡出→淡入过渡，视觉更平滑自然。

## 方案：容器级淡入淡出（displayMode 延迟状态）

### 核心机制

引入 `displayMode` state（延迟跟随 `viewMode`）：

1. 用户切换 Tab → `viewMode` 更新
2. `useEffect` 监听 `viewMode` 变化 → 触发容器淡出（150ms）
3. 淡出完成回调 → 更新 `displayMode` → sections 重新计算（切换数据）
4. 立即触发容器淡入（200ms）

`sections` 的 `useMemo` 依赖 `displayMode`（而非 `viewMode`），确保数据切换发生在淡出完成之后。

### 改动明细（`app/src/components/Timeline.v2.tsx`）

| # | 位置 | 改动内容 |
|---|------|----------|
| 1 | state 区块（约第 387 行附近） | 新增 `const [displayMode, setDisplayMode] = useState<ViewMode>('list')` |
| 2 | state 区块 | 新增 `const fadeAnim = useRef(new RNAnimated.Value(1)).current`（`RNAnimated` 已 import） |
| 3 | state 区块 | 新增 `skipNextTransition` ref：`const skipNextTransition = useRef(false)`，用于收起重置场景跳过动画 |
| 4 | state 区块 | 新增 `useEffect` 监听 `viewMode` 和 `displayMode`，驱动淡出→切换→淡入动画序列（依赖数组 `[viewMode, displayMode]`） |
| 5 | sections useMemo（约第 406 行） | 依赖由 `[displayEntries, viewMode]` 改为 `[displayEntries, displayMode]`；内部 `viewMode` 改为 `displayMode` |
| 6 | 主内容区（约第 571 行） | 渲染数据用 `displayMode`：`displayMode === 'calendar'`（第一分支）；第三分支（else）隐式由 `displayMode` 控制（即 list/monthly 均走 SectionList）。**注意：** `ViewModeToggle` 的 `current={viewMode}` 保持不变（反映用户选中意图），`handleToggleViewMode` 中的 `viewMode !== 'list'` 判断保持不变 |
| 7 | 主内容区外层 | 用 `RNAnimated.View style={{ flex: 1, opacity: fadeAnim }}` 包裹整个内容区（calendar / emptyState / SectionList 三个分支） |
| 8 | `EntryMarker`（约第 291 行） | 移除 `entering={FadeIn.duration(200)}`，避免容器淡入时每张卡片再次双重淡入；保留 `exiting={FadeOut.duration(200)}` 和 `layout={LinearTransition.duration(200)}` |
| 9 | `handleToggleViewMode`（约第 427 行） | 重置前设置 `skipNextTransition.current = true`，跳过动画直接同步 displayMode |

### useEffect 逻辑

```tsx
useEffect(() => {
  if (displayMode === viewMode) return;
  // 收起重置场景：跳过动画直接同步
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

### handleToggleViewMode 改动

```tsx
const handleToggleViewMode = () => {
  if (showViewToggle && viewMode !== 'list') {
    skipNextTransition.current = true; // 新增：跳过淡出动画
    setViewMode('list');
  }
  setShowViewToggle(v => !v);
};
```

### viewMode vs displayMode 使用区分

| 用途 | 使用哪个 |
|------|---------|
| `sections` useMemo 数据分组 | `displayMode` |
| 主内容区渲染分支判断 | `displayMode` |
| `ViewModeToggle current=` 选中态 | `viewMode`（反映用户意图） |
| `handleToggleViewMode` 重置判断 | `viewMode` |
| `useEffect` 依赖 | `[viewMode, displayMode]` |

### 保留项

- `EntryMarker` 的 `exiting` 和 `layout` 动画保留，用于单条记录的增删动画

## 改动范围

```
修改  app/src/components/Timeline.v2.tsx
```

无新文件，无接口变更，无状态层改动。
