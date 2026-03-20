# 多图片卡片点击打开对应图片 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复多图片卡片点击行为，保证用户点击第几张图片，就在查看器中打开第几张图片。

**Architecture:** 保持 `ImageViewer` 为单图查看器，不扩展其接口；在 `EntryCard` 内新增当前选中图片索引状态，并把普通时间线 `PhotoGrid` 与日历视图里的所有图片点击入口统一收敛到 `handleImagePress(index)`。测试集中放在 `EntryCard.test.tsx`，验证普通视图与日历视图都能把正确 URI 传给 `ImageViewer`。

**Tech Stack:** React Native 0.81.5、TypeScript 5.9、Jest、@testing-library/react-native

**Spec:** `docs/superpowers/specs/2026-03-20-multi-photo-viewer-index-design.md`

---

## Chunk 1: EntryCard 行为修复

### Task 1: 先写普通多图卡片的失败测试

**Files:**
- Modify: `app/src/components/__tests__/EntryCard.test.tsx`
- Modify: `app/src/components/EntryCard.tsx`（后续实现）

- [ ] **Step 1: 更新 `ImageViewer` mock，使其暴露收到的 `imageUri`**

在 `app/src/components/__tests__/EntryCard.test.tsx` 顶部的 `jest.mock('../ImageViewer', ...)` 中，把 mock 改成能渲染 `imageUri`，例如：

```tsx
jest.mock('../ImageViewer', () => {
  const { Text, View } = require('react-native');
  return {
    ImageViewer: ({ visible, imageUri }: { visible: boolean; imageUri?: string }) =>
      visible ? (
        <View testID="image-viewer">
          <Text testID="image-viewer-uri">{imageUri}</Text>
        </View>
      ) : null,
  };
});
```

- [ ] **Step 2: 添加普通多图卡片点击第二张图的测试**

在 `EntryCard photo edge-to-edge` 或新的 describe 块中加入一条测试，构造 3 张图的 `photo` entry：

```ts
it('普通多图卡片点击第二张图时应传第二张图片给 ImageViewer', () => {
  const entry = {
    ...photoEntry,
    media: [
      { uri: 'file://photo-1.jpg', mimeType: 'image/jpeg', size: 1 },
      { uri: 'file://photo-2.jpg', mimeType: 'image/jpeg', size: 1 },
      { uri: 'file://photo-3.jpg', mimeType: 'image/jpeg', size: 1 },
    ],
  };

  const { getByTestId } = renderEntryCard(entry);
  fireEvent.press(getByTestId('photo-cell-1'));

  expect(getByTestId('image-viewer-uri').props.children).toBe('file://photo-2.jpg');
});
```

- [ ] **Step 3: 运行单测，确认当前失败**

```bash
cd app && npx jest --runInBand src/components/__tests__/EntryCard.test.tsx -t "普通多图卡片点击第二张图时应传第二张图片给 ImageViewer"
```

期望：FAIL，实际收到 `file://photo-1.jpg` 或等价的第一张图 URI。

---

### Task 2: 在 `EntryCard` 中实现普通视图按索引打开

**Files:**
- Modify: `app/src/components/EntryCard.tsx`
- Test: `app/src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: 在 `showImageViewer` state 后新增选中索引 state**

在 `EntryCard` 内找到：

```ts
const [showImageViewer, setShowImageViewer] = useState(false);
```

其后新增：

```ts
const [selectedImageIndex, setSelectedImageIndex] = useState(0);
```

- [ ] **Step 2: 添加统一图片点击入口**

在 `handleCardPress` 前新增：

```ts
const handleImagePress = (index: number) => {
  logger.log('图片被点击，打开图片查看器，index:', index);
  setSelectedImageIndex(index);
  setShowImageViewer(true);
};
```

- [ ] **Step 3: 普通时间线 `PhotoGrid` 改为透传索引**

找到当前代码：

```tsx
<PhotoGrid
  photos={entry.media}
  maxPhotoHeight={resolvedPhotoHeight}
  photoImageRadius={photoImageRadius}
  onPhotoPress={() => setShowImageViewer(true)}
/>;
```

替换为：

```tsx
<PhotoGrid
  photos={entry.media}
  maxPhotoHeight={resolvedPhotoHeight}
  photoImageRadius={photoImageRadius}
  onPhotoPress={(index) => handleImagePress(index)}
/>;
```

- [ ] **Step 4: `ImageViewer` 改为按索引取图并带回退**

找到当前代码：

```tsx
<ImageViewer
  visible={showImageViewer}
  imageUri={entry.media[0].uri}
  onClose={() => {
    setShowImageViewer(false);
  }}
/>
```

替换为：

```tsx
<ImageViewer
  visible={showImageViewer}
  imageUri={entry.media[selectedImageIndex]?.uri ?? entry.media[0].uri}
  onClose={() => {
    setShowImageViewer(false);
  }}
/>
```

- [ ] **Step 5: 重新运行刚才那条测试，确认通过**

```bash
cd app && npx jest --runInBand src/components/__tests__/EntryCard.test.tsx -t "普通多图卡片点击第二张图时应传第二张图片给 ImageViewer"
```

期望：PASS。

- [ ] **Step 6: 提交这一块**

```bash
git add app/src/components/EntryCard.tsx app/src/components/__tests__/EntryCard.test.tsx
git commit -m "fix: open selected photo in timeline viewer"
```

---

## Chunk 2: 日历视图点击索引修复

### Task 3: 先写日历多图点击的失败测试

**Files:**
- Modify: `app/src/components/__tests__/EntryCard.test.tsx`
- Modify: `app/src/components/EntryCard.tsx`（后续实现）

- [ ] **Step 1: 添加日历多图点击第三张图的测试**

在 `EntryCard calendar variant` describe 中添加一条测试，使用 4 张图的 `photo` entry：

```ts
it('calendar 多图卡片点击第三张图时应传第三张图片给 ImageViewer', () => {
  const entry = {
    ...photoEntry,
    media: [
      { uri: 'file://calendar-1.jpg', mimeType: 'image/jpeg', size: 1 },
      { uri: 'file://calendar-2.jpg', mimeType: 'image/jpeg', size: 1 },
      { uri: 'file://calendar-3.jpg', mimeType: 'image/jpeg', size: 1 },
      { uri: 'file://calendar-4.jpg', mimeType: 'image/jpeg', size: 1 },
    ],
  };

  const { getByTestId } = render(
    <EntryCard entry={entry} onDelete={jest.fn()} variant="calendar" />
  );

  fireEvent.press(getByTestId(`calendar-photo-secondary-cell-2-${entry.id}`));
  expect(getByTestId('image-viewer-uri').props.children).toBe('file://calendar-3.jpg');
});
```

说明：如果当前组件没有可稳定命中的 testID，下一步实现时补上最小必要的 testID，不要顺手扩大测试暴露面。

- [ ] **Step 2: 运行该条测试，确认当前失败**

```bash
cd app && npx jest --runInBand src/components/__tests__/EntryCard.test.tsx -t "calendar 多图卡片点击第三张图时应传第三张图片给 ImageViewer"
```

期望：FAIL，原因可能是找不到稳定节点，或最终仍传入第一张图 URI。

---

### Task 4: 实现日历视图按索引打开

**Files:**
- Modify: `app/src/components/EntryCard.tsx`
- Test: `app/src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: 日历单图点击改为使用统一入口**

找到：

```tsx
<TouchableOpacity activeOpacity={0.92} onPress={() => setShowImageViewer(true)}>
```

替换为：

```tsx
<TouchableOpacity activeOpacity={0.92} onPress={() => handleImagePress(0)}>
```

- [ ] **Step 2: 日历多图三个点击入口分别传正确索引**

将以下 3 处点击从统一打开改为显式索引：

```tsx
onPress={() => handleImagePress(0)}
onPress={() => handleImagePress(1)}
onPress={() => handleImagePress(2)}
```

对应：

- 主图
- 第二张图
- 第三张图

- [ ] **Step 3: 为日历多图可点击节点补最小必要 testID**

在不影响生产行为的前提下，为测试目标增加稳定 testID，例如：

```tsx
testID={`calendar-photo-primary-${entry.id}`}
testID={`calendar-photo-secondary-cell-1-${entry.id}`}
testID={`calendar-photo-secondary-cell-2-${entry.id}`}
```

只加在 `TouchableOpacity` 上，不新增无关测试节点。

- [ ] **Step 4: 重新运行日历测试，确认通过**

```bash
cd app && npx jest --runInBand src/components/__tests__/EntryCard.test.tsx -t "calendar 多图卡片点击第三张图时应传第三张图片给 ImageViewer"
```

期望：PASS。

- [ ] **Step 5: 提交这一块**

```bash
git add app/src/components/EntryCard.tsx app/src/components/__tests__/EntryCard.test.tsx
git commit -m "fix: open selected photo in calendar viewer"
```

---

## Chunk 3: 回归验证与文档收口

### Task 5: 运行回归并更新 plan/spec 状态

**Files:**
- Modify: `docs/superpowers/plans/2026-03-20-multi-photo-viewer-index.md`
- Modify: `docs/superpowers/specs/2026-03-20-multi-photo-viewer-index-design.md`
- Verify: `app/src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: 运行 `EntryCard` 相关测试**

```bash
cd app && npx jest --runInBand src/components/__tests__/EntryCard.test.tsx
```

期望：PASS。

- [ ] **Step 2: 运行类型检查**

```bash
cd app && npx tsc --noEmit
```

期望：无新增 TypeScript 错误。

- [ ] **Step 3: 在本 plan 中补齐实际验证结果**

把本文件对应步骤后的执行结果补齐，至少记录：

- 测试命令
- 是否通过
- 如有基线噪音，注明“无新增失败”

- [ ] **Step 4: 更新 spec 状态为 `已实现`**

修改：

`docs/superpowers/specs/2026-03-20-multi-photo-viewer-index-design.md`

将：

```md
**状态：** 已批准
```

改为：

```md
**状态：** 已实现
```

并在评审记录后追加一节“实现结果”或“验证结果”。

- [ ] **Step 5: 提交收尾文档**

```bash
git add docs/superpowers/plans/2026-03-20-multi-photo-viewer-index.md docs/superpowers/specs/2026-03-20-multi-photo-viewer-index-design.md
git commit -m "docs: close multi photo viewer index task"
```
