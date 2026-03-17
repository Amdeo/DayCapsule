# 照片卡片裁剪固定高度显示 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 照片卡片图片改为固定高度居中裁剪显示，取代当前按宽高比动态计算的全图展示。

**Architecture:** 仅修改 `EntryCard.tsx`：移除不再需要的 `calculateImageHeight` 和 `getPhotoCardWidth` 函数，将 Image 高度改为直接使用 `maxPhotoHeight`，`resizeMode` 改为 `"cover"`，同步更新 `photoMissing` 占位 View 和 `photoImage` 样式。

**Tech Stack:** React Native StyleSheet, TypeScript，现有 `PHOTO_HEIGHT_VALUES` 设置系统

**Spec:** `docs/superpowers/specs/2026-03-18-photo-crop-fixed-height-design.md`

---

### Task 1: 裁剪固定高度渲染

**Files:**
- Modify: `app/src/components/EntryCard.tsx`
- Test: `app/src/components/__tests__/EntryCard.test.tsx`

#### 背景

`EntryCard.tsx` 中关键位置：
- 第 47 行：`getCardContentWidth`（保留，其他地方可能使用）
- 第 50–61 行：`getPhotoCardWidth` 和 `calculateImageHeight`（本次删除）
- 第 89–90 行：`const maxPhotoHeight = PHOTO_HEIGHT_VALUES[photoHeight]`（已有，直接使用）
- 第 491 行：`photoMissing` View（需加 `testID="photo-missing"` 和 `{ height: maxPhotoHeight }`）
- 第 496–507 行：`<Image>` 渲染（需改 style 和 resizeMode）
- 第 703–706 行：`photoImage` 样式（需加 `overflow: 'hidden'`）
- 第 707–712 行：`photoMissing` 样式（`minHeight: 200` 保留不动，因为有了内联高度会覆盖）

测试文件触发 `photoError` 的模式（来自 `EntryCard.missing-media.test.tsx`）：
```ts
fireEvent(getByTestId('photo-image'), 'error');
// 之后 photoMissing View 出现
```

- [ ] **Step 1: 写失败测试**

在 `app/src/components/__tests__/EntryCard.test.tsx` 的 `describe('EntryCard photo edge-to-edge')` 块末尾追加：

```ts
describe('照片固定高度裁剪显示', () => {
  it('图片使用 resizeMode cover', () => {
    render(<EntryCard entry={photoEntry} onDelete={jest.fn()} />);
    const img = screen.getByTestId('photo-image');
    expect(img.props.resizeMode).toBe('cover');
  });

  it('图片高度等于档位值（default=280）', () => {
    render(<EntryCard entry={photoEntry} onDelete={jest.fn()} />);
    const img = screen.getByTestId('photo-image');
    const flatStyle = StyleSheet.flatten(img.props.style);
    expect(flatStyle.height).toBe(280);
  });

  it('compact 档位图片高度为 200', () => {
    // settingsStore mock 返回 compact，需要局部 mock
    jest.spyOn(require('@/src/store/settingsStore'), 'useSettingsStore').mockImplementation(
      (selector: (s: any) => any) => selector({ photoHeight: 'compact' })
    );
    render(<EntryCard entry={photoEntry} onDelete={jest.fn()} />);
    const img = screen.getByTestId('photo-image');
    const flatStyle = StyleSheet.flatten(img.props.style);
    expect(flatStyle.height).toBe(200);
    jest.restoreAllMocks();
  });

  it('large 档位图片高度为 400', () => {
    jest.spyOn(require('@/src/store/settingsStore'), 'useSettingsStore').mockImplementation(
      (selector: (s: any) => any) => selector({ photoHeight: 'large' })
    );
    render(<EntryCard entry={photoEntry} onDelete={jest.fn()} />);
    const img = screen.getByTestId('photo-image');
    const flatStyle = StyleSheet.flatten(img.props.style);
    expect(flatStyle.height).toBe(400);
    jest.restoreAllMocks();
  });

  it('photoMissing 高度等于档位值（default=280）', () => {
    // 注：先拿 photo-image（此时 photoError=false，Image 存在），
    // 再触发 error 使组件切换到 photoMissing 状态
    const { getByTestId } = render(<EntryCard entry={photoEntry} onDelete={jest.fn()} />);
    fireEvent(getByTestId('photo-image'), 'error');
    const missingView = getByTestId('photo-missing');
    const flatStyle = StyleSheet.flatten(missingView.props.style);
    expect(flatStyle.height).toBe(280);
  });
});
```

在文件顶部 import 区确认已有（之前已加）：
```ts
import { StyleSheet } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd app && npx jest --testPathPattern="EntryCard.test" -t "固定高度裁剪" --passWithNoTests
```
预期：FAIL（`resizeMode` 仍为 `"contain"`，高度由宽高比计算，`photo-missing` testID 不存在）

- [ ] **Step 3: 确认 `getPhotoCardWidth` 无其他引用，然后删除**

先确认这两个函数只在图片渲染处使用：
```bash
cd app && grep -n "getPhotoCardWidth\|calculateImageHeight" src/components/EntryCard.tsx
```
预期：只出现函数定义和一处调用（Image 的 style 处），无其他引用。

然后在 `app/src/components/EntryCard.tsx` 中，删除约第 49–61 行的两个函数：
```ts
// 照片卡片图片宽度：屏幕宽 - EntryMarker 左右 padding(64+24)
const getPhotoCardWidth = () => SCREEN_WIDTH - 88;

// 计算图片高度，保持宽高比，最大高度由设置决定
const calculateImageHeight = (
  aspectRatio: number | undefined,
  maxHeight: number,
  contentWidth: number = getCardContentWidth()
): number => {
  if (!aspectRatio || aspectRatio <= 0) return Math.min(200, maxHeight);
  return Math.min(contentWidth / aspectRatio, maxHeight);
};
```

- [ ] **Step 4: 更新 `photoMissing` View — 加 testID 和固定高度**

找到约第 491 行：
```tsx
<View style={[styles.photoImage, styles.photoMissing, photoImageRadius]}>
```
改为：
```tsx
<View testID="photo-missing" style={[styles.photoImage, styles.photoMissing, photoImageRadius, { height: maxPhotoHeight }]}>
```

- [ ] **Step 5: 更新 `<Image>` 渲染 — 固定高度 + cover**

找到约第 499–507 行的 `<Image>` 组件，当前：
```tsx
style={[
  styles.photoImage,
  photoImageRadius,
  { height: calculateImageHeight(entry.media?.metadata?.aspectRatio, maxPhotoHeight, getPhotoCardWidth()) }
]}
resizeMode="contain"
```
改为：
```tsx
style={[
  styles.photoImage,
  photoImageRadius,
  { height: maxPhotoHeight }
]}
resizeMode="cover"
```

- [ ] **Step 6: 更新 `photoImage` 样式 — 加 `overflow: 'hidden'`**

找到约第 703–706 行：
```ts
photoImage: {
  width: '100%',
  backgroundColor: '#ECE7E0',
},
```
改为：
```ts
photoImage: {
  width: '100%',
  backgroundColor: '#ECE7E0',
  overflow: 'hidden',
},
```

- [ ] **Step 7: 运行新增测试，确认通过**

```bash
cd app && npx jest --testPathPattern="EntryCard.test" -t "固定高度裁剪" --passWithNoTests
```
预期：5 个测试全部 PASS

- [ ] **Step 8: 运行全量测试，确认无回归**

```bash
cd app && npx jest --testPathPattern="EntryCard" --passWithNoTests
```
预期：全部通过

- [ ] **Step 9: 提交**

```bash
git add app/src/components/EntryCard.tsx app/src/components/__tests__/EntryCard.test.tsx
git commit -m "feat: photo card fixed height crop display with resizeMode cover"
```
