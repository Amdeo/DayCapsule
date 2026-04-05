# 卡片显示模式设计文档

**日期**: 2026-04-06
**状态**: 已批准，待实现

---

## 背景

当前时间线支持两种显示模式：`list`（时间线）和 `calendar`（日历）。用户希望新增第三种模式——纯卡片模式，同时将现有 `list` 模式重命名为 `timeline`，语义更准确。

---

## 目标

1. 新增 `card` 显示模式：单列卡片平铺，保留日期分组标题，去掉时间轴元素
2. 将 `list` 重命名为 `timeline`，行为不变
3. 模式切换控件改为 Segmented Control（三段式）

---

## 设计决策

### ViewMode 类型

```typescript
// 原来
export type ViewMode = 'list' | 'calendar';

// 新
export type ViewMode = 'timeline' | 'card' | 'calendar';
```

### card 模式行为

- **布局**：单列，每张卡片占满全宽，与 `timeline` 模式一致
- **数据结构**：仍使用 `SectionList`，按日期分组，复用现有 `generateTimeSections` 逻辑
- **日期分组标题**：沿用 `timeline` 模式的原版 section header 样式（"今天"、"昨天"、"3月28日"）
- **卡片内容**：完全复用现有 `EntryCard` 组件，不新增样式
- **时间轴元素**：隐藏每条 entry 左侧的竖线和圆点 marker（`TimelineEntryMarker`）

### 模式切换控件

将现有图标按钮组（`TimelineViewModeToggle`）改为 iOS 原生风格的 Segmented Control，三个选项：

```
[ 时间线 | 卡片 | 日历 ]
```

---

## 变更文件清单

| 文件 | 变更内容 |
|------|---------|
| `src/components/timeline-v2/timelineTypes.ts` | `ViewMode` 类型：`'list'` → `'timeline'`，新增 `'card'` |
| `src/components/timeline-v2/useTimelineController.ts` | 处理 `'card'` 模式；将 `'list'` 引用改为 `'timeline'` |
| `src/components/timeline-v2/TimelineViewModeToggle.tsx` | 改为 Segmented Control，三个选项 |
| `src/components/Timeline.v2.tsx` | `card` 模式下不渲染 `TimelineEntryMarker` |
| `src/store/settingsStore.ts` | 默认 `viewMode` 从 `'list'` → `'timeline'` |

---

## 关键实现约束

- `card` 模式复用 `SectionList` 和分组数据逻辑，不重构列表结构
- `timeline` 重命名需全局搜索替换所有 `'list'` 字符串引用（类型、store、条件判断）
- 不引入新的卡片组件或样式文件
- Segmented Control 使用 React Native 原生 `SegmentedControlIOS` 或自行实现，与现有主题色一致

---

## 不在范围内

- 双列瀑布流、网格布局
- 卡片内容截断/摘要模式
- 卡片模式下的排序/筛选独立状态
