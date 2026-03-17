# 照片卡片 Edge-to-Edge 显示 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 照片卡片图片铺满卡片完整宽度，无左右边距，根据是否有说明文字动态调整圆角。

**Architecture:** 仅修改 `EntryCard.tsx`，无数据模型变更。新增 `getPhotoCardWidth()` 函数计算图片实际宽度；在组件函数体内计算 `hasPhotoFooter` 布尔值，派生动态圆角样式；用 `photoTagsContainer` 样式变体处理照片卡片的 tags 内边距；`contentPhoto` 覆盖 `content` 的 `padding` 和 `gap` 为零。

**Tech Stack:** React Native StyleSheet, Reanimated（已有），TypeScript

**Spec:** `docs/superpowers/specs/2026-03-18-photo-edge-to-edge-design.md`

---

### Task 1: 新增工具函数与修改 `calculateImageHeight`

**Files:**
- Modify: `app/src/components/EntryCard.tsx:47-54`（函数区）

- [ ] **Step 1: 在 `getCardContentWidth` 之后新增 `getPhotoCardWidth`**

定位当前约第 47 行：
```ts
const getCardContentWidth = () => SCREEN_WIDTH - 40; // 20px padding on each side
```
在其后插入：
```ts
// 照片卡片图片宽度：屏幕宽 - EntryMarker 左右 padding(64+24)
const getPhotoCardWidth = () => SCREEN_WIDTH - 88;
```

- [ ] **Step 2: 修改 `calculateImageHeight` 签名，新增可选 `contentWidth` 参数**

将当前约第 50-54 行：
```ts
const calculateImageHeight = (aspectRatio: number | undefined, maxHeight: number): number => {
  if (!aspectRatio || aspectRatio <= 0) return Math.min(200, maxHeight);
  const calculatedHeight = getCardContentWidth() / aspectRatio;
  return Math.min(calculatedHeight, maxHeight);
};
```
替换为：
```ts
const calculateImageHeight = (
  aspectRatio: number | undefined,
  maxHeight: number,
  contentWidth: number = getCardContentWidth()
): number => {
  if (!aspectRatio || aspectRatio <= 0) return Math.min(200, maxHeight);
  return Math.min(contentWidth / aspectRatio, maxHeight);
};
```

- [ ] **Step 3: 运行测试，确认无回归**

```bash
cd app && npx jest --testPathPattern="EntryCard" --passWithNoTests
```
预期：所有测试通过（函数签名向后兼容，现有调用无变化）

---

### Task 2: 组件内添加动态圆角逻辑与更新图片渲染

**Files:**
- Modify: `app/src/components/EntryCard.tsx`（组件函数体 + 图片渲染区）
- Test: `app/src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: 写失败测试 — 验证纯图片时图片有四角圆角**

在 `app/src/components/__tests__/EntryCard.test.tsx` 的现有 `describe` 块末尾追加：

```ts
describe('EntryCard photo edge-to-edge', () => {
  const photoEntry: Entry = {
    id: 'photo-1',
    type: 'photo',
    content: '',
    timestamp: Date.now(),
    syncStatus: 'synced',
    media: {
      uri: 'file://photo.jpg',
      mimeType: 'image/jpeg',
      size: 1000,
      metadata: { aspectRatio: 1.5, createdAt: Date.now(), modifiedAt: Date.now() },
    },
  };

  const photoWithCaption: Entry = {
    ...photoEntry,
    id: 'photo-2',
    content: '今天拍的风景',
  };

  it('纯图片卡片：图片四角圆角为 10', () => {
    render(<EntryCard entry={photoEntry} onDelete={jest.fn()} />);
    const img = screen.getByTestId('photo-image');
    expect(img.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ borderRadius: 10 }),
      ])
    );
    // 底部不应被覆盖为 0
    const flatStyle = StyleSheet.flatten(img.props.style);
    expect(flatStyle.borderBottomLeftRadius).not.toBe(0);
    expect(flatStyle.borderBottomRightRadius).not.toBe(0);
  });

  it('有 caption 的图片卡片：图片底部圆角为 0', () => {
    render(<EntryCard entry={photoWithCaption} onDelete={jest.fn()} />);
    const img = screen.getByTestId('photo-image');
    const flatStyle = StyleSheet.flatten(img.props.style);
    expect(flatStyle.borderBottomLeftRadius).toBe(0);
    expect(flatStyle.borderBottomRightRadius).toBe(0);
  });
});
```

在文件顶部 import 区加：
```ts
import { StyleSheet } from 'react-native';
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd app && npx jest --testPathPattern="EntryCard.test" -t "photo edge-to-edge" --passWithNoTests
```
预期：FAIL（逻辑尚未实现）

- [ ] **Step 3: 在 `EntryCard` 函数体内添加 `hasPhotoFooter` 和 `photoImageRadius`**

在组件函数体内，所有 getter 函数（`getCardBgColor`、`getCardPressedColor`）定义完毕之后（约第 270 行，即 `getCardPressedColor` 结束的 `}` 之后）插入：

```ts
// 照片卡片是否有底部内容（决定图片圆角）
const hasPhotoFooter = entry.type === 'photo'
  ? !!(entry.content || (entry.tags && entry.tags.length > 0))
  : false;

const photoImageRadius = hasPhotoFooter
  ? { borderRadius: 10, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }
  : { borderRadius: 10 };
```

- [ ] **Step 4: 更新图片渲染 — 正常图片**

找到约第 481 行的 `<Image` 组件，当前：
```tsx
<Image
  ref={thumbnailRef}
  source={{ uri: PhotoService.resolvePhotoUri(entry.media?.thumbnail || entry.media.uri) }}
  style={[
    styles.photoImage,
    { height: calculateImageHeight(entry.media?.metadata?.aspectRatio, maxPhotoHeight) }
  ]}
  resizeMode="contain"
  testID="photo-image"
  onError={() => setPhotoError(true)}
/>
```
改为：
```tsx
<Image
  ref={thumbnailRef}
  source={{ uri: PhotoService.resolvePhotoUri(entry.media?.thumbnail || entry.media.uri) }}
  style={[
    styles.photoImage,
    photoImageRadius,
    { height: calculateImageHeight(entry.media?.metadata?.aspectRatio, maxPhotoHeight, getPhotoCardWidth()) }
  ]}
  resizeMode="contain"
  testID="photo-image"
  onError={() => setPhotoError(true)}
/>
```

- [ ] **Step 5: 更新图片渲染 — 图片丢失状态**

找到约第 476 行的 `photoMissing` View，当前：
```tsx
<View style={[styles.photoImage, styles.photoMissing]}>
```
改为：
```tsx
<View style={[styles.photoImage, styles.photoMissing, photoImageRadius]}>
```

- [ ] **Step 6: 运行测试，确认通过**

```bash
cd app && npx jest --testPathPattern="EntryCard.test" -t "photo edge-to-edge" --passWithNoTests
```
预期：PASS

- [ ] **Step 7: 提交**

```bash
git add app/src/components/EntryCard.tsx app/src/components/__tests__/EntryCard.test.tsx
git commit -m "feat: add dynamic photo image border radius based on footer content"
```

---

### Task 3: 更新样式 — contentPhoto、photoImage、photoCaption、photoTagsContainer

**Files:**
- Modify: `app/src/components/EntryCard.tsx`（styles 区，约第 653 行之后）
- Test: `app/src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: 写失败测试 — 验证 tags 在照片卡片中使用正确容器**

在 Task 2 新增的 `describe('EntryCard photo edge-to-edge')` 中追加：

```ts
it('有 tags 的图片卡片：tags 容器有水平内边距 14', () => {
  const photoWithTags: Entry = {
    ...photoEntry,
    id: 'photo-3',
    content: '',
    tags: ['风景', '旅行'],
  };
  render(<EntryCard entry={photoWithTags} onDelete={jest.fn()} />);
  // 验证 photo-tags-container 存在且有 paddingHorizontal: 14
  const tagsContainer = screen.getByTestId('photo-tags-container');
  const containerStyle = StyleSheet.flatten(tagsContainer.props.style);
  expect(containerStyle.paddingHorizontal).toBe(14);
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd app && npx jest --testPathPattern="EntryCard.test" -t "tags" --passWithNoTests
```
预期：FAIL 或 PASS（若当前 tagsContainer 已有 padding 则可能通过，以实际为准）

- [ ] **Step 3: 更新 `contentPhoto` 样式**

找到约第 671 行：
```ts
contentPhoto: {
  borderRadius: 12,
},
```
替换为：
```ts
contentPhoto: {
  padding: 0,
  gap: 0,
},
```

- [ ] **Step 4: 更新 `photoImage` 样式**

找到约第 683 行：
```ts
photoImage: {
  width: '100%',
  borderRadius: 12,
  backgroundColor: '#ECE7E0',
},
```
替换为：
```ts
photoImage: {
  width: '100%',
  backgroundColor: '#ECE7E0',
},
```

- [ ] **Step 5: 更新 `photoCaption` 样式**

找到约第 698 行：
```ts
photoCaption: {
  fontSize: 14,
  lineHeight: 20,
  color: '#525252',
  marginTop: 8,
},
```
替换为：
```ts
photoCaption: {
  paddingHorizontal: 14,
  paddingTop: 8,
  paddingBottom: 8,
  fontSize: 14,
  lineHeight: 20,
  color: '#525252',
},
```

- [ ] **Step 6: 新增 `photoTagsContainer` 样式**

在 `tagsContainer` 样式定义之后插入：

```ts
photoTagsContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 6,
  paddingHorizontal: 14,
  paddingTop: 0,
  paddingBottom: 12,
},
```

- [ ] **Step 7: 更新 tags 渲染，对照片类型使用 `photoTagsContainer`**

找到 tags 渲染的 View（约第 587 行），当前：
```tsx
<View style={styles.tagsContainer}>
```
改为（同时加上 `testID` 供测试定位）：
```tsx
<View
  testID={entry.type === 'photo' ? 'photo-tags-container' : undefined}
  style={entry.type === 'photo' ? styles.photoTagsContainer : styles.tagsContainer}
>
```

- [ ] **Step 8: 运行全量测试**

```bash
cd app && npx jest --testPathPattern="EntryCard" --passWithNoTests
```
预期：全部通过（包括新增测试）

- [ ] **Step 9: 提交**

```bash
git add app/src/components/EntryCard.tsx app/src/components/__tests__/EntryCard.test.tsx
git commit -m "feat: photo card edge-to-edge layout with smart border radius"
```
