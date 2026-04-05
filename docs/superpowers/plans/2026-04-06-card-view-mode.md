# 卡片显示模式 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `card` 显示模式（单列卡片 + 日期分组标题，无时间轴元素），同时将现有 `list` 模式重命名为 `timeline`，并将模式切换控件改为三段式 Segmented Control。

**Architecture:** 复用现有 `SectionList` 数据结构和 `EntryCard` 组件；`card` 模式下通过 prop 控制 `TimelineEntryMarker` 隐藏时间轴装饰元素（竖线、圆点、时间文字），不新增组件文件。`list` → `timeline` 重命名通过全局字符串替换完成。

**Tech Stack:** React Native, TypeScript, Zustand, Expo SDK 54, Ionicons

---

## 文件变更清单

| 文件 | 操作 |
|------|------|
| `src/components/timeline-v2/timelineTypes.ts` | 修改：`ViewMode` 加入 `'timeline'` 和 `'card'`，移除 `'list'` |
| `src/components/timeline-v2/useTimelineController.ts` | 修改：`'list'` → `'timeline'`，`handleToggleViewMode` 逻辑更新 |
| `src/components/timeline-v2/TimelineViewModeToggle.tsx` | 修改：加入 `card` 选项，更新标签文字 |
| `src/components/timeline-v2/TimelineEntryMarker.tsx` | 修改：接受 `showTimelineDecorations` prop，`card` 模式下隐藏圆点、竖线、时间文字 |
| `src/components/timeline-v2/useTimelineList.tsx` | 修改：接收并向下传递 `displayMode`，`card` 模式下向 `TimelineEntryMarker` 传 `showTimelineDecorations={false}` |
| `src/components/Timeline.v2.tsx` | 修改：`displayMode === 'list'` → `displayMode === 'timeline'`（FAB 显示条件） |

---

## Task 1：更新 ViewMode 类型

**Files:**
- Modify: `src/components/timeline-v2/timelineTypes.ts`

- [ ] **Step 1: 修改 ViewMode 类型**

将文件内容改为：

```typescript
import type { Entry } from '@/src/types/entry';

export type ViewMode = 'timeline' | 'card' | 'calendar';

export interface TimeSection {
  title: string;
  timestamp: number;
  data: Entry[];
}
```

- [ ] **Step 2: 运行 typecheck 确认无报错**

```bash
cd /path/to/app && npx tsc --noEmit 2>&1 | head -50
```

预期：输出 TypeScript 错误，因为 `'list'` 引用在其他文件还未更新——这是正常的，后续任务会逐步修复。

- [ ] **Step 3: Commit**

```bash
git add src/components/timeline-v2/timelineTypes.ts
git commit -m "feat: extend ViewMode to timeline | card | calendar"
```

---

## Task 2：更新 useTimelineController.ts

**Files:**
- Modify: `src/components/timeline-v2/useTimelineController.ts`

- [ ] **Step 1: 替换所有 `'list'` 引用为 `'timeline'`**

第 29 行：
```typescript
// 原
const [viewMode, setViewMode] = useState<ViewMode>('list');
// 新
const [viewMode, setViewMode] = useState<ViewMode>('timeline');
```

第 30 行：
```typescript
// 原
const [displayMode, setDisplayMode] = useState<ViewMode>('list');
// 新
const [displayMode, setDisplayMode] = useState<ViewMode>('timeline');
```

第 77-81 行（`handleToggleViewMode`）：
```typescript
// 原
const handleToggleViewMode = useCallback(() => {
  if (showViewToggle && viewMode !== 'list') {
    skipTransitionRef.current = true;
    setViewMode('list');
    setDisplayMode('list');
  }
  setShowViewToggle((value) => !value);
}, [showViewToggle, viewMode]);

// 新
const handleToggleViewMode = useCallback(() => {
  if (showViewToggle && viewMode !== 'timeline') {
    skipTransitionRef.current = true;
    setViewMode('timeline');
    setDisplayMode('timeline');
  }
  setShowViewToggle((value) => !value);
}, [showViewToggle, viewMode]);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/timeline-v2/useTimelineController.ts
git commit -m "feat: rename list viewMode to timeline in controller"
```

---

## Task 3：更新 TimelineViewModeToggle.tsx（加入 card 选项）

**Files:**
- Modify: `src/components/timeline-v2/TimelineViewModeToggle.tsx`

- [ ] **Step 1: 更新 VIEW_MODES 数组，加入 card，并将 list 改为 timeline**

```typescript
import type { ComponentProps } from 'react';
import React from 'react';
import { Text, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ViewMode } from './timelineTypes';
import { viewModeToggleStyles as styles } from './Timeline.v2.styles';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const VIEW_MODES: { mode: ViewMode; icon: IoniconName; label: string }[] = [
  { mode: 'timeline', icon: 'list', label: '时间线' },
  { mode: 'card', icon: 'grid-outline', label: '卡片' },
  { mode: 'calendar', icon: 'calendar', label: '日历' },
];

interface TimelineViewModeToggleProps {
  current: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function TimelineViewModeToggle({
  current,
  onChange,
}: TimelineViewModeToggleProps) {
  return (
    <View style={styles.container}>
      {VIEW_MODES.map(({ mode, icon, label }) => {
        const active = current === mode;
        return (
          <Pressable
            key={mode}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onChange(mode)}
          >
            <Ionicons
              name={icon}
              size={16}
              color={active ? '#6A89CC' : '#A3A3A3'}
            />
            <Text style={[styles.label, active && styles.labelActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/timeline-v2/TimelineViewModeToggle.tsx
git commit -m "feat: add card mode to view mode toggle (3 options)"
```

---

## Task 4：更新 TimelineEntryMarker.tsx（支持隐藏时间轴装饰）

**Files:**
- Modify: `src/components/timeline-v2/TimelineEntryMarker.tsx`

- [ ] **Step 1: 添加 `showTimelineDecorations` prop，card 模式下隐藏圆点、时间文字**

```typescript
import React from 'react';
import { Text, View } from 'react-native';
import type { Entry } from '@/src/types/entry';
import { formatHHMM } from '@/src/utils/timeUtils';
import { EntryCard } from '@/src/components/EntryCard';
import { getTimelineEntryAccentColor } from './timelineAppearance';

interface TimelineEntryMarkerProps {
  entry: Entry;
  onDeleteEntry: (id: string) => void | Promise<void>;
  onViewEntry?: (entry: Entry) => void;
  onEditEntry?: (entry: Entry) => void;
  onStopRecording?: (id: string) => void;
  isActionSheetActive: boolean;
  onActionSheetOpen: (id: string) => void;
  isLast: boolean;
  cardSpacing: number;
  enterDelay?: number;
  showTimelineDecorations?: boolean;
}

const timelineLeft = 40;

const dotStyle = {
  position: 'absolute' as const,
  left: timelineLeft - 7,
  top: 2,
  width: 16,
  height: 16,
  borderRadius: 8,
  borderWidth: 2,
  borderColor: '#FFFFFF',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  elevation: 2,
  zIndex: 2,
};

const timeRowStyle = {
  marginBottom: 8,
  height: 20,
  justifyContent: 'center' as const,
};

const timeTextStyle = {
  fontSize: 12,
  fontWeight: '500' as const,
  lineHeight: 16,
};

export const TimelineEntryMarker = React.memo(function TimelineEntryMarker({
  entry,
  onDeleteEntry,
  onViewEntry,
  onEditEntry,
  onStopRecording,
  isActionSheetActive,
  onActionSheetOpen,
  isLast,
  cardSpacing,
  enterDelay = 0,
  showTimelineDecorations = true,
}: TimelineEntryMarkerProps) {
  const accentColor = getTimelineEntryAccentColor(entry.type);

  return (
    <View
      style={{
        paddingLeft: showTimelineDecorations ? 64 : 16,
        paddingRight: 24,
        paddingBottom: isLast ? 0 : cardSpacing,
        position: 'relative',
      }}
    >
      {showTimelineDecorations && (
        <View style={[dotStyle, { backgroundColor: accentColor }]} />
      )}

      {showTimelineDecorations && (
        <View style={timeRowStyle}>
          <Text style={[timeTextStyle, { color: accentColor }]}>
            {formatHHMM(entry.timestamp)}
          </Text>
        </View>
      )}

      <EntryCard
        entry={entry}
        onDelete={onDeleteEntry}
        onView={onViewEntry}
        onEdit={onEditEntry}
        onStopRecording={onStopRecording}
        isActionSheetActive={isActionSheetActive}
        onActionSheetOpen={onActionSheetOpen}
        variant="calendar"
        cardSpacing={cardSpacing}
        enterDelay={enterDelay}
      />
    </View>
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/timeline-v2/TimelineEntryMarker.tsx
git commit -m "feat: add showTimelineDecorations prop to TimelineEntryMarker"
```

---

## Task 5：更新 useTimelineList.tsx（card 模式传递 prop）

**Files:**
- Modify: `src/components/timeline-v2/useTimelineList.tsx`

- [ ] **Step 1: 在 renderItem 中根据 displayMode 传 showTimelineDecorations**

```typescript
import { useCallback, useMemo } from 'react';
import type { Entry } from '@/src/types/entry';
import { TimelineEntryMarker } from './TimelineEntryMarker';
import { TimelineSectionHeader } from './TimelineSectionHeader';
import { generateTimeSections } from './timelineSections';
import type { TimeSection, ViewMode } from './timelineTypes';

interface UseTimelineListOptions {
  entries: Entry[];
  displayMode: ViewMode;
  cardSpacing: number;
  deleteEntry: (id: string) => void | Promise<void>;
  onViewEntry: (entry: Entry) => void;
  onEditEntry: (entry: Entry) => void;
  onStopRecording?: (id: string) => void;
  activeActionSheetId: string | null;
  onActionSheetOpen: (id: string) => void;
}

export function useTimelineList({
  entries,
  displayMode,
  cardSpacing,
  deleteEntry,
  onViewEntry,
  onEditEntry,
  onStopRecording,
  activeActionSheetId,
  onActionSheetOpen,
}: UseTimelineListOptions) {
  const sections = useMemo(() => generateTimeSections(entries), [entries]);

  const globalIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    let nextIndex = 0;

    for (const section of sections) {
      for (const entry of section.data) {
        map.set(entry.id, nextIndex);
        nextIndex += 1;
      }
    }

    return map;
  }, [sections]);

  const hasEntries = entries.length > 0;

  const keyExtractor = useCallback((item: Entry) => item.id, []);

  const renderItem = useCallback(
    ({ item, index, section }: { item: Entry; index: number; section: TimeSection }) => {
      const isLast = index === section.data.length - 1;
      const globalIndex = globalIndexMap.get(item.id) ?? 0;
      const staggerIndex = Math.min(globalIndex, 8);
      const enterDelay = staggerIndex * 90;

      return (
        <TimelineEntryMarker
          entry={item}
          onDeleteEntry={deleteEntry}
          onViewEntry={onViewEntry}
          onEditEntry={onEditEntry}
          onStopRecording={onStopRecording}
          isActionSheetActive={activeActionSheetId === item.id}
          onActionSheetOpen={onActionSheetOpen}
          isLast={isLast}
          cardSpacing={cardSpacing}
          enterDelay={enterDelay}
          showTimelineDecorations={displayMode !== 'card'}
        />
      );
    },
    [
      activeActionSheetId,
      cardSpacing,
      deleteEntry,
      displayMode,
      globalIndexMap,
      onActionSheetOpen,
      onEditEntry,
      onStopRecording,
      onViewEntry,
    ],
  );

  const renderSectionHeader = useCallback(({ section }: { section: TimeSection }) => {
    return <TimelineSectionHeader title={section.title} />;
  }, []);

  return {
    sections,
    renderItem,
    renderSectionHeader,
    keyExtractor,
    hasEntries,
  };
}
```

- [ ] **Step 2: 运行 typecheck 确认全部通过**

```bash
cd /path/to/app && npx tsc --noEmit 2>&1 | head -50
```

预期：无输出（无错误）。

- [ ] **Step 3: Commit**

```bash
git add src/components/timeline-v2/useTimelineList.tsx
git commit -m "feat: pass showTimelineDecorations=false in card mode"
```

---

## Task 6：修复 Timeline.v2.tsx 中 FAB 显示条件

**Files:**
- Modify: `src/components/Timeline.v2.tsx`

- [ ] **Step 1: 将 FAB 条件从 `'list'` 改为 `'timeline'`**

第 220 行：
```typescript
// 原
{!showSearchOverlay && displayMode === 'list' && (

// 新
{!showSearchOverlay && displayMode === 'timeline' && (
```

- [ ] **Step 2: 运行 typecheck 确认全部通过**

```bash
cd /path/to/app && npx tsc --noEmit 2>&1 | head -50
```

预期：无输出（无错误）。

- [ ] **Step 3: Commit**

```bash
git add src/components/Timeline.v2.tsx
git commit -m "fix: update FAB visibility condition for renamed timeline mode"
```

---

## Task 7：全局扫描残留 `'list'` ViewMode 引用

**Files:**
- Search: 全项目

- [ ] **Step 1: 搜索残留引用**

```bash
cd /path/to/app && grep -rn "viewMode.*'list'\|'list'.*viewMode\|displayMode.*'list'\|=== 'list'\|!== 'list'" src/ --include="*.ts" --include="*.tsx"
```

预期：无输出。如有输出，逐一修复后 commit。

- [ ] **Step 2: 最终 typecheck**

```bash
cd /path/to/app && npx tsc --noEmit 2>&1
```

预期：无输出。

- [ ] **Step 3: Commit（如有修复）**

```bash
git add -p
git commit -m "fix: clean up remaining list viewMode references"
```

---

## Task 8：手动测试验证

- [ ] 启动 dev client，打开主页
- [ ] 点击搜索栏右侧的视图模式按钮，确认弹出三段式切换栏（时间线 / 卡片 / 日历）
- [ ] 切换到「时间线」：确认与原 list 模式完全一致（圆点、时间文字、左侧缩进均显示）
- [ ] 切换到「卡片」：确认圆点、时间文字消失，左侧 padding 减小（16px），日期分组标题保留
- [ ] 切换到「日历」：确认日历视图正常
- [ ] 切换回「时间线」：确认时间轴装饰重新出现
- [ ] 确认 FAB 在时间线模式显示，在卡片/日历模式不显示
