# 日历视图重设计 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将「按月」和「日历」合并为增强日历视图，整体 Tab 从三个简化为两个（列表 | 日历）。

**Architecture:** 修改 `CalendarView.tsx`，在现有月历格子下方增加内容区——默认展示当月所有记录（按日分组），点击某天过滤为仅显示当天；修改 `Timeline.v2.tsx` 删除 `'monthly'` ViewMode 及相关代码。

**Tech Stack:** React Native, TypeScript, Jest + @testing-library/react-native

---

## 文件变更一览

| 文件 | 操作 | 说明 |
|------|------|------|
| `app/src/components/CalendarView.tsx` | 修改 | 增加全月列表区、日期过滤、✕取消按钮 |
| `app/src/components/__tests__/CalendarView.test.tsx` | 新建 | CalendarView 单元测试 |
| `app/src/components/Timeline.v2.tsx` | 修改 | 删除 'monthly' ViewMode，简化为 2 个 Tab |
| `app/src/components/__tests__/Timeline.v2.view-mode.test.tsx` | 修改 | 删除/更新 monthly 相关测试用例 |

---

## Task 1：为 CalendarView 新交互写失败测试

**Files:**
- Create: `app/src/components/__tests__/CalendarView.test.tsx`

- [ ] **Step 1：创建测试文件，写 mock 和测试数据**

```typescript
// app/src/components/__tests__/CalendarView.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CalendarView } from '../CalendarView';
import { Entry } from '@/src/types/entry';

// 固定"今天"为 2026-03-19，避免测试受真实日期影响
const FIXED_NOW = new Date('2026-03-19T12:00:00+08:00');
const OriginalDate = Date;

beforeAll(() => {
  jest.spyOn(global, 'Date').mockImplementation((arg?: any) => {
    if (arg === undefined) return new OriginalDate(FIXED_NOW);
    return new OriginalDate(arg);
  });
  (global.Date as any).now = () => FIXED_NOW.getTime();
});

afterAll(() => {
  jest.restoreAllMocks();
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text> };
});

const makeEntry = (id: string, isoDate: string, type: Entry['type'] = 'text'): Entry => ({
  id,
  type,
  content: `内容 ${id}`,
  tags: [],
  timestamp: new Date(isoDate).getTime(),
  syncStatus: 'synced',
});

// 当月（3月）有记录的几天
const march17 = makeEntry('e1', '2026-03-17T09:00:00+08:00', 'text');
const march18a = makeEntry('e2', '2026-03-18T10:00:00+08:00', 'photo');
const march18b = makeEntry('e3', '2026-03-18T14:00:00+08:00', 'text');
// 其他月份的记录（不应显示）
const feb10 = makeEntry('e4', '2026-02-10T08:00:00+08:00', 'text');

const marchEntries = [march17, march18a, march18b];
const allEntries = [...marchEntries, feb10];
```

- [ ] **Step 2：写「默认显示全月所有记录」测试**

```typescript
describe('CalendarView', () => {
  it('默认状态下显示当月所有记录', () => {
    const { getByText, queryByText } = render(
      <CalendarView entries={allEntries} />
    );
    // 当月记录内容可见
    expect(getByText('内容 e1')).toBeTruthy();
    expect(getByText('内容 e2')).toBeTruthy();
    expect(getByText('内容 e3')).toBeTruthy();
    // 其他月份记录不显示
    expect(queryByText('内容 e4')).toBeNull();
  });

  it('默认状态下不显示"取消"按钮', () => {
    const { queryByTestId } = render(<CalendarView entries={marchEntries} />);
    expect(queryByTestId('calendar-deselect-btn')).toBeNull();
  });
```

- [ ] **Step 3：写「点击某天过滤到当天」测试**

```typescript
  it('点击有记录的日期后只显示当天记录', () => {
    const { getByText, queryByText } = render(
      <CalendarView entries={marchEntries} />
    );
    // 点击 18 号
    fireEvent.press(getByText('18'));

    expect(getByText('内容 e2')).toBeTruthy();
    expect(getByText('内容 e3')).toBeTruthy();
    // 17 号记录消失
    expect(queryByText('内容 e1')).toBeNull();
  });

  it('选中日期后显示"取消"按钮', () => {
    const { getByText, getByTestId } = render(
      <CalendarView entries={marchEntries} />
    );
    fireEvent.press(getByText('18'));
    expect(getByTestId('calendar-deselect-btn')).toBeTruthy();
  });
```

- [ ] **Step 4：写「再次点击同一天 / 点取消 → 恢复全月」测试**

```typescript
  it('再次点击同一天恢复显示全月', () => {
    const { getByText, queryByText } = render(
      <CalendarView entries={marchEntries} />
    );
    fireEvent.press(getByText('18'));
    fireEvent.press(getByText('18')); // 再次点击取消

    expect(getByText('内容 e1')).toBeTruthy();
    expect(queryByText('内容 e4')).toBeNull();
  });

  it('点击取消按钮恢复显示全月', () => {
    const { getByText, getByTestId, queryByText } = render(
      <CalendarView entries={marchEntries} />
    );
    fireEvent.press(getByText('18'));
    fireEvent.press(getByTestId('calendar-deselect-btn'));

    expect(getByText('内容 e1')).toBeTruthy();
  });
```

- [ ] **Step 5：写「切换月份清空选中」测试**

```typescript
  it('切换月份后清空日期选中并显示新月数据', () => {
    const feb5 = makeEntry('e5', '2026-02-05T10:00:00+08:00', 'text');
    const { getByText, queryByText, queryByTestId } = render(
      <CalendarView entries={[...marchEntries, feb5]} />
    );
    // 先选中 18 号，确认取消按钮出现
    fireEvent.press(getByText('18'));
    expect(queryByTestId('calendar-deselect-btn')).toBeTruthy();

    // 切换到上月（2月），icon name 是 'chevron-back'
    fireEvent.press(getByText('chevron-back'));

    // 取消按钮消失（同一组件实例，selectedKey 已清空）
    expect(queryByTestId('calendar-deselect-btn')).toBeNull();
    // 应显示 2 月记录
    expect(getByText('内容 e5')).toBeTruthy();
    // 3 月记录不显示
    expect(queryByText('内容 e1')).toBeNull();
  });
});
```

- [ ] **Step 6：运行测试，确认全部失败（CalendarView 还未实现新功能）**

```bash
cd app && npx jest --testPathPattern="CalendarView.test" --no-coverage 2>&1 | tail -20
```

期望：多个 FAIL（内容 e1 not found 等）

- [ ] **Step 7：Commit 失败的测试**

```bash
git add app/src/components/__tests__/CalendarView.test.tsx
git commit -m "test: add CalendarView month/day filter tests (failing)"
```

---

## Task 2：实现 CalendarView 新交互

**Files:**
- Modify: `app/src/components/CalendarView.tsx`

- [ ] **Step 1：在 CalendarView 增加月份记录过滤 + 分组逻辑**

在现有 `entryMap` useMemo 之后添加：

```typescript
// 当月所有记录（按时间倒序）
const monthEntries = useMemo(() => {
  return entries
    .filter((e) => {
      const d = new Date(e.timestamp);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .sort((a, b) => b.timestamp - a.timestamp);
}, [entries, year, month]);

// 按日分组（用于全月显示）
const monthDayGroups = useMemo(() => {
  const groups: { dateKey: string; label: string; entries: Entry[] }[] = [];
  let currentKey = '';
  for (const entry of monthEntries) {
    const d = new Date(entry.timestamp);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const label = `${d.getMonth() + 1}月${d.getDate()}日`;
    if (key !== currentKey) {
      groups.push({ dateKey: key, label, entries: [] });
      currentKey = key;
    }
    groups[groups.length - 1].entries.push(entry);
  }
  return groups;
}, [monthEntries]);
```

- [ ] **Step 2：更新 prevMonth / nextMonth 清空 selectedKey**

```typescript
const prevMonth = () => {
  setSelectedKey(null);
  setCurrentDate(new Date(year, month - 1, 1));
};
const nextMonth = () => {
  setSelectedKey(null);
  setCurrentDate(new Date(year, month + 1, 1));
};
```

- [ ] **Step 3：更新日期格子渲染，非选中日期圆点变淡**

在 `calendarDays.map` 内，找到渲染 `dot` 的地方，改为：

```typescript
const isOtherSelected = selectedKey !== null && key !== selectedKey;

// dot 的 style 增加 opacity
<View
  key={type}
  style={[
    styles.dot,
    { backgroundColor: isSelected ? '#FFFFFF' : TYPE_COLOR[type] },
    isOtherSelected && { opacity: 0.3 },
  ]}
/>
```

- [ ] **Step 4：在组件 return 内，把原有 `{selectedKey && ...}` 详情区换为新的内容区**

> **⚠️ 关于 EntryCard：** 规格提到"使用现有 EntryCard 组件"，但 CalendarView 是只读浏览视图，不需要 delete/edit 回调。为避免向 CalendarView 引入大量 callback props，此处**有意**保留自定义行组件（样式与现有保持一致），不引入 EntryCard。

删除原有 `{selectedKey && (...)}` 区块，替换为：

```typescript
{/* 内容区标题 */}
<View style={styles.contentHeader}>
  <Text style={styles.contentTitle}>
    {selectedKey
      ? (() => {
          const d = new Date(selectedEntries[0]?.timestamp ?? Date.now());
          return `${d.getMonth() + 1}月${d.getDate()}日 · ${selectedEntries.length} 条`;
        })()
      : `全月 · ${monthEntries.length} 条`}
  </Text>
  {selectedKey && (
    <TouchableOpacity
      testID="calendar-deselect-btn"
      onPress={() => setSelectedKey(null)}
      style={styles.deselectBtn}
    >
      <Text style={styles.deselectText}>✕ 取消</Text>
    </TouchableOpacity>
  )}
</View>

{/* 内容列表 */}
{selectedKey ? (
  // 单日模式：直接渲染当天记录行
  selectedEntries.length === 0 ? (
    <Text style={styles.emptyText}>当天无记录</Text>
  ) : (
    selectedEntries
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((entry) => (
        <View key={entry.id} style={styles.entryRow}>
          <View style={[styles.entryTypeDot, { backgroundColor: TYPE_COLOR[entry.type] }]} />
          <Text style={styles.entryTime}>
            {new Date(entry.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={styles.entryContent} numberOfLines={2}>{entry.content}</Text>
        </View>
      ))
  )
) : (
  // 全月模式：按日分组渲染
  monthEntries.length === 0 ? (
    <Text style={styles.emptyText}>本月暂无记录</Text>
  ) : (
    monthDayGroups.map((group) => (
      <View key={group.dateKey}>
        <Text style={styles.dayGroupLabel}>{group.label}</Text>
        {group.entries.map((entry) => (
          <View key={entry.id} style={styles.entryRow}>
            <View style={[styles.entryTypeDot, { backgroundColor: TYPE_COLOR[entry.type] }]} />
            <Text style={styles.entryTime}>
              {new Date(entry.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={styles.entryContent} numberOfLines={2}>{entry.content}</Text>
          </View>
        ))}
      </View>
    ))
  )
)}
```

- [ ] **Step 5：在 StyleSheet 增加新样式**

在 `styles = StyleSheet.create({...})` 内追加：

```typescript
contentHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: 16,
  marginHorizontal: 16,
  marginBottom: 8,
},
contentTitle: {
  fontSize: 14,
  fontWeight: '700',
  color: '#4A4A4A',
},
deselectBtn: {
  paddingHorizontal: 10,
  paddingVertical: 4,
  backgroundColor: '#F0F0F0',
  borderRadius: 12,
},
deselectText: {
  fontSize: 12,
  color: '#A3A3A3',
},
dayGroupLabel: {
  fontSize: 12,
  fontWeight: '600',
  color: '#A3A3A3',
  marginHorizontal: 16,
  marginTop: 10,
  marginBottom: 4,
},
emptyText: {
  fontSize: 14,
  color: '#A3A3A3',
  textAlign: 'center',
  marginTop: 24,
},
```

- [ ] **Step 6：运行测试，确认全部通过**

```bash
cd app && npx jest --testPathPattern="CalendarView.test" --no-coverage 2>&1 | tail -20
```

期望：全部 PASS

- [ ] **Step 7：Commit**

```bash
git add app/src/components/CalendarView.tsx
git commit -m "feat: enhance CalendarView with full-month list and day filter"
```

---

## Task 3：删除 Timeline.v2.tsx 中的 monthly 模式

**Files:**
- Modify: `app/src/components/Timeline.v2.tsx`

- [ ] **Step 1：修改 ViewMode 类型和 VIEW_MODES 数组**

找到并修改：

```typescript
// 改前
type ViewMode = 'list' | 'monthly' | 'calendar';

// 改后
type ViewMode = 'list' | 'calendar';
```

```typescript
// 改前（3项）
const VIEW_MODES: { mode: ViewMode; icon: string; label: string }[] = [
  { mode: 'list', icon: 'list', label: '列表' },
  { mode: 'monthly', icon: 'layers', label: '按月' },
  { mode: 'calendar', icon: 'calendar', label: '日历' },
];

// 改后（2项）
const VIEW_MODES: { mode: ViewMode; icon: string; label: string }[] = [
  { mode: 'list', icon: 'list', label: '列表' },
  { mode: 'calendar', icon: 'calendar', label: '日历' },
];
```

- [ ] **Step 2：删除 generateMonthlySections 函数**

删除整个 `function generateMonthlySections(entries: Entry[]): TimeSection[]` 函数（第 77-95 行）。

- [ ] **Step 3：简化 sections useMemo（移除 monthly 分支）**

```typescript
// 改前
const sections = useMemo(() => {
  if (displayMode === 'monthly') return generateMonthlySections(displayEntries);
  return generateTimeSections(displayEntries);
}, [displayEntries, displayMode]);

// 改后
const sections = useMemo(() => {
  return generateTimeSections(displayEntries);
}, [displayEntries, displayMode]);
```

（`displayMode` 依赖项可保留，切换到 calendar 时 sections 不被渲染，无影响）

- [ ] **Step 4：确认 TypeScript 无报错**

```bash
cd app && npx tsc --noEmit 2>&1 | head -30
```

期望：无输出（零错误）

- [ ] **Step 5：Commit**

```bash
git add app/src/components/Timeline.v2.tsx
git commit -m "feat: remove monthly ViewMode, simplify to list|calendar two tabs"
```

---

## Task 4：更新 Timeline 视图切换测试

**Files:**
- Modify: `app/src/components/__tests__/Timeline.v2.view-mode.test.tsx`

当前测试中有两个测试引用 `'按月'` 文本（现已不存在），需要删除或更新；一个测试可更新为用 `'日历'` 模式验证 loader dots。

- [ ] **Step 1：删除或更新 monthly 相关测试**

删除以下两个测试（monthly 模式已不存在，这些场景不再有效）：

```
it('uses stable SectionList keys when switching between list and monthly views', ...)
it('renders entry cards again after switching to monthly mode', ...)
```

- [ ] **Step 2：更新 loader dots 测试——改为用 calendar 模式触发**

```typescript
it('renders themed loader dots during view transitions', () => {
  const screen = render(<Timeline />);

  fireEvent.press(screen.getByTestId('searchbar-view-mode-toggle'));
  // 改为点击"日历"（不再有"按月"）
  fireEvent.press(screen.getByText('日历'));

  expect(screen.getByTestId('loader-dot-text')).toHaveStyle({ backgroundColor: '#A491D3' });
  expect(screen.getByTestId('loader-dot-photo')).toHaveStyle({ backgroundColor: '#77C9D4' });
  expect(screen.getByTestId('loader-dot-voice')).toHaveStyle({ backgroundColor: '#F5A623' });
});
```

- [ ] **Step 3：运行全部 Timeline 测试，确认通过**

```bash
cd app && npx jest --testPathPattern="Timeline.v2.view-mode" --no-coverage 2>&1 | tail -20
```

期望：全部 PASS

- [ ] **Step 4：运行全量测试确认无回归**

```bash
cd app && npx jest --no-coverage 2>&1 | tail -20
```

期望：全部 PASS，新增测试数量 ≥ 原有 + 5

- [ ] **Step 5：最终 Commit**

```bash
git add app/src/components/__tests__/Timeline.v2.view-mode.test.tsx
git commit -m "test: update view-mode tests to remove monthly, update to calendar mode"
```

---

## 验收标准

- [ ] `npx tsc --noEmit` 零错误
- [ ] `npx jest --no-coverage` 全部通过
- [ ] 视图 Tab 只有「列表」和「日历」两个
- [ ] 日历视图默认展示当月所有记录（按日分组）
- [ ] 点击有记录的日期：只显示当天，其他日期圆点变淡
- [ ] 再次点击同一天 或 点「✕ 取消」：恢复全月
- [ ] 切换月份：清空日期选中，显示新月数据
