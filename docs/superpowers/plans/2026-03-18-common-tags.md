# 常用标签快速选择 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在编辑器和搜索筛选界面展示可自定义的常用标签 chip，供用户快速点选，减少手动输入摩擦。

**Architecture:** 新建 Zustand store（`commonTagsStore`）用 MMKV 持久化常用标签列表，跟随 `settingsStore` 的既有模式。编辑器中在标签输入框前插入 chip 网格；搜索界面将常用标签追加到已使用标签列表后。新增 `TagManagementPage` 组件接入设置页。

**Tech Stack:** React Native, TypeScript, Zustand 5.0, MMKV (via `Storage` util), NativeWind/StyleSheet, Expo Router

**Spec:** `docs/superpowers/specs/2026-03-18-common-tags-design.md`

---

## File Map

| 文件 | 操作 | 职责 |
|------|------|------|
| `app/src/store/commonTagsStore.ts` | 新建 | 常用标签的 Zustand store（MMKV 持久化）⚠️ Spec 原定为 `src/hooks/useCommonTags.ts`，本计划有意改为 Zustand store 以与 `settingsStore` 模式保持一致 |
| `app/src/store/__tests__/commonTagsStore.test.ts` | 新建 | store 单元测试 |
| `app/src/components/TagManagementPage.tsx` | 新建 | 标签管理页（增/删/重置） |
| `app/src/components/SettingsPage.tsx` | 修改 | 新增「常用标签管理」入口行 |
| `app/src/components/TextEditor.tsx` | 修改 | 标签区新增常用标签 chip 网格 |
| `app/src/components/EntryEditor.tsx` | 修改 | 同上 |
| `app/src/components/SearchOverlay.tsx` | 修改 | 标签筛选区追加常用标签 |

---

## Task 1: 创建 `commonTagsStore`

> **架构说明：** Spec 原定数据层为同步 hook（`src/hooks/useCommonTags.ts`），本计划改为 Zustand store（`src/store/commonTagsStore.ts`），理由是与现有 `settingsStore` 模式完全一致，并共享 `Storage.getObject/setObject`（MMKV 同步读写的异步包装）。实施者**以本计划为准**，忽略 Spec 中的文件路径。

**Files:**
- Create: `app/src/store/commonTagsStore.ts`
- Create: `app/src/store/__tests__/commonTagsStore.test.ts`

- [ ] **Step 1: 写失败测试**

新建 `app/src/store/__tests__/commonTagsStore.test.ts`：

```ts
jest.mock('@/src/utils/storage', () => ({
  Storage: {
    getObject: jest.fn(),
    setObject: jest.fn(),
  },
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { useCommonTagsStore } from '../commonTagsStore';

const { Storage } = require('@/src/utils/storage');

const DEFAULTS = ['工作', '学习', '健康', '心情', '朋友', '家人', '美食', '旅行', '思考', '娱乐', '购物', '天气'];

const resetStore = () =>
  useCommonTagsStore.setState({ tags: DEFAULTS, isLoaded: false });

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('loadCommonTags', () => {
  it('defaults to 12 preset tags when storage is empty', async () => {
    Storage.getObject.mockResolvedValue(null);
    await useCommonTagsStore.getState().loadCommonTags();
    expect(useCommonTagsStore.getState().tags).toEqual(DEFAULTS);
  });

  it('loads persisted tags from storage', async () => {
    Storage.getObject.mockResolvedValue(['旅行', '美食']);
    await useCommonTagsStore.getState().loadCommonTags();
    expect(useCommonTagsStore.getState().tags).toEqual(['旅行', '美食']);
  });
});

describe('addCommonTag', () => {
  it('adds a new tag', async () => {
    Storage.setObject.mockResolvedValue(undefined);
    useCommonTagsStore.setState({ tags: ['工作'], isLoaded: true });
    await useCommonTagsStore.getState().addCommonTag('学习');
    expect(useCommonTagsStore.getState().tags).toContain('学习');
  });

  it('does not add duplicate tags', async () => {
    Storage.setObject.mockResolvedValue(undefined);
    useCommonTagsStore.setState({ tags: ['工作'], isLoaded: true });
    await useCommonTagsStore.getState().addCommonTag('工作');
    expect(useCommonTagsStore.getState().tags.filter((t) => t === '工作')).toHaveLength(1);
  });

  it('does not exceed 20 tags', async () => {
    Storage.setObject.mockResolvedValue(undefined);
    const twentyTags = Array.from({ length: 20 }, (_, i) => `tag${i}`);
    useCommonTagsStore.setState({ tags: twentyTags, isLoaded: true });
    await useCommonTagsStore.getState().addCommonTag('extra');
    expect(useCommonTagsStore.getState().tags).toHaveLength(20);
  });
});

describe('removeCommonTag', () => {
  it('removes a tag', async () => {
    Storage.setObject.mockResolvedValue(undefined);
    useCommonTagsStore.setState({ tags: ['工作', '学习'], isLoaded: true });
    await useCommonTagsStore.getState().removeCommonTag('工作');
    expect(useCommonTagsStore.getState().tags).not.toContain('工作');
  });
});

describe('resetToDefaults', () => {
  it('restores the 12 default tags', async () => {
    Storage.setObject.mockResolvedValue(undefined);
    useCommonTagsStore.setState({ tags: ['自定义'], isLoaded: true });
    await useCommonTagsStore.getState().resetToDefaults();
    expect(useCommonTagsStore.getState().tags).toEqual(DEFAULTS);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd app && npx jest src/store/__tests__/commonTagsStore.test.ts --no-coverage
```

期望：`Cannot find module '../commonTagsStore'`

- [ ] **Step 3: 实现 `commonTagsStore.ts`**

新建 `app/src/store/commonTagsStore.ts`：

```ts
import { create } from 'zustand';
import { Storage } from '@/src/utils/storage';

const STORAGE_KEY = 'common_tags';
const MAX_TAGS = 20;

export const DEFAULT_COMMON_TAGS: string[] = [
  '工作', '学习', '健康', '心情', '朋友',
  '家人', '美食', '旅行', '思考', '娱乐', '购物', '天气',
];

interface CommonTagsStore {
  tags: string[];
  isLoaded: boolean;
  loadCommonTags: () => Promise<void>;
  addCommonTag: (tag: string) => Promise<void>;
  removeCommonTag: (tag: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

export const useCommonTagsStore = create<CommonTagsStore>((set, get) => ({
  tags: DEFAULT_COMMON_TAGS,
  isLoaded: false,

  loadCommonTags: async () => {
    const stored = await Storage.getObject<string[]>(STORAGE_KEY);
    set({ tags: stored ?? DEFAULT_COMMON_TAGS, isLoaded: true });
  },

  addCommonTag: async (tag: string) => {
    const current = get().tags;
    if (current.includes(tag) || current.length >= MAX_TAGS) return;
    const next = [...current, tag];
    set({ tags: next });
    await Storage.setObject(STORAGE_KEY, next);
  },

  removeCommonTag: async (tag: string) => {
    const next = get().tags.filter((t) => t !== tag);
    set({ tags: next });
    await Storage.setObject(STORAGE_KEY, next);
  },

  resetToDefaults: async () => {
    set({ tags: DEFAULT_COMMON_TAGS });
    await Storage.setObject(STORAGE_KEY, DEFAULT_COMMON_TAGS);
  },
}));
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
cd app && npx jest src/store/__tests__/commonTagsStore.test.ts --no-coverage
```

期望：所有测试通过

- [ ] **Step 5: 提交**

```bash
cd app && git add src/store/commonTagsStore.ts src/store/__tests__/commonTagsStore.test.ts
git commit -m "feat: add commonTagsStore with MMKV persistence"
```

---

## Task 2: 创建 `TagManagementPage`

**Files:**
- Create: `app/src/components/TagManagementPage.tsx`

- [ ] **Step 1: 实现组件**

新建 `app/src/components/TagManagementPage.tsx`：

```tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DetailPageShell } from './DetailPageShell';
import { useCommonTagsStore, DEFAULT_COMMON_TAGS } from '@/src/store/commonTagsStore';

interface TagManagementPageProps {
  visible: boolean;
  onClose: () => void;
}

const MAX_TAGS = 20;

export function TagManagementPage({ visible, onClose }: TagManagementPageProps) {
  const { tags, isLoaded, loadCommonTags, addCommonTag, removeCommonTag, resetToDefaults } =
    useCommonTagsStore();
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (visible && !isLoaded) {
      loadCommonTags();
    }
  }, [visible, isLoaded, loadCommonTags]);

  const handleAdd = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (tags.length >= MAX_TAGS) {
      Alert.alert('已达上限', `最多 ${MAX_TAGS} 个常用标签`);
      return;
    }
    await addCommonTag(trimmed);
    setInputValue('');
  };

  const handleDelete = (tag: string) => {
    Alert.alert('删除标签', `确认删除「${tag}」吗？`, [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => removeCommonTag(tag) },
    ]);
  };

  const handleReset = () => {
    Alert.alert('恢复默认', `将恢复为 ${DEFAULT_COMMON_TAGS.length} 个默认标签，当前自定义将丢失。`, [
      { text: '取消', style: 'cancel' },
      { text: '恢复', style: 'destructive', onPress: () => resetToDefaults() },
    ]);
  };

  const atLimit = tags.length >= MAX_TAGS;

  return (
    <DetailPageShell visible={visible} title="标签管理" onClose={onClose}>
      {/* 恢复默认 */}
      <TouchableOpacity style={styles.resetRow} onPress={handleReset}>
        <Ionicons name="refresh" size={18} color="#6A89CC" />
        <Text style={styles.resetText}>恢复默认标签</Text>
      </TouchableOpacity>

      {/* 标签列表 */}
      <Text style={styles.hint}>共 {tags.length} / {MAX_TAGS} 个</Text>
      <FlatList
        data={tags}
        keyExtractor={(item) => item}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.tagRow}>
            <Text style={styles.tagName}>#{item}</Text>
            <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color="#E57373" />
            </TouchableOpacity>
          </View>
        )}
      />

      {/* 添加新标签 */}
      <View style={styles.addRow}>
        <TextInput
          style={[styles.addInput, atLimit && styles.addInputDisabled]}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder={atLimit ? `最多 ${MAX_TAGS} 个` : '输入新标签名'}
          placeholderTextColor="#A3A3A3"
          editable={!atLimit}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
        <TouchableOpacity
          style={[styles.addButton, atLimit && styles.addButtonDisabled]}
          onPress={handleAdd}
          disabled={atLimit}
        >
          <Text style={[styles.addButtonText, atLimit && styles.addButtonTextDisabled]}>添加</Text>
        </TouchableOpacity>
      </View>
    </DetailPageShell>
  );
}

const styles = StyleSheet.create({
  resetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 12,
  },
  resetText: { fontSize: 15, color: '#6A89CC', fontWeight: '500' },
  hint: { fontSize: 12, color: '#A3A3A3', marginBottom: 8 },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  tagName: { fontSize: 15, color: '#4A4A4A' },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  addInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    backgroundColor: '#FAFAFA',
    color: '#4A4A4A',
  },
  addInputDisabled: { backgroundColor: '#F5F5F5', color: '#C0C0C0' },
  addButton: {
    height: 44,
    paddingHorizontal: 18,
    backgroundColor: '#6A89CC',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: { backgroundColor: '#E5E5E5' },
  addButtonText: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
  addButtonTextDisabled: { color: '#A3A3A3' },
});
```

- [ ] **Step 2: 检查 `DetailPageShell` 是否已存在**

```bash
cd app && grep -r "DetailPageShell" src/components/ --include="*.tsx" -l
```

期望：至少找到一个文件（`BackupPage.tsx` 或 `AboutPage.tsx`）。若不存在请先查找正确文件名。

- [ ] **Step 3: 手动验证（此组件无复杂纯逻辑，跳过单元测试）**

在设备/模拟器上目视检查（Task 3 集成后）。

- [ ] **Step 4: 提交**

```bash
cd app && git add src/components/TagManagementPage.tsx
git commit -m "feat: add TagManagementPage for common tags management"
```

---

## Task 3: 接入 `SettingsPage`

**Files:**
- Modify: `app/src/components/SettingsPage.tsx:276-286`

- [ ] **Step 1: 在 `SettingsPage.tsx` 顶部添加 import**

在文件已有 import 区域末尾添加：

```ts
import { TagManagementPage } from './TagManagementPage';
```

- [ ] **Step 2: 在 `SettingsPage` 函数体内添加 state**

在 `SettingsPage` 函数内现有 `const [usedSpace, setUsedSpace] = useState(...)` 下方添加：

```ts
const [showTagMgmt, setShowTagMgmt] = useState(false);
```

- [ ] **Step 3: 在「其他设置」区域插入新入口行**

找到（约第 276-286 行）：
```tsx
      {/* 其他设置 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>其他</Text>
        <SettingButton
          icon="refresh"
          title="重置设置"
```

在 `重置设置` 的 `SettingButton` **前**插入：

```tsx
        <SettingButton
          icon="pricetag"
          title="常用标签管理"
          subtitle="自定义快速选择的标签"
          onPress={() => setShowTagMgmt(true)}
        />
```

- [ ] **Step 4: 在 `</DetailPageShell>` 闭合标签前添加 `TagManagementPage`**

找到 `</DetailPageShell>` 前，添加：

```tsx
      <TagManagementPage visible={showTagMgmt} onClose={() => setShowTagMgmt(false)} />
```

- [ ] **Step 5: 运行全量测试，确认无回归**

```bash
cd app && npx jest --no-coverage
```

期望：之前通过的测试依然通过。

- [ ] **Step 6: 提交**

```bash
cd app && git add src/components/SettingsPage.tsx
git commit -m "feat: add common tags management entry in settings"
```

---

## Task 4: 更新 `TextEditor` — 添加常用标签 chip 网格

**Files:**
- Modify: `app/src/components/TextEditor.tsx`

- [ ] **Step 1: 添加 import**

在文件顶部现有 import 区域末尾添加：

```ts
import { useCommonTagsStore } from '@/src/store/commonTagsStore';
```

- [ ] **Step 2: 在组件内读取 store 并添加 `handleRemoveTag`**

在 `TextEditor` 函数体内，紧接现有 `handleAddSuggestion` 定义之后添加：

```ts
  const { tags: commonTags, isLoaded: tagsLoaded, loadCommonTags } = useCommonTagsStore();

  useEffect(() => {
    if (!tagsLoaded) loadCommonTags();
  }, [tagsLoaded, loadCommonTags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTagsInput((prev) => {
      const parts = prev.split(',').map((t) => t.trim()).filter(Boolean);
      return parts.filter((t) => t !== tag).join(', ');
    });
  }, []);
```

- [ ] **Step 3: 在标签 section 的 `<Text style={styles.label}>标签</Text>` 后插入 chip 网格**

找到标签 section（约第 107 行）：

```tsx
            <View style={styles.section}>
              <Text style={styles.label}>标签</Text>
              <TextInput
```

在 `<Text style={styles.label}>标签</Text>` 与 `<TextInput` 之间插入：

```tsx
              {commonTags.length > 0 && (
                <View style={styles.commonTagsRow}>
                  {commonTags.map((tag) => {
                    const currentTags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
                    const selected = currentTags.includes(tag);
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[styles.commonChip, selected && styles.commonChipSelected]}
                        onPress={() => selected ? handleRemoveTag(tag) : handleAddSuggestion(tag)}
                      >
                        <Text style={[styles.commonChipText, selected && styles.commonChipTextSelected]}>
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
```

- [ ] **Step 4: 在 `StyleSheet.create({...})` 中添加新样式**

在 `styles` 对象末尾（关闭 `}` 前）添加：

```ts
  commonTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 10,
  },
  commonChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#E0DAFA',
  },
  commonChipSelected: {
    backgroundColor: '#A491D3',
    borderColor: '#A491D3',
  },
  commonChipText: {
    fontSize: 13,
    color: '#6A5ACD',
  },
  commonChipTextSelected: {
    color: '#FFFFFF',
  },
```

- [ ] **Step 5: 运行全量测试**

```bash
cd app && npx jest --no-coverage
```

期望：所有测试通过。

- [ ] **Step 6: 提交**

```bash
cd app && git add src/components/TextEditor.tsx
git commit -m "feat: add common tag chips to TextEditor"
```

---

## Task 5: 更新 `EntryEditor` — 添加常用标签 chip 网格

**Files:**
- Modify: `app/src/components/EntryEditor.tsx`

> 与 Task 4 完全相同的改动，应用到 `EntryEditor.tsx`。

- [ ] **Step 1: 添加 import**

```ts
import { useCommonTagsStore } from '@/src/store/commonTagsStore';
```

- [ ] **Step 2: 在组件内添加 store 读取 + `handleRemoveTag`**

紧接现有 `handleAddSuggestion` 之后：

```ts
  const { tags: commonTags, isLoaded: tagsLoaded, loadCommonTags } = useCommonTagsStore();

  useEffect(() => {
    if (!tagsLoaded) loadCommonTags();
  }, [tagsLoaded, loadCommonTags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTagsInput((prev) => {
      const parts = prev.split(',').map((t) => t.trim()).filter(Boolean);
      return parts.filter((t) => t !== tag).join(', ');
    });
  }, []);
```

- [ ] **Step 3: 插入 chip 网格**

在 `EntryEditor.tsx` 标签 section 的 `<Text style={styles.label}>标签</Text>` 后插入（与 Task 4 相同结构）：

```tsx
              {commonTags.length > 0 && (
                <View style={styles.commonTagsRow}>
                  {commonTags.map((tag) => {
                    const currentTags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
                    const selected = currentTags.includes(tag);
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[styles.commonChip, selected && styles.commonChipSelected]}
                        onPress={() => selected ? handleRemoveTag(tag) : handleAddSuggestion(tag)}
                      >
                        <Text style={[styles.commonChipText, selected && styles.commonChipTextSelected]}>
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
```

- [ ] **Step 4: 在 `StyleSheet.create({...})` 中添加新样式**

```ts
  commonTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 10,
  },
  commonChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#E0DAFA',
  },
  commonChipSelected: {
    backgroundColor: '#A491D3',
    borderColor: '#A491D3',
  },
  commonChipText: {
    fontSize: 13,
    color: '#6A5ACD',
  },
  commonChipTextSelected: {
    color: '#FFFFFF',
  },
```

- [ ] **Step 5: 运行全量测试**

```bash
cd app && npx jest --no-coverage
```

- [ ] **Step 6: 提交**

```bash
cd app && git add src/components/EntryEditor.tsx
git commit -m "feat: add common tag chips to EntryEditor"
```

---

## Task 6: 更新 `SearchOverlay` — 追加常用标签

**Files:**
- Modify: `app/src/components/SearchOverlay.tsx`

- [ ] **Step 1: 添加 import**

```ts
import { useCommonTagsStore } from '@/src/store/commonTagsStore';
```

- [ ] **Step 2: 在组件内读取 store，并计算合并列表**

在 `SearchOverlay` 函数体顶部（现有 state 声明后）添加：

```ts
  const { tags: commonTags, isLoaded: tagsLoaded, loadCommonTags } = useCommonTagsStore();

  useEffect(() => {
    if (!tagsLoaded) loadCommonTags();
  }, [tagsLoaded, loadCommonTags]);

  // 常用标签中尚未出现在已使用标签列表里的部分
  const extraCommonTags = commonTags.filter((t) => !allTagsList.includes(t));
```

- [ ] **Step 3: 替换标签区渲染逻辑**

找到现有的标签区（约第 209-232 行）：

```tsx
              {allTagsList.length === 0 ? (
                <Text style={styles.emptyTagsHint}>暂无标签，在编辑记录时添加</Text>
              ) : (
                <View style={styles.chips}>
                  {allTagsList.map((tag) => {
                    const selected = localTags.includes(tag);
                    return (
                      <Pressable
                        key={tag}
                        style={[styles.tagChip, selected && styles.tagChipActive]}
                        onPress={() => handleToggleTag(tag)}
                      >
                        {selected && (
                          <Ionicons name="checkmark" size={13} color="#FFFFFF" style={{ marginRight: 3 }} />
                        )}
                        <Text style={[styles.tagChipText, selected && styles.activeText]}>
                          #{tag}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
```

替换为：

```tsx
              {allTagsList.length === 0 && extraCommonTags.length === 0 ? (
                <Text style={styles.emptyTagsHint}>暂无标签，在编辑记录时添加</Text>
              ) : (
                <View style={styles.chips}>
                  {allTagsList.map((tag) => {
                    const selected = localTags.includes(tag);
                    return (
                      <Pressable
                        key={tag}
                        style={[styles.tagChip, selected && styles.tagChipActive]}
                        onPress={() => handleToggleTag(tag)}
                      >
                        {selected && (
                          <Ionicons name="checkmark" size={13} color="#FFFFFF" style={{ marginRight: 3 }} />
                        )}
                        <Text style={[styles.tagChipText, selected && styles.activeText]}>
                          #{tag}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {extraCommonTags.map((tag) => {
                    const selected = localTags.includes(tag);
                    return (
                      <Pressable
                        key={tag}
                        style={[styles.tagChip, styles.tagChipCommon, selected && styles.tagChipActive]}
                        onPress={() => handleToggleTag(tag)}
                      >
                        {selected && (
                          <Ionicons name="checkmark" size={13} color="#FFFFFF" style={{ marginRight: 3 }} />
                        )}
                        <Text style={[styles.tagChipText, styles.tagChipCommonText, selected && styles.activeText]}>
                          #{tag}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
```

- [ ] **Step 4: 在 `StyleSheet` 中添加常用标签浅色样式**

```ts
  tagChipCommon: {
    backgroundColor: '#FAFAFA',
    borderColor: '#E5E5E5',
  },
  tagChipCommonText: {
    color: '#A3A3A3',
  },
```

- [ ] **Step 5: 运行全量测试**

```bash
cd app && npx jest --no-coverage
```

期望：所有测试通过。

- [ ] **Step 6: 提交**

```bash
cd app && git add src/components/SearchOverlay.tsx
git commit -m "feat: append common tags to search overlay tag filter"
```

---

## Task 7: 初始化时加载 `commonTagsStore`

**Files:**
- Modify: `app/app/(tabs)/index.tsx`（或主入口文件）

- [ ] **Step 1: 找到 app 初始化位置**

```bash
cd app && grep -n "loadSettings\|Promise.all" "app/(tabs)/index.tsx" | head -10
```

若未找到，依次检查 `app/_layout.tsx`、`app/index.tsx`。

- [ ] **Step 2: 添加 import**

```ts
import { useCommonTagsStore } from '@/src/store/commonTagsStore';
```

- [ ] **Step 3: 在已有的 `Promise.all` 启动加载中追加 `loadCommonTags()`**

找到（约第 94-97 行）：

```ts
    Promise.all([
      useSettingsStore.getState().loadSettings(),
      loadEntries(),
    ]);
```

改为：

```ts
    Promise.all([
      useSettingsStore.getState().loadSettings(),
      useCommonTagsStore.getState().loadCommonTags(),
      loadEntries(),
    ]);
```

- [ ] **Step 4: 运行全量测试**

```bash
cd app && npx jest --no-coverage
```

- [ ] **Step 5: 提交**

```bash
cd app && git add app/\(tabs\)/index.tsx
git commit -m "feat: load common tags on app startup"
```

---

## 完成检查

- [ ] `npx jest --no-coverage` 全量通过
- [ ] 设置页有「常用标签管理」入口，可增删标签
- [ ] 「恢复默认」弹出 Alert 确认，恢复 12 个默认标签
- [ ] TextEditor 和 EntryEditor 中可见 chip 网格，点选高亮，再次点击取消
- [ ] SearchOverlay 标签筛选区：已使用标签深色，常用标签浅色
- [ ] 超过 20 个标签时「添加」按钮置灰
