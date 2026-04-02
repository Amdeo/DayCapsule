# EntryCard 滑动操作实现计划

> **For agentic workers:** REQUIRED: Use @superpowers:subagent-driven-development (if subagents available) or @superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 EntryCard 添加向左滑动显示编辑/删除操作按钮的功能，采用 iOS 邮件风格交互

**Architecture:** 使用 `react-native-gesture-handler` 的 Swipeable 组件包裹卡片内容，实现滑动操作。Timeline 组件管理多卡片收起状态，确保同一时间只有一个卡片展开操作按钮。

**Tech Stack:** React Native, react-native-gesture-handler (Swipeable), NativeWind (样式), TypeScript

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/EntryCard.tsx` | 修改 | 添加 Swipeable 包裹，实现滑动操作按钮，移除长按 ActionSheet |
| `src/components/Timeline.v2.tsx` | 修改 | 添加 openSwipeId 状态，控制多卡片收起，传递滑动相关 props |
| `src/components/__tests__/EntryCard.test.tsx` | 修改 | 更新测试，验证滑动按钮渲染和长按行为变更 |
| `__mocks__/react-native-gesture-handler.ts` | 创建 | Swipeable 组件的 Jest Mock |

---

## Chunk 1: EntryCard 组件改造

### 任务 1: 添加 Swipeable 导入和类型定义

**Files:**
- Modify: `src/components/EntryCard.tsx:1-20`

- [ ] **Step 1: 添加 Swipeable 导入**

在现有导入后添加：
```typescript
import { Swipeable } from 'react-native-gesture-handler';
import { Animated } from 'react-native';
```

- [ ] **Step 2: 更新 EntryCardProps 接口**

在现有接口定义后添加新 props：
```typescript
interface EntryCardProps {
  // 现有 props...
  entry: Entry;
  onDelete: (id: string) => void;
  onEdit?: (entry: Entry) => void;
  onPauseRecording?: (id: string) => void;
  onResumeRecording?: (id: string) => void;
  onStopRecording?: (id: string) => void;
  cardSpacing?: number;

  // 新增 props
  /** 当前卡片是否处于展开状态（由父组件控制多卡片收起） */
  isSwipeOpen?: boolean;
  /** 当用户开始滑动当前卡片时触发 */
  onSwipeStart?: (entryId: string) => void;
  /** 当用户关闭滑动或滑动其他卡片时触发 */
  onSwipeClose?: () => void;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/EntryCard.tsx
git commit -m "feat: add Swipeable import and new props types"
```

---

### 任务 2: 创建滑动操作按钮渲染函数

**Files:**
- Modify: `src/components/EntryCard.tsx` (在 EntryCard 函数内部，状态定义之后)

- [ ] **Step 1: 添加 Swipeable ref**

在 EntryCard 函数内部，其他 ref 定义附近添加：
```typescript
const swipeableRef = useRef<Swipeable>(null);
```

- [ ] **Step 2: 创建 renderRightActions 函数**

在 EntryCard 函数内部，其他 handler 函数附近添加：
```typescript
const renderRightActions = (
  progress: Animated.AnimatedInterpolation<number>,
  dragX: Animated.AnimatedInterpolation<number>
) => {
  const trans = dragX.interpolate({
    inputRange: [-170, 0],
    outputRange: [0, 170],
    extrapolate: 'clamp',
  });

  const handleEditPress = () => {
    swipeableRef.current?.close();
    onEdit?.(entry);
  };

  const handleDeletePress = () => {
    swipeableRef.current?.close();
    // 保留现有的删除确认逻辑
    handleActionDelete();
  };

  return (
    <Animated.View style={{ transform: [{ translateX: trans }] }}>
      <View className="flex-row items-center h-full">
        <TouchableOpacity
          className="bg-[#8E8E93] w-[85px] h-full justify-center items-center"
          onPress={handleEditPress}
          accessibilityLabel="编辑条目"
          accessibilityRole="button"
        >
          <Text className="text-white text-sm font-medium">编辑</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-[#FF3B30] w-[85px] h-full justify-center items-center"
          onPress={handleDeletePress}
          accessibilityLabel="删除条目"
          accessibilityRole="button"
        >
          <Text className="text-white text-sm font-medium">删除</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add src/components/EntryCard.tsx
git commit -m "feat: add renderRightActions for swipe buttons"
```

---

### 任务 3: 修改长按行为

**Files:**
- Modify: `src/components/EntryCard.tsx` (handleLongPress 函数)

- [ ] **Step 1: 修改 handleLongPress 函数**

找到现有的 handleLongPress 函数，将其修改为：
```typescript
const handleLongPress = () => {
  // 长按仅触发卡片展开，不再弹出 ActionSheet
  setIsExpanded(true);
};
```

- [ ] **Step 2: 移除 ActionSheet 相关代码**

找到并删除以下与 ActionSheet 相关的代码：
1. `showActionSheet` 函数定义（如果存在）
2. `ActionSheet` 组件的渲染代码
3. `ActionSheet` 相关的 state（如 `isActionSheetVisible`）

**注意**: 保留删除确认对话框（Alert），它由 `handleActionDelete` 处理。

- [ ] **Step 3: Commit**

```bash
git add src/components/EntryCard.tsx
git commit -m "feat: change long press to expand card only, remove ActionSheet"
```

---

### 任务 4: 添加多卡片收起逻辑

**Files:**
- Modify: `src/components/EntryCard.tsx` (useEffect 部分)

- [ ] **Step 1: 添加 useEffect 监听 isSwipeOpen**

在 EntryCard 函数的 useEffect 部分添加：
```typescript
useEffect(() => {
  if (!isSwipeOpen && swipeableRef.current) {
    swipeableRef.current.close();
  }
}, [isSwipeOpen]);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/EntryCard.tsx
git commit -m "feat: add swipe close effect when another card opens"
```

---

### 任务 5: 用 Swipeable 包裹卡片内容

**Files:**
- Modify: `src/components/EntryCard.tsx` (JSX 渲染部分)

- [ ] **Step 1: 找到卡片根元素**

找到当前卡片内容的根元素（通常是一个 `Animated.View` 或 `Pressable`）。

- [ ] **Step 2: 用 Swipeable 包裹**

将卡片内容用 Swipeable 包裹：
```typescript
<Swipeable
  ref={swipeableRef}
  renderRightActions={renderRightActions}
  friction={2}
  leftThreshold={40}
  rightThreshold={40}
  overshootRight={false}
  dragOffsetFromRightEdge={10}
  onSwipeableWillOpen={() => {
    onSwipeStart?.(entry.id);
  }}
  onSwipeableWillClose={() => {
    onSwipeClose?.();
  }}
>
  {/* 原有卡片内容 */}
  <Animated.View
    style={[
      styles.cardShadow,
      { backgroundColor: isPressed ? getCardPressedColor() : getCardBgColor(), marginBottom: cardSpacing },
    ]}
  >
    {/* ... 原有卡片内容 ... */}
  </Animated.View>
</Swipeable>
```

**注意**: 保持原有卡片内容的结构和样式不变。

- [ ] **Step 3: Commit**

```bash
git add src/components/EntryCard.tsx
git commit -m "feat: wrap card content with Swipeable component"
```

---

## Chunk 2: Timeline 组件适配

### 任务 6: 更新 Timeline 状态管理

**Files:**
- Modify: `src/components/Timeline.v2.tsx`

- [ ] **Step 1: 导入 useCallback**

确保导入 useCallback：
```typescript
import React, { useState, useCallback } from 'react';
```

- [ ] **Step 2: 添加 openSwipeId state**

在 Timeline 组件内部，其他 state 定义附近添加：
```typescript
const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
```

- [ ] **Step 3: 创建回调函数**

使用 useCallback 缓存回调函数：
```typescript
const handleSwipeStart = useCallback((id: string) => {
  setOpenSwipeId(id);
}, []);

const handleSwipeClose = useCallback(() => {
  setOpenSwipeId(null);
}, []);
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Timeline.v2.tsx
git commit -m "feat: add openSwipeId state and swipe handlers in Timeline"
```

---

### 任务 7: 更新 EntryCard 渲染

**Files:**
- Modify: `src/components/Timeline.v2.tsx` (renderItem 部分)

- [ ] **Step 1: 找到 EntryCard 渲染代码**

找到 `renderItem` 或 `EntryCard` 的渲染位置。

- [ ] **Step 2: 添加滑动相关 props**

更新 EntryCard 的调用，添加新 props：
```typescript
<EntryCard
  entry={item}
  onDelete={handleDelete}
  onEdit={handleEdit}
  // 新增 props
  isSwipeOpen={openSwipeId === item.id}
  onSwipeStart={handleSwipeStart}
  onSwipeClose={handleSwipeClose}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Timeline.v2.tsx
git commit -m "feat: pass swipe props to EntryCard in Timeline"
```

---

## Chunk 3: 测试更新

### 任务 8: 创建 Swipeable Mock

**Files:**
- Create: `__mocks__/react-native-gesture-handler.ts`

- [ ] **Step 1: 创建 Mock 文件**

```typescript
import React from 'react';
import { View } from 'react-native';

export const Swipeable = jest.fn(({ children, renderRightActions }) => {
  return (
    <View>
      {children}
      {renderRightActions?.(
        { interpolate: () => 0 } as any,
        { interpolate: () => 0 } as any
      )}
    </View>
  );
});

// 添加 close 方法到原型
Object.defineProperty(Swipeable, 'prototype', {
  value: { close: jest.fn() },
  writable: false,
});

// 重新导出其他所有导出
export * from 'react-native-gesture-handler';
```

- [ ] **Step 2: Commit**

```bash
git add __mocks__/react-native-gesture-handler.ts
git commit -m "test: add Swipeable mock for testing"
```

---

### 任务 9: 更新 EntryCard 测试

**Files:**
- Modify: `src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: 添加滑动按钮渲染测试**

```typescript
describe('EntryCard swipe actions', () => {
  it('renders edit and delete buttons', () => {
    const { getByLabelText } = render(
      <EntryCard entry={mockEntry} onDelete={jest.fn()} />
    );
    expect(getByLabelText('编辑条目')).toBeTruthy();
    expect(getByLabelText('删除条目')).toBeTruthy();
  });

  it('calls onEdit when edit button pressed', () => {
    const onEdit = jest.fn();
    const { getByLabelText } = render(
      <EntryCard entry={mockEntry} onDelete={jest.fn()} onEdit={onEdit} />
    );
    fireEvent.press(getByLabelText('编辑条目'));
    expect(onEdit).toHaveBeenCalledWith(mockEntry);
  });
});
```

- [ ] **Step 2: 添加长按行为变更测试**

```typescript
it('expands card on long press instead of showing action sheet', () => {
  const { queryByText, getByTestId } = render(
    <EntryCard entry={mockEntry} onDelete={jest.fn()} />
  );

  // 触发长按
  const card = getByTestId('entry-card');
  fireEvent(card, 'onLongPress');

  // 验证没有弹出 ActionSheet（通过检查特定文本不存在）
  expect(queryByText('编辑')).toBeNull();
});
```

- [ ] **Step 3: 运行测试**

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
pnpm test -- EntryCard.test.tsx --no-coverage
```

Expected: 所有测试通过

- [ ] **Step 4: Commit**

```bash
git add src/components/__tests__/EntryCard.test.tsx
git commit -m "test: update EntryCard tests for swipe actions"
```

---

### 任务 10: 更新缺失媒体测试

**Files:**
- Modify: `src/components/__tests__/EntryCard.missing-media.test.tsx`

- [ ] **Step 1: 检查测试文件**

阅读现有测试，确保 Swipeable 相关测试也能通过。

- [ ] **Step 2: 如有需要，添加或更新测试**

确保测试中 EntryCard 的渲染包含滑动按钮（通过 Mock）。

- [ ] **Step 3: 运行测试**

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
pnpm test -- EntryCard.missing-media.test.tsx --no-coverage
```

- [ ] **Step 4: Commit**

```bash
git add src/components/__tests__/EntryCard.missing-media.test.tsx
git commit -m "test: update missing media tests for swipe actions"
```

---

## Chunk 4: 验证和清理

### 任务 11: 类型检查

- [ ] **Step 1: 运行 TypeScript 检查**

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
pnpm run typecheck
```

Expected: 无 TypeScript 错误

- [ ] **Step 2: 修复类型错误**

如果出现类型错误，修复它们。

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "fix: resolve TypeScript type errors"
```

---

### 任务 12: 运行完整测试套件

- [ ] **Step 1: 运行所有测试**

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
pnpm test -- --coverage
```

Expected: 所有测试通过，覆盖率不降低

- [ ] **Step 2: 检查覆盖率报告**

确保核心逻辑覆盖率没有显著下降。

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "chore: all tests passing with coverage"
```

---

## 验收清单

实施完成后，验证以下项目：

- [ ] 所有卡片支持向左滑动显示编辑和删除按钮
- [ ] 编辑按钮为灰色 (#8E8E93)，删除按钮为红色 (#FF3B30)
- [ ] 按钮文字为白色，14px，字重 500
- [ ] 按钮宽度 85px，并排显示
- [ ] 滑动时有弹簧动画效果（friction={2}）
- [ ] 长按仅触发卡片展开，不再弹出 ActionSheet
- [ ] 滑动其他卡片时当前卡片自动收起
- [ ] 点击删除按钮后弹出确认对话框
- [ ] 无障碍标签正确（编辑条目/删除条目）
- [ ] 所有测试通过
- [ ] TypeScript 无错误
- [ ] 单元测试覆盖率不降低

---

## 调试指南

### 手势冲突调试

如果滑动与列表滚动冲突：

1. **启用调试日志**：
```typescript
onSwipeableWillOpen={() => {
  console.log('[Swipe] Card opened:', entry.id);
  onSwipeStart?.(entry.id);
}}
```

2. **调整阈值**：
- 误触发频繁：增大 `dragOffsetFromRightEdge` 到 15-20
- 滑动难以触发：减小到 5

### 性能调试

如果滑动卡顿：

1. 检查是否有过多的 re-render
2. 确保 Timeline 使用了 useCallback 缓存回调
3. 检查 FlatList 是否使用了 getItemLayout 优化

---

## 相关文档

- 设计文档: `docs/superpowers/specs/2026-03-16-entry-card-swipe-design.md`
- 项目规范: `CLAUDE.md`
