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
| 3 | state 区块 | 新增 `useEffect` 监听 `viewMode`，驱动淡出→切换→淡入动画序列 |
| 4 | sections useMemo（约第 406 行） | 依赖由 `[displayEntries, viewMode]` 改为 `[displayEntries, displayMode]`；内部 `viewMode` 改为 `displayMode` |
| 5 | 主内容区（约第 571 行） | `viewMode === 'calendar'` 判断改为 `displayMode === 'calendar'`；`viewMode === 'list'` 改为 `displayMode === 'list'` |
| 6 | 主内容区外层 | 用 `RNAnimated.View style={{ flex: 1, opacity: fadeAnim }}` 包裹整个内容区（calendar / emptyState / SectionList 三个分支） |
| 7 | `EntryMarker`（约第 291 行） | 移除 `entering={FadeIn.duration(200)}`，避免容器淡入时每张卡片再次双重淡入；保留 `exiting={FadeOut.duration(200)}` 和 `layout={LinearTransition.duration(200)}` 用于单条记录删除/编辑的局部动画 |

### useEffect 逻辑

```tsx
useEffect(() => {
  if (displayMode === viewMode) return;
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
}, [viewMode]);
```

### 保留项

- `handleToggleViewMode`（收起时重置 `viewMode` 为 `'list'`）保持不变，`displayMode` 会通过动画序列自动跟上
- `EntryMarker` 的 `exiting` 和 `layout` 动画保留，用于单条记录的增删动画

## 改动范围

```
修改  app/src/components/Timeline.v2.tsx
```

无新文件，无接口变更，无状态层改动。
