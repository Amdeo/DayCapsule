# SearchBar 顶部安全区适配 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `SearchBar` 的 `paddingTop: 60` 硬编码替换为 `useSafeAreaInsets().top`，消除 Android 上搜索栏与状态栏之间的多余空白。

**Architecture:** 在 `SearchBar` 组件内部调用 `useSafeAreaInsets()`，将运行时值以内联样式方式传入容器 View，同时从 `StyleSheet.create` 中移除静态的 `paddingTop`。

**Tech Stack:** React Native, react-native-safe-area-context (`useSafeAreaInsets`), Jest + react-test-renderer

**Spec:** `docs/superpowers/specs/2026-03-16-searchbar-safe-area-design.md`

---

## 文件变更清单

| 操作 | 文件 |
|------|------|
| Modify | `app/src/components/SearchBar.tsx` |
| Create | `app/src/components/__tests__/SearchBar.safe-area.test.tsx` |

---

## Chunk 1: 测试先行 + 实现变更

### Task 1: 写失败测试

**Files:**
- Create: `app/src/components/__tests__/SearchBar.safe-area.test.tsx`

- [ ] **Step 1: 创建测试文件**

在 `app/src/components/__tests__/` 目录下新建 `SearchBar.safe-area.test.tsx`，内容如下：

```tsx
import React from 'react';
import renderer from 'react-test-renderer';
import { SearchBar } from '../SearchBar';

// Mock useSafeAreaInsets，模拟 Android 状态栏高度 28dp
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 28, bottom: 0, left: 0, right: 0 }),
}));

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  return Reanimated;
});

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

describe('SearchBar 安全区适配', () => {
  it('容器的 paddingTop 应等于 insets.top（28dp）', () => {
    const tree = renderer.create(<SearchBar />).toJSON() as any;
    // 最外层 View 即容器
    const containerStyle = Array.isArray(tree.props.style)
      ? Object.assign({}, ...tree.props.style)
      : tree.props.style;
    expect(containerStyle.paddingTop).toBe(28);
  });

  it('容器的 paddingTop 不应是硬编码的 60', () => {
    const tree = renderer.create(<SearchBar />).toJSON() as any;
    const containerStyle = Array.isArray(tree.props.style)
      ? Object.assign({}, ...tree.props.style)
      : tree.props.style;
    expect(containerStyle.paddingTop).not.toBe(60);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd app && npx jest src/components/__tests__/SearchBar.safe-area.test.tsx --no-coverage
```

预期输出：测试失败，`paddingTop` 为 `60` 而非 `28`。

---

### Task 2: 实现变更

**Files:**
- Modify: `app/src/components/SearchBar.tsx`

- [ ] **Step 3: 添加 import**

在 `SearchBar.tsx` 顶部的 import 区块末尾添加：

```ts
import { useSafeAreaInsets } from 'react-native-safe-area-context';
```

- [ ] **Step 4: 调用 hook**

在 `SearchBar` 函数体内，紧接 `useEffect` 副作用块之后（即 `const animatedStyle = useAnimatedStyle(...)` 之前）添加：

```ts
const insets = useSafeAreaInsets();
```

- [ ] **Step 5: 替换容器 paddingTop**

将渲染中的容器 View：

```tsx
<View style={styles.container}>
```

改为：

```tsx
<View style={[styles.container, { paddingTop: insets.top }]}>
```

- [ ] **Step 6: 移除 StyleSheet 中的硬编码值**

在 `styles.container` 的 `StyleSheet.create` 定义中，移除 `paddingTop: 60` 这一行（其余属性保持不变）：

```ts
container: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  paddingHorizontal: 16,
  paddingVertical: 12,
  // paddingTop: 60  ← 删除此行
  backgroundColor: '#FAF8F5',
},
```

---

### Task 3: 验证测试通过并提交

- [ ] **Step 7: 运行测试，确认通过**

```bash
cd app && npx jest src/components/__tests__/SearchBar.safe-area.test.tsx --no-coverage
```

预期输出：2 个测试全部 PASS。

- [ ] **Step 8: 运行全量测试，确认无回归**

```bash
cd app && npx jest --no-coverage
```

预期输出：所有测试通过，无新增失败。

- [ ] **Step 9: 提交**

```bash
git add app/src/components/SearchBar.tsx app/src/components/__tests__/SearchBar.safe-area.test.tsx
git commit -m "fix: use useSafeAreaInsets for SearchBar paddingTop"
```
