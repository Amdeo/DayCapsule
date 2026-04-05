# 预制标签管理页面重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将预制标签管理页面改版为 iOS 设置风格（灰底分组圆角卡片 + 拖拽排序 + 底部固定输入栏），纯视觉重构，不改动任何业务逻辑。

**Architecture:** 仅修改 `src/components/tag-management-page/` 目录下的样式文件和三个展示组件（`TagManagementPage.styles.ts`、`TagManagementPageContent.tsx`、`TagManagementTagRow.tsx`、`TagManagementTagList.tsx`），`TagManagementPage.tsx`（父容器）和 `useTagManagementController.ts`（业务逻辑）均不改动。现有 testID 和所有事件绑定保持不变，确保已有测试继续通过。

**Tech Stack:** React Native 0.81.5 · TypeScript 5.9 · NativeWind 4.0（本次不使用，沿用 StyleSheet）· react-native-draggable-flatlist

---

## 文件变更地图

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/tag-management-page/TagManagementPage.styles.ts` | 重写 | 全部样式替换为 iOS 分组风格 |
| `src/components/tag-management-page/TagManagementPageContent.tsx` | 修改 | 重组布局：灰底页面 → 分区说明 → 卡片列表 → 计数 → 重置卡片 → 底部输入栏 |
| `src/components/tag-management-page/TagManagementTagRow.tsx` | 修改 | 删除按钮改为红色实心圆 `−` 号，移除 Ionicons 依赖 |
| `src/components/tag-management-page/TagManagementTagList.tsx` | 微调 | 移除 `containerStyle` 中的 `flex:1`（改由外层卡片控制） |
| `src/components/__tests__/TagManagementPage.test.tsx` | 修改 | 更新两处文本断言（`当前预制标签` 改为新说明文字格式） |

---

## Task 1：重写样式文件

**Files:**
- Modify: `src/components/tag-management-page/TagManagementPage.styles.ts`

- [ ] **Step 1: 完整替换样式文件内容**

```typescript
import {
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export const tagManagementPageStyles = {
  // 页面容器
  page: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },

  // 滚动区域内边距容器
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },

  // 分区说明小字（卡片顶部上方）
  sectionLabel: {
    fontSize: 13,
    color: '#6C6C70',
    marginBottom: 6,
    paddingLeft: 4,
  },

  // 白色圆角卡片
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
  },

  // 标签行
  tagRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  tagRowActive: {
    backgroundColor: '#F7F9FC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tagLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dragHandle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagName: {
    fontSize: 17,
    color: '#1C1C1E',
  },

  // 删除按钮：红色实心圆
  deleteButton: {
    width: 22,
    height: 22,
    backgroundColor: '#FF3B30',
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 20,
    includeFontPadding: false,
  },

  // 计数提示（列表卡片下方，右对齐）
  hint: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'right',
    marginTop: 6,
    paddingRight: 4,
  },

  // 重置卡片
  resetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 24,
  },
  resetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  resetText: {
    fontSize: 17,
    color: '#007AFF',
  },

  // 底部固定输入栏
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 0.5,
    borderTopColor: '#C6C6C8',
    backgroundColor: '#F2F2F7',
  },
  addInput: {
    flex: 1,
    height: 44,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 17,
    backgroundColor: '#FFFFFF',
    color: '#1C1C1E',
  },
  addInputDisabled: {
    backgroundColor: '#F5F5F5',
    color: '#C0C0C0',
  },
  addButton: {
    height: 44,
    paddingHorizontal: 18,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  addButtonText: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  addButtonTextDisabled: {
    color: '#A3A3A3',
  },
} satisfies Record<string, ViewStyle | TextStyle>;
```

- [ ] **Step 2: 运行 typecheck 确认无类型错误**

```bash
cd app && npx tsc --noEmit 2>&1 | grep -E "tag-management|error" | head -20
```

期望：无输出（或只有无关的其他错误）

- [ ] **Step 3: 提交**

```bash
cd app && git add src/components/tag-management-page/TagManagementPage.styles.ts
git commit -m "style: rewrite tag management styles to iOS grouped card layout"
```

---

## Task 2：更新 TagManagementTagRow — 红色实心圆删除按钮

**Files:**
- Modify: `src/components/tag-management-page/TagManagementTagRow.tsx`

- [ ] **Step 1: 替换文件内容**

```typescript
import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { ScaleDecorator } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import { tagManagementPageStyles as styles } from './TagManagementPage.styles';

interface TagManagementTagRowProps {
  tag: string;
  index: number;
  isActive: boolean;
  drag: () => void;
  onDelete: (tag: string) => void;
}

export function TagManagementTagRow({
  tag,
  index,
  isActive,
  drag,
  onDelete,
}: TagManagementTagRowProps) {
  return (
    <ScaleDecorator>
      <View style={[styles.tagRow, isActive && styles.tagRowActive]}>
        <View style={styles.tagLeft}>
          <Pressable
            style={styles.dragHandle}
            testID={`preset-tag-drag-handle-${index}`}
            onLongPress={drag}
            hitSlop={8}
          >
            <Ionicons name="reorder-three-outline" size={20} color="#C7C7CC" />
          </Pressable>
          <Text style={styles.tagName}>#{tag}</Text>
        </View>
        <Pressable
          testID={`preset-tag-delete-${index}`}
          onPress={() => onDelete(tag)}
          hitSlop={8}
        >
          <View style={styles.deleteButton}>
            <Text style={styles.deleteButtonText}>−</Text>
          </View>
        </Pressable>
      </View>
    </ScaleDecorator>
  );
}
```

- [ ] **Step 2: 运行 typecheck**

```bash
cd app && npx tsc --noEmit 2>&1 | grep "TagManagementTagRow" | head -10
```

期望：无输出

- [ ] **Step 3: 提交**

```bash
cd app && git add src/components/tag-management-page/TagManagementTagRow.tsx
git commit -m "style: replace close-circle icon with red filled minus button in tag row"
```

---

## Task 3：更新 TagManagementTagList — 移除 containerStyle flex:1

**Files:**
- Modify: `src/components/tag-management-page/TagManagementTagList.tsx`

- [ ] **Step 1: 替换文件内容**

```typescript
import React, { useCallback } from 'react';
import DraggableFlatList, {
  type RenderItemParams,
  type DragEndParams,
} from 'react-native-draggable-flatlist';
import { TagManagementTagRow } from './TagManagementTagRow';

interface TagManagementTagListProps {
  tags: string[];
  onDelete: (tag: string) => void;
  onDragEnd: (params: DragEndParams<string>) => void;
}

export function TagManagementTagList({
  tags,
  onDelete,
  onDragEnd,
}: TagManagementTagListProps) {
  const renderItem = useCallback(
    ({ item, getIndex, drag, isActive }: RenderItemParams<string>) => (
      <TagManagementTagRow
        tag={item}
        index={getIndex() ?? 0}
        isActive={isActive}
        drag={drag}
        onDelete={onDelete}
      />
    ),
    [onDelete],
  );

  return (
    <DraggableFlatList
      testID="tag-management-tags-container"
      data={tags}
      keyExtractor={(item) => item}
      renderItem={renderItem}
      onDragEnd={onDragEnd}
      contentContainerStyle={{ paddingBottom: 0 }}
      keyboardShouldPersistTaps="handled"
      scrollEnabled
      showsVerticalScrollIndicator={false}
    />
  );
}
```

- [ ] **Step 2: 运行 typecheck**

```bash
cd app && npx tsc --noEmit 2>&1 | grep "TagManagementTagList" | head -10
```

期望：无输出

- [ ] **Step 3: 提交**

```bash
cd app && git add src/components/tag-management-page/TagManagementTagList.tsx
git commit -m "style: remove flex:1 from tag list container, controlled by parent card"
```

---

## Task 4：重组 TagManagementPageContent 布局

**Files:**
- Modify: `src/components/tag-management-page/TagManagementPageContent.tsx`

布局改为：灰底页面 → ScrollView 内容区（分区说明 + 列表卡片 + 计数文字 + 重置卡片）→ 底部固定输入栏。

- [ ] **Step 1: 替换文件内容**

```typescript
import React from 'react';
import { Text, TextInput, Pressable, View, ScrollView } from 'react-native';
import type { DragEndParams } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import { tagManagementPageStyles as styles } from './TagManagementPage.styles';
import { MAX_TAGS } from './tagManagementConfig';
import { TagManagementTagList } from './TagManagementTagList';

interface TagManagementPageContentProps {
  tags: string[];
  inputValue: string;
  atLimit: boolean;
  onInputChange: (value: string) => void;
  onAdd: () => void;
  onDelete: (tag: string) => void;
  onReset: () => void;
  onDragEnd: (params: DragEndParams<string>) => void;
}

export function TagManagementPageContent({
  tags,
  inputValue,
  atLimit,
  onInputChange,
  onAdd,
  onDelete,
  onReset,
  onDragEnd,
}: TagManagementPageContentProps) {
  return (
    <View testID="tag-management-root" style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 分区说明 */}
        <Text style={styles.sectionLabel}>
          当前预制标签 · 长按拖拽可排序
        </Text>

        {/* 标签列表卡片 */}
        <View style={styles.card}>
          <TagManagementTagList
            tags={tags}
            onDelete={onDelete}
            onDragEnd={onDragEnd}
          />
        </View>

        {/* 计数 */}
        <Text style={styles.hint}>
          {tags.length} / {MAX_TAGS} 个
        </Text>

        {/* 重置卡片 */}
        <View style={styles.resetCard}>
          <Pressable
            testID="tag-management-reset-button"
            style={styles.resetRow}
            onPress={onReset}
          >
            <Ionicons name="refresh" size={17} color="#007AFF" />
            <Text style={styles.resetText}>恢复初始预制标签</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* 底部固定输入栏 */}
      <View style={styles.addRow}>
        <TextInput
          testID="tag-management-add-input"
          style={[styles.addInput, atLimit && styles.addInputDisabled]}
          value={inputValue}
          onChangeText={onInputChange}
          placeholder={atLimit ? `最多 ${MAX_TAGS} 个预制标签` : '输入新预制标签'}
          placeholderTextColor="#A3A3A3"
          editable={!atLimit}
          returnKeyType="done"
          onSubmitEditing={onAdd}
        />
        <Pressable
          testID="tag-management-add-button"
          style={[styles.addButton, atLimit && styles.addButtonDisabled]}
          onPress={onAdd}
          disabled={atLimit}
        >
          <Text style={[styles.addButtonText, atLimit && styles.addButtonTextDisabled]}>添加</Text>
        </Pressable>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: 运行 typecheck**

```bash
cd app && npx tsc --noEmit 2>&1 | grep "TagManagementPageContent" | head -10
```

期望：无输出

- [ ] **Step 3: 提交**

```bash
cd app && git add src/components/tag-management-page/TagManagementPageContent.tsx
git commit -m "feat: reorganize tag management layout to iOS grouped card style"
```

---

## Task 5：修复测试断言，运行全部测试

现有测试在 `TagManagementPage.test.tsx` 中断言了原有文本 `'当前预制标签'` 和 `'这组标签会出现在快速选择区域'`，改版后这两行文字已合并为 `'当前预制标签 · 长按拖拽可排序'`，需要更新断言。

**Files:**
- Modify: `src/components/__tests__/TagManagementPage.test.tsx`

- [ ] **Step 1: 更新文本断言**

将文件第 133-134 行：
```typescript
    expect(screen.getByText('当前预制标签')).toBeTruthy();
    expect(screen.getByText('这组标签会出现在快速选择区域')).toBeTruthy();
```
替换为：
```typescript
    expect(screen.getByText('当前预制标签 · 长按拖拽可排序')).toBeTruthy();
```

- [ ] **Step 2: 运行全部 TagManagementPage 测试**

```bash
cd app && npx jest src/components/__tests__/TagManagementPage.test.tsx --no-coverage 2>&1 | tail -20
```

期望：`Tests: 11 passed, 11 total`（或当前测试数量全部通过），无 FAIL

- [ ] **Step 3: 运行全量测试，确认无回归**

```bash
cd app && npx jest --no-coverage 2>&1 | tail -15
```

期望：所有测试通过，无新增 FAIL

- [ ] **Step 4: 提交**

```bash
cd app && git add src/components/__tests__/TagManagementPage.test.tsx
git commit -m "test: update tag management text assertions for new iOS layout"
```
