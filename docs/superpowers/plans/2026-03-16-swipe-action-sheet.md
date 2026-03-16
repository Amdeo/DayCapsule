# 滑动触发底部操作面板 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 EntryCard 左滑后的色块按钮改为从底部弹出的操作面板，面板含「编辑」「删除（带确认）」「取消」选项。

**Architecture:** 新增独立 `EntryActionSheet` 组件（Modal + Reanimated），EntryCard 保留 Swipeable 仅用于手势检测，`onSwipeableOpen` 触发底部面板；Timeline 用 `activeActionSheetId` 替代 `openSwipeId` 实现多卡片互斥。

**Tech Stack:** React Native Modal, react-native-reanimated (withSpring/withTiming), PanResponder, react-native-gesture-handler Swipeable, react-native-safe-area-context, @expo/vector-icons Ionicons, @testing-library/react-native

---

## Chunk 1: EntryActionSheet 组件

### Task 1: 创建 EntryActionSheet 测试文件（TDD）

**Files:**
- Create: `app/src/components/__tests__/EntryActionSheet.test.tsx`

- [ ] **Step 1: 写失败测试 — 面板在 visible=false 时不渲染内容**

```tsx
// app/src/components/__tests__/EntryActionSheet.test.tsx

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const MockIcon = ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>;
  return { Ionicons: MockIcon };
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EntryActionSheet } from '../EntryActionSheet';

describe('EntryActionSheet', () => {
  const baseProps = {
    visible: false,
    entryType: 'text' as const,
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onClose: jest.fn(),
  };

  it('renders nothing when not visible', () => {
    const { queryByText } = render(<EntryActionSheet {...baseProps} />);
    expect(queryByText('编辑')).toBeNull();
    expect(queryByText('删除')).toBeNull();
    expect(queryByText('取消')).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd app && npx jest src/components/__tests__/EntryActionSheet.test.tsx --no-coverage 2>&1 | tail -20
```
预期：FAIL（`EntryActionSheet` 模块找不到）

- [ ] **Step 3: 写失败测试 — 面板在 visible=true 时渲染选项**

在同一文件追加：

```tsx
  it('shows edit and delete options when visible', () => {
    const { getByText } = render(<EntryActionSheet {...baseProps} visible={true} />);
    expect(getByText('编辑')).toBeTruthy();
    expect(getByText('删除')).toBeTruthy();
    expect(getByText('取消')).toBeTruthy();
  });

  it('calls onEdit and onClose when edit is pressed', () => {
    const onEdit = jest.fn();
    const onClose = jest.fn();
    const { getByText } = render(
      <EntryActionSheet {...baseProps} visible={true} onEdit={onEdit} onClose={onClose} />
    );
    fireEvent.press(getByText('编辑'));
    expect(onEdit).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows confirmation view when delete is pressed', () => {
    const { getByText, queryByText } = render(
      <EntryActionSheet {...baseProps} visible={true} />
    );
    expect(queryByText('确认删除这条记录？')).toBeNull();
    fireEvent.press(getByText('删除'));
    expect(getByText('确认删除这条记录？')).toBeTruthy();
    expect(getByText('此操作无法撤销')).toBeTruthy();
  });

  it('calls onDelete and onClose when confirm delete is pressed', () => {
    const onDelete = jest.fn();
    const onClose = jest.fn();
    const { getByText, getAllByText } = render(
      <EntryActionSheet {...baseProps} visible={true} onDelete={onDelete} onClose={onClose} />
    );
    fireEvent.press(getByText('删除'));
    // 确认视图中的「删除」按钮
    const deleteButtons = getAllByText('删除');
    fireEvent.press(deleteButtons[deleteButtons.length - 1]);
    expect(onDelete).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('returns to menu view when cancel is pressed in confirm view', () => {
    const { getByText, queryByText, getAllByText } = render(
      <EntryActionSheet {...baseProps} visible={true} />
    );
    fireEvent.press(getByText('删除'));
    expect(getByText('确认删除这条记录？')).toBeTruthy();
    // 确认视图中的「取消」
    const cancelButtons = getAllByText('取消');
    fireEvent.press(cancelButtons[cancelButtons.length - 1]);
    expect(queryByText('确认删除这条记录？')).toBeNull();
    expect(getByText('编辑')).toBeTruthy();
  });

  it('calls onClose when overlay is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <EntryActionSheet {...baseProps} visible={true} onClose={onClose} />
    );
    fireEvent.press(getByTestId('action-sheet-overlay'));
    expect(onClose).toHaveBeenCalled();
  });

  it('resets to menu view when reopened after being closed', () => {
    const { getByText, queryByText, rerender } = render(
      <EntryActionSheet {...baseProps} visible={true} />
    );
    fireEvent.press(getByText('删除'));
    expect(getByText('确认删除这条记录？')).toBeTruthy();
    // 关闭再打开
    rerender(<EntryActionSheet {...baseProps} visible={false} />);
    rerender(<EntryActionSheet {...baseProps} visible={true} />);
    expect(queryByText('确认删除这条记录？')).toBeNull();
    expect(getByText('编辑')).toBeTruthy();
  });
```

- [ ] **Step 4: 再次运行确认仍然失败（组件未创建）**

```bash
cd app && npx jest src/components/__tests__/EntryActionSheet.test.tsx --no-coverage 2>&1 | tail -5
```

---

### Task 2: 实现 EntryActionSheet 组件

**Files:**
- Create: `app/src/components/EntryActionSheet.tsx`

- [ ] **Step 1: 创建组件骨架（让第一个"不渲染"测试通过）**

实现要点：
- `props`: `visible`, `entryType: 'text' | 'photo' | 'voice'`, `onEdit`, `onDelete`, `onClose`
- 内部 state: `mode: 'menu' | 'confirm'`，初始值 `'menu'`
- 使用 `Modal` (`transparent={true}`, `animationType="none"`)
- `visible=false` 时 Modal 不显示，返回 null 或 Modal closed 状态
- 遮罩层 `testID="action-sheet-overlay"`
- 入场动画：使用 `useSharedValue` + `useEffect` 监听 `visible`，`visible=true` 时通过 `withSpring` 将面板 translateY 从屏幕高度滑到 0
- 退场：visible 变 false 时 `withTiming` 滑出，动画完成后才真正关闭（可用 `runOnJS`）
- `visible` 从 true 变 false 时，`useEffect` 将 `mode` 重置为 `'menu'`

面板顶部色条颜色映射：
```
text  → '#A491D3'
photo → '#77C9D4'
voice → '#F5A623'
```

菜单视图结构：
- 顶部色条（高度 4）
- 拖拽指示条（居中，`width:36, height:4, borderRadius:2, backgroundColor:'#E0E0E0'`，`marginVertical:12`）
- 「编辑」行（`TouchableOpacity`，高度 56，左侧 `pencil-outline` 图标灰色，右侧文字黑色）
- 分割线（高度 1，颜色 `#F0F0F0`）
- 「删除」行（`TouchableOpacity`，高度 56，左侧 `trash-outline` 图标红色，文字红色 `#FF3B30`）
- 间距 8
- 取消按钮（独立圆角卡片 `borderRadius:14`，高度 52，文字「取消」颜色 `#8E8E93`）
- 底部 `insets.bottom` padding

确认视图结构：
- 顶部色条 + 拖拽指示条（同上）
- 标题「确认删除这条记录？」（居中，`fontSize:16, fontWeight:'600', color:'#1A1A1A'`）
- 副标题「此操作无法撤销」（居中，`fontSize:13, color:'#8E8E93'`，`marginTop:4`）
- 间距 16
- 确认删除按钮（全宽，`borderRadius:14`，`backgroundColor:'#FF3B30'`，高度 52，白色文字「删除」）
- 返回按钮（文字「取消」，颜色 `#8E8E93`，居中，`marginTop:8`）
- 底部 `insets.bottom` padding

下滑手势（`PanResponder` 绑定在面板容器上）：
- `onMoveShouldSetPanResponder`: `dy > 10`
- `onPanResponderRelease`: `vy > 0.5` 时触发 `onClose`

- [ ] **Step 2: 运行测试确认全部通过**

```bash
cd app && npx jest src/components/__tests__/EntryActionSheet.test.tsx --no-coverage 2>&1 | tail -20
```
预期：PASS，所有 8 个测试通过

- [ ] **Step 3: 提交**

```bash
cd app && git add src/components/EntryActionSheet.tsx src/components/__tests__/EntryActionSheet.test.tsx
git commit -m "feat: add EntryActionSheet bottom sheet component"
```

---

## Chunk 2: 更新 EntryCard

### Task 3: 更新 EntryCard 测试（先改测试，再改实现）

**Files:**
- Modify: `app/src/components/__tests__/EntryCard.test.tsx`

现有 `EntryCard swipe actions` describe 块测试的是"显示滑出按钮"的旧行为，需要改为测试"触发底部面板"。

- [ ] **Step 1: 更新 Swipeable mock，暴露 `onSwipeableOpen` 回调**

将现有 mock 中的 Swipeable 实现修改为：

```tsx
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Swipeable = React.forwardRef(({ children, onSwipeableOpen }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      close: jest.fn(),
    }));
    return (
      <View
        testID="swipeable"
        onSwipeableOpen={onSwipeableOpen}
      >
        {children}
      </View>
    );
  });
  Swipeable.displayName = 'Swipeable';
  return { Swipeable };
});
```

并在 imports 区域补充 mock `EntryActionSheet`：

```tsx
jest.mock('../EntryActionSheet', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    EntryActionSheet: ({ visible, onEdit, onDelete, onClose }: any) => {
      if (!visible) return null;
      return (
        <View testID="entry-action-sheet">
          <TouchableOpacity testID="action-sheet-edit" onPress={() => { onEdit(); onClose(); }}>
            <Text>编辑</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="action-sheet-delete" onPress={() => { onDelete(); onClose(); }}>
            <Text>删除</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="action-sheet-cancel" onPress={onClose}>
            <Text>取消</Text>
          </TouchableOpacity>
        </View>
      );
    },
  };
});
```

- [ ] **Step 2: 替换 `EntryCard swipe actions` describe 块**

删除原有的 4 个 swipe 测试，替换为：

```tsx
describe('EntryCard swipe actions', () => {
  it('does not show action sheet by default', () => {
    const { queryByTestId } = render(
      <EntryCard entry={mockEntry} onDelete={jest.fn()} />
    );
    expect(queryByTestId('entry-action-sheet')).toBeNull();
  });

  it('shows action sheet after left swipe (onSwipeableOpen)', () => {
    const { getByTestId } = render(
      <EntryCard entry={mockEntry} onDelete={jest.fn()} />
    );
    act(() => {
      getByTestId('swipeable').props.onSwipeableOpen('right');
    });
    expect(getByTestId('entry-action-sheet')).toBeTruthy();
  });

  it('calls onEdit when edit is pressed in action sheet', () => {
    const onEdit = jest.fn();
    const { getByTestId } = render(
      <EntryCard entry={mockEntry} onDelete={jest.fn()} onEdit={onEdit} />
    );
    act(() => {
      getByTestId('swipeable').props.onSwipeableOpen('right');
    });
    fireEvent.press(getByTestId('action-sheet-edit'));
    expect(onEdit).toHaveBeenCalledWith(mockEntry);
  });

  it('calls onDelete when delete is confirmed in action sheet', () => {
    const onDelete = jest.fn();
    const { getByTestId } = render(
      <EntryCard entry={mockEntry} onDelete={onDelete} />
    );
    act(() => {
      getByTestId('swipeable').props.onSwipeableOpen('right');
    });
    fireEvent.press(getByTestId('action-sheet-delete'));
    expect(onDelete).toHaveBeenCalledWith(mockEntry.id);
  });

  it('closes action sheet when cancel is pressed', () => {
    const { getByTestId, queryByTestId } = render(
      <EntryCard entry={mockEntry} onDelete={jest.fn()} />
    );
    act(() => {
      getByTestId('swipeable').props.onSwipeableOpen('right');
    });
    fireEvent.press(getByTestId('action-sheet-cancel'));
    expect(queryByTestId('entry-action-sheet')).toBeNull();
  });
});
```

- [ ] **Step 3: 运行测试确认新测试失败（EntryCard 未更新）**

```bash
cd app && npx jest src/components/__tests__/EntryCard.test.tsx --no-coverage 2>&1 | tail -20
```
预期：FAIL，swipe 相关测试失败

---

### Task 4: 更新 EntryCard 实现

**Files:**
- Modify: `app/src/components/EntryCard.tsx`

- [ ] **Step 1: 更新 props 接口**

1. 从 `EntryCardProps` 接口中移除 `isSwipeOpen`、`onSwipeStart`、`onSwipeClose`
2. 新增：
   ```tsx
   isActionSheetActive?: boolean;
   onActionSheetOpen?: (entryId: string) => void;
   ```
3. 在函数参数解构中对应更新

- [ ] **Step 2: 更新内部 state 和 effect**

1. 将 `isSwipeOpen` 相关的 `useEffect`（监听并调用 `swipeableRef.current.close()`）改为监听 `isActionSheetActive`：
   ```tsx
   useEffect(() => {
     if (!isActionSheetActive) {
       setShowActionSheet(false);
     }
   }, [isActionSheetActive]);
   ```
2. 新增 state：`const [showActionSheet, setShowActionSheet] = useState(false);`
3. 移除 `handleActionDelete` 函数（删除确认逻辑已移入 `EntryActionSheet`）

- [ ] **Step 3: 更新 renderRightActions**

将现有 `renderRightActions` 函数替换为返回宽度为 1 的透明占位 View：

```tsx
const renderRightActions = () => (
  <View style={{ width: 1 }} />
);
```

- [ ] **Step 4: 更新 Swipeable 回调**

将 `onSwipeableWillOpen` 和 `onSwipeableWillClose` 替换为 `onSwipeableOpen`：

```tsx
onSwipeableOpen={() => {
  swipeableRef.current?.close();
  setShowActionSheet(true);
  onActionSheetOpen?.(entry.id);
}}
```
移除 `onSwipeableWillClose`。

- [ ] **Step 5: 添加 EntryActionSheet 渲染**

在 `Swipeable` 返回的 JSX 内（`Animated.View` 后）添加：

```tsx
<EntryActionSheet
  visible={showActionSheet}
  entryType={entry.type}
  onEdit={() => {
    setShowActionSheet(false);
    onEdit?.(entry);
  }}
  onDelete={() => {
    setShowActionSheet(false);
    onDelete(entry.id);
  }}
  onClose={() => setShowActionSheet(false)}
/>
```

- [ ] **Step 6: 添加 import**

在文件顶部 imports 中添加：
```tsx
import { EntryActionSheet } from './EntryActionSheet';
```

- [ ] **Step 7: 运行测试确认 EntryCard 测试全部通过**

```bash
cd app && npx jest src/components/__tests__/EntryCard.test.tsx --no-coverage 2>&1 | tail -20
```
预期：PASS

- [ ] **Step 8: 运行全部测试确认没有回归**

```bash
cd app && npx jest --no-coverage 2>&1 | tail -20
```
预期：全部 PASS

- [ ] **Step 9: 提交**

```bash
cd app && git add src/components/EntryCard.tsx src/components/__tests__/EntryCard.test.tsx
git commit -m "feat: replace swipe buttons with bottom action sheet in EntryCard"
```

---

## Chunk 3: 更新 Timeline.v2

### Task 5: 更新 Timeline.v2 接口

**Files:**
- Modify: `app/src/components/Timeline.v2.tsx`

- [ ] **Step 1: 更新 EntryMarkerProps 接口**

在 `EntryMarkerProps` 中：
- 移除 `isSwipeOpen: boolean`
- 移除 `onSwipeStart: (id: string) => void`
- 移除 `onSwipeClose: (id: string) => void`
- 新增 `isActionSheetActive: boolean`
- 新增 `onActionSheetOpen: (id: string) => void`

- [ ] **Step 2: 更新 EntryMarker 函数签名和 EntryCard 调用**

在 `EntryMarker` 函数参数解构中对应更新，并将传给 `EntryCard` 的 props 更新为：
- 移除 `isSwipeOpen`、`onSwipeStart`、`onSwipeClose`
- 添加 `isActionSheetActive={isActionSheetActive}`
- 添加 `onActionSheetOpen={onActionSheetOpen}`

- [ ] **Step 3: 更新 Timeline 主组件**

在 `Timeline` 函数中：
1. 将 `openSwipeId` state 重命名为 `activeActionSheetId`
2. 移除 `handleSwipeStart` 和 `handleSwipeClose` 函数
3. 新增 `handleActionSheetOpen`：
   ```tsx
   const handleActionSheetOpen = useCallback((id: string) => {
     setActiveActionSheetId(id);
   }, []);
   ```
4. 更新 `renderItem` 中传给 `EntryMarker` 的 props：
   - 移除 `isSwipeOpen`、`onSwipeStart`、`onSwipeClose`
   - 添加 `isActionSheetActive={activeActionSheetId === item.id}`
   - 添加 `onActionSheetOpen={handleActionSheetOpen}`
5. 更新 `renderItem` 的 `useCallback` 依赖数组：移除旧的 swipe 相关依赖，添加 `activeActionSheetId`、`handleActionSheetOpen`

- [ ] **Step 4: 运行全部测试确认无回归**

```bash
cd app && npx jest --no-coverage 2>&1 | tail -20
```
预期：全部 PASS

- [ ] **Step 5: 运行 TypeScript 类型检查**

```bash
cd app && npx tsc --noEmit 2>&1 | head -30
```
预期：无错误输出

- [ ] **Step 6: 提交**

```bash
cd app && git add src/components/Timeline.v2.tsx
git commit -m "feat: update Timeline to use activeActionSheetId for bottom sheet"
```

---

## 最终验证

- [ ] **运行所有测试**

```bash
cd app && npx jest --no-coverage 2>&1 | tail -30
```
预期：全部 PASS

- [ ] **运行 TypeScript 检查**

```bash
cd app && npx tsc --noEmit 2>&1
```
预期：无错误

- [ ] **手动测试清单**（在设备/模拟器上验证）
  1. 左滑文字卡片 → 卡片弹回 + 底部面板弹出，色条为紫色
  2. 左滑照片卡片 → 色条为青色
  3. 左滑语音卡片 → 色条为橙色
  4. 点击「编辑」→ 编辑器打开，面板关闭
  5. 点击「删除」→ 切换到确认视图
  6. 确认视图点「取消」→ 回到菜单视图
  7. 确认视图点「删除」→ 条目删除，面板关闭
  8. 点击遮罩 → 面板关闭
  9. 下滑面板 → 面板关闭
  10. 两张卡片：打开第一张面板后左滑第二张 → 第一张面板关闭，第二张面板弹出
