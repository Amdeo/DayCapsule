# Image Viewer Lifecycle Regression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `ImageViewer` 补齐页面级生命周期回归，锁住不可见空渲染、可见时当前图片展示、图片源切换更新和关闭后收回。

**Architecture:** 继续保留现有 `actions / action-sheet / navigation` 测试职责不变，新建一个独立 lifecycle 测试文件承接 viewer 壳层的打开、更新、关闭闭环。优先通过现有 `image-viewer-root` 和 React Test Renderer 的组件树断言完成测试，只有在无法稳定读取当前图片 URI 时才对 `ImageViewerScene` 做最小可测性增强。

**Tech Stack:** React Native, Jest, React Test Renderer, React Native Testing Library, TypeScript

---

## 验证结果

- 2026-03-27：已运行
  `cd app && npm test -- --runTestsByPath src/components/__tests__/image/image-viewer.lifecycle.test.tsx src/components/__tests__/image/image-viewer.navigation.test.tsx src/components/__tests__/image/image-viewer.actions.test.ts src/components/__tests__/image/image-viewer.action-sheet.test.tsx src/components/__tests__/ImageViewer.shared-element.test.tsx --runInBand`
  - 结果：PASS（5 个 suite，16 个测试全部通过）
- 2026-03-27：已运行 `cd app && npm test -- --runInBand`
  - 结果：PASS（111 个 suite，740 个测试全部通过）
  - 备注：Jest 结束后仍提示既有 open handles 警告，但测试结果本身全绿

## Scope Note

本 plan 只实现以下 4 条 `ImageViewer` 生命周期回归：

- `IVL-01` `visible=false` 时不渲染 viewer shell
- `IVL-02` `visible=true` 时渲染 viewer shell 和当前图片
- `IVL-03` 图片源切换时跟随新图更新
- `IVL-04` 关闭后 viewer shell 消失

以下内容不在本 plan 中实现：

- `EntryCard -> ImageViewer` 入口链路
- 缺图 / 坏图 / 修复提示
- 保存 / 分享 / 权限动作细节
- 手势缩放、拖拽关闭、共享元素动画细节
- Android 真机返回键之外的系统级流程

## File Structure

- Create: `app/src/components/__tests__/image/image-viewer.lifecycle.test.tsx`
  Purpose: 承载 `ImageViewer` 壳层的打开、更新、关闭生命周期回归，不与现有 `navigation` 或 `actions` 文件混合。
- Modify: `app/src/components/image-viewer/ImageViewerScene.tsx`
  Purpose: 仅在测试无法稳定读取当前图片 URI 时，补一个最小可测性锚点；如果现有组件树已足够断言，则保持不改。
- Modify: `app/src/components/__tests__/image/image-viewer.navigation.test.tsx`
  Purpose: 只有当共享 mock 或 testID 调整影响旧 navigation 断言时才做最小同步；如果不受影响则不改。

## Task 1: Add The First Failing Lifecycle Regression

**Files:**
- Create: `app/src/components/__tests__/image/image-viewer.lifecycle.test.tsx`
- Test: `app/src/components/__tests__/image/image-viewer.lifecycle.test.tsx`

- [ ] **Step 1: Write the failing hidden-state lifecycle test**

在 `app/src/components/__tests__/image/image-viewer.lifecycle.test.tsx` 先新增 `IVL-01`：

```tsx
it('does not render the viewer shell when visible is false', () => {
  const tree = renderer.create(
    <ImageViewer
      visible={false}
      imageUri="file:///hidden-image.jpg"
      onClose={jest.fn()}
    />
  );

  expect(() => tree.root.findByProps({ testID: 'image-viewer-root' })).toThrow();
});
```

沿用现有 viewer 测试里的最小 mock：

- `react-native-safe-area-context`
- `react-native-gesture-handler`
- `react-native-reanimated`
- `@/src/utils/logger`

不要在第一步就 mock `useImageViewerController`，先让测试直连当前真实装配。

- [ ] **Step 2: Run the new test to verify it fails**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/image/image-viewer.lifecycle.test.tsx --runInBand`

Expected: FAIL，原因应是当前 `Modal` 在测试树里仍保留 `image-viewer-root`，或测试环境下现有断言方式还不能区分 hidden/open 状态。

- [ ] **Step 3: Implement the minimal lifecycle assertion strategy**

先优先尝试不改生产代码，仅调整测试断言方式：

```tsx
expect(tree.root.findAllByProps({ testID: 'image-viewer-root' })).toHaveLength(0);
```

如果 `Modal` mock 行为导致 `visible=false` 仍把子树渲染出来，再用与现有 `navigation` 文件一致的方式读取 `Modal` props，并断言：

```tsx
const modal = tree.root.findByType(Modal);
expect(modal.props.visible).toBe(false);
```

只有当这两种方式都无法稳定表达“viewer shell 不可见”时，才考虑补最小测试辅助；不要在这一步动 `ImageViewerScene` 结构。

- [ ] **Step 4: Re-run the test to verify it passes**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/image/image-viewer.lifecycle.test.tsx --runInBand`

Expected: PASS（仅 `IVL-01` 通过）

- [ ] **Step 5: Commit the lifecycle test baseline**

```bash
git add app/src/components/__tests__/image/image-viewer.lifecycle.test.tsx
git commit -m "test(image): add image viewer lifecycle baseline"
```

## Task 2: Add Viewer Open And Image-Update Regressions

**Files:**
- Modify: `app/src/components/__tests__/image/image-viewer.lifecycle.test.tsx`
- Modify: `app/src/components/image-viewer/ImageViewerScene.tsx`
- Test: `app/src/components/__tests__/image/image-viewer.lifecycle.test.tsx`

- [ ] **Step 1: Write the failing visible-state and image-update regressions**

在同一测试文件继续新增：

```tsx
it('renders the viewer shell and current image when visible is true', () => {
  const tree = renderer.create(
    <ImageViewer
      visible
      imageUri="file:///image-a.jpg"
      onClose={jest.fn()}
    />
  );

  expect(tree.root.findByProps({ testID: 'image-viewer-root' })).toBeTruthy();
  expect(tree.root.findByProps({ testID: 'image-viewer-image' }).props.source).toEqual({
    uri: 'file:///image-a.jpg',
  });
});

it('updates the rendered image when imageUri changes on rerender', () => {
  const tree = renderer.create(
    <ImageViewer
      visible
      imageUri="file:///image-a.jpg"
      onClose={jest.fn()}
    />
  );

  tree.update(
    <ImageViewer
      visible
      imageUri="file:///image-b.jpg"
      onClose={jest.fn()}
    />
  );

  expect(tree.root.findByProps({ testID: 'image-viewer-image' }).props.source).toEqual({
    uri: 'file:///image-b.jpg',
  });
});
```

- [ ] **Step 2: Run the lifecycle suite to verify the new cases fail**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/image/image-viewer.lifecycle.test.tsx --runInBand`

Expected: FAIL，优先因为当前主图节点没有稳定 `testID="image-viewer-image"`，或当前断言方式无法稳定定位主图。

- [ ] **Step 3: Add the smallest image-node test anchor only if needed**

如果通过 `findByType(Image)` 或 `findAllByType(Image)` 已能稳定定位主图，则不要修改生产代码。

只有在无法稳定区分主图与其他节点时，才在 `app/src/components/image-viewer/ImageViewerScene.tsx` 的主图片节点补：

```tsx
<Image
  testID="image-viewer-image"
  source={{ uri: imageUri }}
  style={[styles.image, { width: screenWidth, height: screenHeight }]}
  resizeMode="contain"
  onError={handleImageError}
/>
```

不要给 opening/closing hero image 额外补多个 testID，避免测试锚点膨胀。

- [ ] **Step 4: Re-run the lifecycle suite to verify open/update behavior passes**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/image/image-viewer.lifecycle.test.tsx --runInBand`

Expected: PASS（`IVL-01` 到 `IVL-03` 全部通过）

- [ ] **Step 5: Commit the visible/update regressions**

```bash
git add app/src/components/__tests__/image/image-viewer.lifecycle.test.tsx app/src/components/image-viewer/ImageViewerScene.tsx
git commit -m "test(image): add image viewer lifecycle regressions"
```

## Task 3: Add Close-And-Unmount Regression

**Files:**
- Modify: `app/src/components/__tests__/image/image-viewer.lifecycle.test.tsx`
- Modify: `app/src/components/__tests__/image/image-viewer.navigation.test.tsx`
- Test: `app/src/components/__tests__/image/image-viewer.lifecycle.test.tsx`

- [ ] **Step 1: Write the failing close/unmount regression**

新增 `IVL-04`：

```tsx
it('removes the viewer shell after close is requested and visible becomes false', () => {
  const onClose = jest.fn();
  const tree = renderer.create(
    <ImageViewer
      visible
      imageUri="file:///image-a.jpg"
      onClose={onClose}
    />
  );

  const modal = tree.root.findByType(Modal);
  act(() => {
    modal.props.onRequestClose();
  });

  expect(onClose).toHaveBeenCalledTimes(1);

  act(() => {
    tree.update(
      <ImageViewer
        visible={false}
        imageUri="file:///image-a.jpg"
        onClose={onClose}
      />
    );
  });

  expect(tree.root.findAllByProps({ testID: 'image-viewer-root' })).toHaveLength(0);
});
```

- [ ] **Step 2: Run the lifecycle suite to verify the close regression fails or exposes a modal-visibility gap**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/image/image-viewer.lifecycle.test.tsx --runInBand`

Expected: FAIL，原因应是 hidden-state 断言策略还不够稳，或 close 后树上仍能找到 viewer shell。

- [ ] **Step 3: Make the smallest lifecycle assertion adjustment**

如果 `Modal` 在测试环境下即使 `visible=false` 也保留子树，不要改生产代码，改测试为“双重断言”：

```tsx
const modal = tree.root.findByType(Modal);
expect(modal.props.visible).toBe(false);
expect(tree.root.findAllByProps({ testID: 'image-viewer-root' })).toHaveLength(0);
```

如果旧的 `image-viewer.navigation.test.tsx` 因共享 mock 或 testID 调整受影响，只做最小同步，不新增新行为断言。

- [ ] **Step 4: Re-run the lifecycle suite to verify all four regressions pass**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/image/image-viewer.lifecycle.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit the close regression**

```bash
git add app/src/components/__tests__/image/image-viewer.lifecycle.test.tsx app/src/components/__tests__/image/image-viewer.navigation.test.tsx
git commit -m "test(image): verify image viewer close lifecycle"
```

## Task 4: Run Focused And Full Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-03-27-image-viewer-lifecycle-regression.md`

- [ ] **Step 1: Run the focused image-viewer verification command**

Run:

```bash
cd app && npm test -- --runTestsByPath \
  src/components/__tests__/image/image-viewer.lifecycle.test.tsx \
  src/components/__tests__/image/image-viewer.navigation.test.tsx \
  src/components/__tests__/image/image-viewer.actions.test.ts \
  src/components/__tests__/image/image-viewer.action-sheet.test.tsx \
  src/components/__tests__/ImageViewer.shared-element.test.tsx \
  --runInBand
```

Expected: PASS

- [ ] **Step 2: Run the front-end full Jest suite**

Run: `cd app && npm test -- --runInBand`

Expected: PASS

- [ ] **Step 3: Inspect git status and record actual outputs**

Run: `git status --short`

Expected: 只剩本轮相关改动；如果工作区干净，则记录为 clean。

- [ ] **Step 4: Update this plan with verification notes**

在本文档顶部补：

```md
## 验证结果

- 2026-03-27：已运行 ...
  - 结果：PASS
```

- [ ] **Step 5: Commit the plan/status update**

```bash
git add docs/superpowers/plans/2026-03-27-image-viewer-lifecycle-regression.md
git commit -m "docs(plan): record image viewer lifecycle verification"
```
