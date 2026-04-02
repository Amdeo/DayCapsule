# 双图卡片主辅拼贴 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将双图卡片从 `2 列等宽正方形` 改为固定高度的横向主辅拼贴，在随机比例下提升稳定性和观感，同时保持图片查看器的原始顺序心智。

**Architecture:** 保持 `EntryCardDefaultContent -> PhotoGrid` 的调用链不变，只在 `PhotoGrid` 内部为 `2 张图` 增加专门分支。排序和点击映射集中放在 `usePhotoGridController`，渲染和失败态集中放在 `PhotoGrid` / `PhotoGridCells` / `PhotoGrid.styles`，其余 1 张、3 张和 4 张以上逻辑保持不变。

**Tech Stack:** React Native, TypeScript, Expo, Jest, @testing-library/react-native

**Spec:** `docs/superpowers/specs/2026-03-25-two-photo-layout-design.md`

---

## Chunk 1: 锁定双图规则与点击映射

### Task 1: 先写双图布局与排序的失败测试

**Files:**
- Modify: `app/src/components/__tests__/PhotoGrid.test.tsx`

- [ ] **Step 1: 扩展测试数据工厂，支持 aspectRatio**

把测试里的 `makePhoto` 改成可传入比例元数据，避免后面为了交换逻辑临时重写 fixture：

```ts
const makePhoto = (i: number, aspectRatio?: number): MediaInfo => ({
  uri: `file://photo${i}.jpg`,
  mimeType: 'image/jpeg',
  size: 1000,
  metadata:
    aspectRatio !== undefined
      ? {
          aspectRatio,
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        }
      : undefined,
});
```

- [ ] **Step 2: 把现有“双图 grid”测试改写成“主辅拼贴”测试**

把当前的 `it('2 photos: renders photo-grid with 2 cells', ...)` 改写为新的失败测试，要求未来实现出现新的双图 testID：

```ts
it('2 photos: renders two-photo collage instead of square grid', () => {
  render(
    <PhotoGrid
      photos={[makePhoto(0, 1), makePhoto(1, 1.8)]}
      maxPhotoHeight={280}
      photoImageRadius={radius}
    />
  );

  expect(screen.getByTestId('photo-collage-root')).toBeTruthy();
  expect(screen.getByTestId('photo-primary-cell')).toBeTruthy();
  expect(screen.getByTestId('photo-secondary-cell')).toBeTruthy();
  expect(screen.queryByTestId('photo-grid')).toBeNull();
});
```

- [ ] **Step 3: 新增“默认第一张主图”测试**

通过 `photo-primary-image` 的 `source.uri` 断言第一张默认进入主图位：

```ts
it('keeps the first photo as primary by default', () => {
  render(
    <PhotoGrid
      photos={[makePhoto(0, 1), makePhoto(1, 1.1)]}
      maxPhotoHeight={280}
      photoImageRadius={radius}
    />
  );

  expect(screen.getByTestId('photo-primary-image').props.source).toEqual({
    uri: 'file://photo0.jpg',
  });
  expect(screen.getByTestId('photo-secondary-image').props.source).toEqual({
    uri: 'file://photo1.jpg',
  });
});
```

- [ ] **Step 4: 新增“第二张明显更适合主图时交换”测试**

用极端比例构造明确差异，避免脆弱边界：

```ts
it('promotes the second photo to primary when it fits the primary slot much better', () => {
  render(
    <PhotoGrid
      photos={[makePhoto(0, 2.8), makePhoto(1, 0.8)]}
      maxPhotoHeight={280}
      photoImageRadius={radius}
    />
  );

  expect(screen.getByTestId('photo-primary-image').props.source).toEqual({
    uri: 'file://photo1.jpg',
  });
  expect(screen.getByTestId('photo-secondary-image').props.source).toEqual({
    uri: 'file://photo0.jpg',
  });
});
```

- [ ] **Step 5: 新增“缺少 aspectRatio 时不交换”测试**

```ts
it('does not reorder two photos when aspect ratio metadata is missing', () => {
  render(
    <PhotoGrid
      photos={[makePhoto(0), makePhoto(1, 0.8)]}
      maxPhotoHeight={280}
      photoImageRadius={radius}
    />
  );

  expect(screen.getByTestId('photo-primary-image').props.source).toEqual({
    uri: 'file://photo0.jpg',
  });
});
```

- [ ] **Step 6: 运行测试并确认当前失败**

Run:

```bash
cd app && pnpm test -- src/components/__tests__/PhotoGrid.test.tsx --runInBand
```

Expected:

- 新增的 `photo-collage-root` / `photo-primary-image` 等测试报错

- [ ] **Step 7: 提交失败测试**

```bash
git add app/src/components/__tests__/PhotoGrid.test.tsx
git commit -m "test: define two-photo collage behavior"
```

### Task 2: 在 controller 中落排序规则和点击索引映射

**Files:**
- Modify: `app/src/components/photo-grid/photoGridConfig.ts`
- Modify: `app/src/components/photo-grid/usePhotoGridController.ts`
- Test: `app/src/components/__tests__/PhotoGrid.test.tsx`

- [ ] **Step 1: 在 `photoGridConfig.ts` 增加双图常量**

新增保守的主辅比例和交换阈值：

```ts
export const PHOTO_GRID_TWO_PHOTO_PRIMARY_RATIO = 0.64;
export const PHOTO_GRID_TWO_PHOTO_SWAP_THRESHOLD = 0.18;
```

保留现有：

```ts
export const PHOTO_GRID_GAP = 3;
export const PHOTO_GRID_MAX_DISPLAY = 8;
```

- [ ] **Step 2: 调整 `usePhotoGridController` 签名，接收 `maxPhotoHeight`**

把：

```ts
export function usePhotoGridController(photos: MediaInfo[]) {
```

改为：

```ts
export function usePhotoGridController(photos: MediaInfo[], maxPhotoHeight: number) {
```

因为双图交换规则需要用 `primaryWidth / maxPhotoHeight` 计算主图位目标比例。

- [ ] **Step 3: 在 controller 中新增双图判定与尺寸计算**

在 hook 里增加：

```ts
const shouldRenderTwoPhotoCollage = photos.length === 2;

const primaryWidth =
  containerWidth > 0
    ? (containerWidth - PHOTO_GRID_GAP) * PHOTO_GRID_TWO_PHOTO_PRIMARY_RATIO
    : 0;
const secondaryWidth =
  containerWidth > 0 ? containerWidth - PHOTO_GRID_GAP - primaryWidth : 0;
```

- [ ] **Step 4: 实现保守的双图交换函数**

直接在 `usePhotoGridController.ts` 内添加一个纯函数，避免逻辑散在 JSX 中：

```ts
const getTwoPhotoDisplayOrder = (
  photos: MediaInfo[],
  primaryTargetAspect: number
): [number, number] => {
  if (photos.length !== 2) return [0, 1];

  const firstAspect = photos[0]?.metadata?.aspectRatio;
  const secondAspect = photos[1]?.metadata?.aspectRatio;

  if (!firstAspect || !secondAspect || primaryTargetAspect <= 0) {
    return [0, 1];
  }

  const firstLoss = Math.abs(firstAspect - primaryTargetAspect);
  const secondLoss = Math.abs(secondAspect - primaryTargetAspect);

  if (firstLoss - secondLoss > PHOTO_GRID_TWO_PHOTO_SWAP_THRESHOLD) {
    return [1, 0];
  }

  return [0, 1];
};
```

- [ ] **Step 5: 在 hook 返回双图专用字段和点击映射**

在 return 中新增：

```ts
const twoPhotoDisplayOrder = shouldRenderTwoPhotoCollage
  ? getTwoPhotoDisplayOrder(photos, primaryWidth / maxPhotoHeight)
  : [0, 1];

const primaryPhotoIndex = twoPhotoDisplayOrder[0];
const secondaryPhotoIndex = twoPhotoDisplayOrder[1];

return {
  cellSize,
  displayPhotos,
  handleLayout,
  overflow,
  primaryPhoto: photos[primaryPhotoIndex],
  primaryPhotoIndex,
  primaryWidth,
  secondaryPhoto: photos[secondaryPhotoIndex],
  secondaryPhotoIndex,
  secondaryWidth,
  shouldRenderSinglePhoto,
  shouldRenderTwoPhotoCollage,
};
```

- [ ] **Step 6: 重新运行 `PhotoGrid` 测试**

Run:

```bash
cd app && pnpm test -- src/components/__tests__/PhotoGrid.test.tsx --runInBand
```

Expected:

- 排序相关测试从“找不到字段/行为不符”推进到只剩渲染层失败

- [ ] **Step 7: 提交 controller 逻辑**

```bash
git add app/src/components/photo-grid/photoGridConfig.ts app/src/components/photo-grid/usePhotoGridController.ts
git commit -m "feat: add two-photo ordering logic"
```

---

## Chunk 2: 落主辅拼贴渲染与失败态

### Task 3: 先补双图点击映射和失败态的失败测试

**Files:**
- Modify: `app/src/components/__tests__/PhotoGrid.test.tsx`

- [ ] **Step 1: 在测试 import 中补上 `fireEvent`**

把：

```ts
import { render, screen } from '@testing-library/react-native';
```

改为：

```ts
import { fireEvent, render, screen } from '@testing-library/react-native';
```

后续点击映射和错误态都依赖这个 import。

- [ ] **Step 2: 新增“交换后点击仍回到原始索引”测试**

```ts
it('maps taps back to original indexes after swapping display order', () => {
  const onPhotoPress = jest.fn();

  render(
    <PhotoGrid
      photos={[makePhoto(0, 2.8), makePhoto(1, 0.8)]}
      maxPhotoHeight={280}
      photoImageRadius={radius}
      onPhotoPress={onPhotoPress}
    />
  );

  fireEvent.press(screen.getByTestId('photo-primary-cell'));
  fireEvent.press(screen.getByTestId('photo-secondary-cell'));

  expect(onPhotoPress).toHaveBeenNthCalledWith(1, 1);
  expect(onPhotoPress).toHaveBeenNthCalledWith(2, 0);
});
```

- [ ] **Step 3: 新增“主图失败仍保持主图位占位”测试**

```ts
it('keeps the primary slot when the primary image fails to load', () => {
  render(
    <PhotoGrid
      photos={[makePhoto(0, 1), makePhoto(1, 1.2)]}
      maxPhotoHeight={280}
      photoImageRadius={radius}
    />
  );

  fireEvent(screen.getByTestId('photo-primary-image'), 'error');

  expect(screen.getByTestId('photo-primary-missing')).toBeTruthy();
  expect(screen.getByTestId('photo-secondary-cell')).toBeTruthy();
});
```

- [ ] **Step 4: 新增“辅图失败仍保持辅图位占位”测试**

```ts
it('keeps the secondary slot when the secondary image fails to load', () => {
  render(
    <PhotoGrid
      photos={[makePhoto(0, 1), makePhoto(1, 1.2)]}
      maxPhotoHeight={280}
      photoImageRadius={radius}
    />
  );

  fireEvent(screen.getByTestId('photo-secondary-image'), 'error');

  expect(screen.getByTestId('photo-secondary-missing')).toBeTruthy();
  expect(screen.getByTestId('photo-primary-cell')).toBeTruthy();
});
```

- [ ] **Step 5: 新增“双图首帧尺寸估算”测试**

将现有“首帧渲染时应使用窗口宽度估算网格尺寸”测试改成双图拼贴版，断言主图宽度按比例计算：

```ts
it('uses window width to estimate two-photo collage widths on first render', () => {
  const windowWidth = Dimensions.get('window').width;

  render(
    <PhotoGrid
      photos={[makePhoto(0, 1), makePhoto(1, 1.2)]}
      maxPhotoHeight={280}
      photoImageRadius={radius}
    />
  );

  const expectedPrimaryWidth = (windowWidth - 3) * 0.64;

  expect(screen.getByTestId('photo-primary-image').props.style).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        width: expectedPrimaryWidth,
        height: 280,
      }),
    ])
  );
});
```

- [ ] **Step 6: 运行测试并确认这些新场景失败**

Run:

```bash
cd app && pnpm test -- src/components/__tests__/PhotoGrid.test.tsx --runInBand
```

Expected:

- 新增的点击映射、失败态和双图尺寸断言失败

- [ ] **Step 7: 提交第二批失败测试**

```bash
git add app/src/components/__tests__/PhotoGrid.test.tsx
git commit -m "test: cover two-photo collage interactions"
```

### Task 4: 实现双图拼贴渲染

**Files:**
- Modify: `app/src/components/PhotoGrid.tsx`
- Modify: `app/src/components/photo-grid/PhotoGridCells.tsx`
- Modify: `app/src/components/photo-grid/PhotoGrid.styles.ts`
- Test: `app/src/components/__tests__/PhotoGrid.test.tsx`

- [ ] **Step 1: 在 `PhotoGridCells.tsx` 新增双图专用 cell 组件**

保留现有 `SinglePhoto` 和 `GridCell`，新增一个复用性足够的双图 cell：

```ts
interface TwoPhotoCellProps {
  testID: string;
  imageTestID: string;
  missingTestID: string;
  photo: MediaInfo;
  width: number;
  height: number;
  imageRadiusStyle: PhotoImageRadiusStyle;
  onPress: () => void;
}
```

渲染要求：

- 正常态：`TouchableOpacity` 包 `Image`
- 错误态：保留同尺寸 `View`
- `Image` 和占位都使用同一套尺寸与圆角
- testID 必须稳定：`photo-primary-cell` / `photo-primary-image` / `photo-primary-missing` 及 secondary 对应版本

- [ ] **Step 2: 在 `PhotoGrid.styles.ts` 添加双图样式**

新增样式即可，不要改动现有 grid 的语义：

```ts
twoPhotoRow: {
  flexDirection: 'row',
  gap: PHOTO_GRID_GAP,
},
twoPhotoMissing: {
  backgroundColor: '#ECE7E0',
},
```

如果需要分别描述主图 / 辅图包裹层，也在这里补充，但不要把尺寸写进样式表，尺寸继续走内联计算。

- [ ] **Step 3: 在 `PhotoGrid.tsx` 为 2 张图增加分支**

把：

```tsx
const { ... } = usePhotoGridController(photos);
```

改为：

```tsx
const {
  cellSize,
  displayPhotos,
  handleLayout,
  overflow,
  primaryPhoto,
  primaryPhotoIndex,
  primaryWidth,
  secondaryPhoto,
  secondaryPhotoIndex,
  secondaryWidth,
  shouldRenderSinglePhoto,
  shouldRenderTwoPhotoCollage,
} = usePhotoGridController(photos, maxPhotoHeight);
```

然后在单图分支之后、普通 grid 分支之前插入：

```tsx
if (shouldRenderTwoPhotoCollage && primaryPhoto && secondaryPhoto) {
  return (
    <View testID="photo-collage-root" style={styles.twoPhotoRow} onLayout={handleLayout}>
      <TwoPhotoCell
        testID="photo-primary-cell"
        imageTestID="photo-primary-image"
        missingTestID="photo-primary-missing"
        photo={primaryPhoto}
        width={primaryWidth}
        height={maxPhotoHeight}
        imageRadiusStyle={{
          ...photoImageRadius,
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
        }}
        onPress={() => onPhotoPress?.(primaryPhotoIndex)}
      />
      <TwoPhotoCell
        testID="photo-secondary-cell"
        imageTestID="photo-secondary-image"
        missingTestID="photo-secondary-missing"
        photo={secondaryPhoto}
        width={secondaryWidth}
        height={maxPhotoHeight}
        imageRadiusStyle={{
          ...photoImageRadius,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
        }}
        onPress={() => onPhotoPress?.(secondaryPhotoIndex)}
      />
    </View>
  );
}
```

关键要求：

- 双图分支不再渲染 `photo-grid`
- 双图布局固定高度等于 `maxPhotoHeight`
- 左右两格共享外观但尺寸不同

- [ ] **Step 4: 运行测试，直到 `PhotoGrid.test.tsx` 全绿**

Run:

```bash
cd app && pnpm test -- src/components/__tests__/PhotoGrid.test.tsx --runInBand
```

Expected:

- `PhotoGrid.test.tsx` 全部通过

- [ ] **Step 5: 提交双图渲染实现**

```bash
git add app/src/components/PhotoGrid.tsx app/src/components/photo-grid/PhotoGridCells.tsx app/src/components/photo-grid/PhotoGrid.styles.ts
git commit -m "feat: render two-photo collage cards"
```

---

## Chunk 3: 回归验证与收尾

### Task 5: 验证旧数量分支无回归并整理最终交付

**Files:**
- Modify: `app/src/components/__tests__/PhotoGrid.test.tsx`（如需微调断言文本）
- Verify: `app/src/components/PhotoGrid.tsx`
- Verify: `app/src/components/photo-grid/usePhotoGridController.ts`
- Verify: `app/src/components/photo-grid/PhotoGridCells.tsx`
- Verify: `app/src/components/photo-grid/PhotoGrid.styles.ts`

- [ ] **Step 1: 复查 `PhotoGrid.test.tsx` 的旧场景**

确保以下旧场景仍然存在且通过：

- `1 photo`
- `3 photos`
- `4 photos`
- `9 photos`

不要在实现双图时误伤这些断言；必要时仅调整 testID 或文案，不改变行为要求。

- [ ] **Step 2: 运行目标测试文件**

Run:

```bash
cd app && pnpm test -- src/components/__tests__/PhotoGrid.test.tsx --runInBand
```

Expected:

- 通过
- 输出包含新增双图用例和既有多图用例

- [ ] **Step 3: 运行类型检查**

Run:

```bash
cd app && pnpm run typecheck
```

Expected:

- 通过，无 TypeScript 错误

- [ ] **Step 4: 查看最终 diff，确认只涉及双图布局**

Run:

```bash
git diff --stat "$(git merge-base HEAD main)"..HEAD
```

Expected:

- 只涉及 `PhotoGrid` 及其测试、配置、样式文件
- 没有 `EntryCard`、数据库或查看器的意外改动

- [ ] **Step 5: 提交最终整理（如需要）**

如果前面提交后仅有测试微调或注释修正，再补最后一次提交：

```bash
git add app/src/components/__tests__/PhotoGrid.test.tsx app/src/components/PhotoGrid.tsx app/src/components/photo-grid/usePhotoGridController.ts app/src/components/photo-grid/PhotoGridCells.tsx app/src/components/photo-grid/PhotoGrid.styles.ts app/src/components/photo-grid/photoGridConfig.ts
git commit -m "test: verify two-photo collage regressions"
```

- [ ] **Step 6: 完成后记录验证结果**

在执行反馈中明确写出：

- `PhotoGrid.test.tsx` 是否全通过
- `pnpm run typecheck` 是否通过
- 双图是否保持原始查看顺序映射
