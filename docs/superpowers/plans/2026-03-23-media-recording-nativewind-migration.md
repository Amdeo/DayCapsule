# 媒体查看与录音链路 NativeWind 第七批迁移 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变媒体查看、图片网格、录音和波形逻辑的前提下，把 `WaveformAnimation`、`PhotoGrid`、`VoiceRecorder`、`ImageViewer` 迁到 `NativeWind`，并继续收紧样式守卫 allowlist。

**Architecture:** 本轮按“最小波形组件 -> 已有测试的图片网格 -> 状态机重的录音弹层 -> 手势重的图片查看器”四个层次分块迁移。每块都先写失败测试，再做最小实现，迁完立刻从 allowlist 中移除对应文件，最后统一跑 lint、typecheck 和全量测试并回填文档状态。

**Tech Stack:** React Native, NativeWind 4, Tailwind CSS, Jest, Testing Library, React Native Reanimated, React Native Gesture Handler

**Spec:** `docs/superpowers/specs/2026-03-23-media-recording-nativewind-migration-design.md`

---

## 变更记录

- 2026-03-23：基于已批准 spec 创建第七批实现计划，范围固定为 `WaveformAnimation`、`PhotoGrid`、`VoiceRecorder`、`ImageViewer`。
- 2026-03-23：当前会话未显式授权使用子代理 review，本轮 plan review 先采用本地结构化 review，并在文档中留痕。
- 2026-03-23：已完成本地结构化 review，未发现阻塞执行的问题。

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `app/src/components/__tests__/WaveformAnimation.test.tsx` | 锁定波形组件根壳层和 bar 数量 |
| `app/src/components/__tests__/VoiceRecorder.test.tsx` | 锁定录音弹层根壳层与待机/录音完成状态切换 |

### Modified Files

| File | Change |
|------|--------|
| `app/eslint/style-guard-allowlist.js` | 每完成一个迁移块就移除对应 legacy 文件，继续收紧守卫 |
| `app/src/components/WaveformAnimation.tsx` | 把波形组件壳层迁到 `NativeWind`，保留 reanimated 动画逻辑 |
| `app/src/components/PhotoGrid.tsx` | 把图片网格静态壳层迁到 `NativeWind`，保留尺寸计算与 overflow 逻辑 |
| `app/src/components/VoiceRecorder.tsx` | 把录音弹层静态壳层迁到 `NativeWind`，保留录音状态机和按钮流程 |
| `app/src/components/ImageViewer.tsx` | 把图片查看器静态壳层与 action sheet 迁到 `NativeWind`，保留 gesture / animated 逻辑 |
| `app/src/components/__tests__/PhotoGrid.test.tsx` | 扩充图片网格根壳层断言 |
| `app/src/components/__tests__/ImageViewer.shared-element.test.tsx` | 扩充查看器根壳层与 action sheet 断言 |
| `docs/superpowers/specs/2026-03-23-media-recording-nativewind-migration-design.md` | 实现完成后回填状态、验证结果与偏差说明 |
| `docs/superpowers/plans/2026-03-23-media-recording-nativewind-migration.md` | 执行过程中勾选任务、记录验证结果和收口状态 |

## 执行约束

- 四个组件的展示形态必须保持原样：
  - `WaveformAnimation` 仍显示 50 根动态 bar
  - `PhotoGrid` 仍保留单图 / 多图 / overflow 规则
  - `VoiceRecorder` 仍保留待机 / 录音中 / 完成三种状态
  - `ImageViewer` 仍保留全屏查看与 action sheet
- 不能改现有依赖关系：
  - `VoiceRecorder` 继续使用 `WaveformAnimation`
  - 图片入口继续通过 `PhotoGrid` 打开 `ImageViewer`
- 只迁静态视觉表达；animated style、gesture、动态尺寸、动态颜色允许继续使用 `style`
- 不重做视觉结构；优先复用现有 token，确实不够时才用最小 arbitrary classes 维持现状
- 每完成一个组件迁移，就从 allowlist 中删除对应文件，避免“迁完仍长期放行”

## Chunk 1: WaveformAnimation 波形组件迁移

### Task 1: 新增 `WaveformAnimation` 测试并迁移波形组件

**Files:**
- Modify: `app/eslint/style-guard-allowlist.js`
- Create: `app/src/components/__tests__/WaveformAnimation.test.tsx`
- Modify: `app/src/components/WaveformAnimation.tsx`

- [ ] **Step 1: 先写失败测试，锁定根壳层和 bar 数量**

新增 `app/src/components/__tests__/WaveformAnimation.test.tsx`，至少包含：

```ts
it('renders waveform shell with expected bar count', () => {
  const screen = render(<WaveformAnimation isRecording={false} />);

  expect(screen.getByTestId('waveform-animation-root')).toBeTruthy();
  expect(screen.getAllByTestId(/waveform-bar-/)).toHaveLength(50);
});
```

- [ ] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/WaveformAnimation.test.tsx`

Expected: FAIL，原因应包含 `waveform-animation-root` 或 bar testID 尚不存在。

- [ ] **Step 3: 最小实现 `WaveformAnimation` NativeWind 迁移**

在 `app/src/components/WaveformAnimation.tsx`：

- 删除 `StyleSheet.create`
- 保留：
  - `WaveBar`
  - `useSharedValue`
  - `withRepeat` / `withTiming`
  - `backgroundColor: color`
- 把静态壳层迁到 `className`：
  - container
  - bar
- 补以下 `testID`：
  - `waveform-animation-root`
  - `waveform-bar-${index}`

- [ ] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/WaveformAnimation.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/WaveformAnimation.tsx`

然后跑：

Run: `cd app && npm run lint -- src/components/WaveformAnimation.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/src/components/WaveformAnimation.tsx app/src/components/__tests__/WaveformAnimation.test.tsx
git commit -m "refactor: migrate waveform animation to nativewind"
```

## Chunk 2: PhotoGrid 图片网格迁移

### Task 2: 扩充 `PhotoGrid` 测试并迁移图片网格

**Files:**
- Modify: `app/eslint/style-guard-allowlist.js`
- Modify: `app/src/components/PhotoGrid.tsx`
- Modify: `app/src/components/__tests__/PhotoGrid.test.tsx`

- [ ] **Step 1: 先写失败测试，锁定根壳层**

在 `app/src/components/__tests__/PhotoGrid.test.tsx` 增加至少一条断言：

```ts
it('2 photos: renders grid root shell', () => {
  render(
    <PhotoGrid photos={[makePhoto(0), makePhoto(1)]} maxPhotoHeight={280} photoImageRadius={radius} />
  );

  expect(screen.getByTestId('photo-grid-root')).toBeTruthy();
});
```

保留现有单图、多图、overflow 与尺寸计算测试。

- [ ] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/PhotoGrid.test.tsx`

Expected: FAIL，原因应包含 `photo-grid-root` 尚不存在。

- [ ] **Step 3: 最小实现 `PhotoGrid` NativeWind 迁移**

在 `app/src/components/PhotoGrid.tsx`：

- 删除 `StyleSheet.create`
- 保留：
  - `GAP`
  - `MAX_DISPLAY`
  - 单图 / 多图逻辑
  - `cellSize`
  - `photoImageRadius`
- 把静态壳层迁到 `className`：
  - grid
  - overflowCell / overflowText
  - singleMissing
  - gridCellMissing
- 继续保留：
  - `style={{ width: cellSize, height: cellSize }}`
  - `height: maxPhotoHeight`
- 补以下 `testID`：
  - `photo-grid-root`

- [ ] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/PhotoGrid.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/PhotoGrid.tsx`

然后跑：

Run: `cd app && npm run lint -- src/components/PhotoGrid.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/src/components/PhotoGrid.tsx app/src/components/__tests__/PhotoGrid.test.tsx
git commit -m "refactor: migrate photo grid to nativewind"
```

## Chunk 3: VoiceRecorder 录音弹层迁移

### Task 3: 新增 `VoiceRecorder` 测试并迁移录音弹层

**Files:**
- Modify: `app/eslint/style-guard-allowlist.js`
- Create: `app/src/components/__tests__/VoiceRecorder.test.tsx`
- Modify: `app/src/components/VoiceRecorder.tsx`

- [ ] **Step 1: 先写失败测试，锁定根壳层和状态切换**

新增 `app/src/components/__tests__/VoiceRecorder.test.tsx`，至少包含：

```ts
it('renders idle shell when visible', () => {
  const screen = render(
    <VoiceRecorder visible onSave={jest.fn()} onCancel={jest.fn()} />
  );

  expect(screen.getByTestId('voice-recorder-root')).toBeTruthy();
  expect(screen.getByTestId('voice-recorder-idle')).toBeTruthy();
  expect(screen.getByText('开始录音')).toBeTruthy();
});
```

再补一条从开始录音到停止后显示完成态的断言。

- [ ] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/VoiceRecorder.test.tsx`

Expected: FAIL，原因应包含 `voice-recorder-root` / `voice-recorder-idle` 等 testID 尚不存在。

- [ ] **Step 3: 最小实现 `VoiceRecorder` NativeWind 迁移**

在 `app/src/components/VoiceRecorder.tsx`：

- 删除 `StyleSheet.create`
- 保留：
  - 所有 `handle*` 回调
  - 计时器
  - `ActivityIndicator`
  - `Alert`
  - `WaveformAnimation`
- 把静态壳层迁到 `className`：
  - overlay / backdrop / sheet / handle
  - header / typeBadge / typeBadgeText / closeBtn
  - body
  - idleContainer / micCircle / idleTitle / idleSubtitle
  - recordingContainer / timer / waveformBox / recordingHint
  - doneContainer / doneCircle / doneTitle / doneDuration
  - actions / primaryBtn / stopBtn / secondaryBtn / text / disabled
- 继续保留：
  - Modal 遮罩层
  - 阴影或 `opacity` 若必须用 style
  - `View style={{ height: 24 }}`
- 补以下 `testID`：
  - `voice-recorder-root`
  - `voice-recorder-idle`
  - `voice-recorder-recording`
  - `voice-recorder-done`

- [ ] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/VoiceRecorder.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/VoiceRecorder.tsx`

然后跑：

Run: `cd app && npm run lint -- src/components/VoiceRecorder.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/src/components/VoiceRecorder.tsx app/src/components/__tests__/VoiceRecorder.test.tsx
git commit -m "refactor: migrate voice recorder to nativewind"
```

## Chunk 4: ImageViewer 图片查看器迁移

### Task 4: 扩充 `ImageViewer` 测试并迁移图片查看器

**Files:**
- Modify: `app/eslint/style-guard-allowlist.js`
- Modify: `app/src/components/ImageViewer.tsx`
- Modify: `app/src/components/__tests__/ImageViewer.shared-element.test.tsx`

- [ ] **Step 1: 先写失败测试，锁定根壳层和 action sheet**

在 `app/src/components/__tests__/ImageViewer.shared-element.test.tsx` 增加至少一条断言：

```ts
it('renders image viewer shell when visible', () => {
  const tree = renderer.create(
    <ImageViewer visible imageUri="file:///image.jpg" onClose={jest.fn()} />
  );

  expect(() => tree.root.findByProps({ testID: 'image-viewer-root' })).not.toThrow();
});
```

并补一条在 action sheet 显示时能找到 `image-viewer-action-sheet` 的断言，可通过 mock/初始状态控制，不要求真实触发长按 gesture。

- [ ] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/ImageViewer.shared-element.test.tsx`

Expected: FAIL，原因应包含 `image-viewer-root` 或 `image-viewer-action-sheet` 尚不存在。

- [ ] **Step 3: 最小实现 `ImageViewer` NativeWind 迁移**

在 `app/src/components/ImageViewer.tsx`：

- 删除 `StyleSheet.create`
- 保留：
  - 所有 gestures
  - `useSharedValue` / `useAnimatedStyle`
  - `heroAnimatedStyle`
  - `handleSaveToAlbum`
  - `handleShare`
- 把静态壳层迁到 `className`：
  - backdrop
  - imageContainer
  - actionSheetOverlay
  - actionSheet
  - actionSheetHandle
  - actionSheetItem
  - actionSheetDivider
  - actionSheetItemText
  - actionSheetGap
  - actionSheetCancelText
- 继续保留：
  - animated `style`
  - `SCREEN_WIDTH` / `SCREEN_HEIGHT`
  - 绝对定位全屏相关 style
- 补以下 `testID`：
  - `image-viewer-root`
  - `image-viewer-action-sheet`

- [ ] **Step 4: 跑测试并移出 allowlist**

Run: `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/ImageViewer.shared-element.test.tsx`

Expected: PASS

再从 `app/eslint/style-guard-allowlist.js` 删除：

- `src/components/ImageViewer.tsx`

然后跑：

Run: `cd app && npm run lint -- src/components/ImageViewer.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/eslint/style-guard-allowlist.js app/src/components/ImageViewer.tsx app/src/components/__tests__/ImageViewer.shared-element.test.tsx
git commit -m "refactor: migrate image viewer to nativewind"
```

## Chunk 5: 文档回填与全量验收

### Task 5: 回填 spec / plan 状态并完成全量验证

**Files:**
- Modify: `docs/superpowers/specs/2026-03-23-media-recording-nativewind-migration-design.md`
- Modify: `docs/superpowers/plans/2026-03-23-media-recording-nativewind-migration.md`

- [ ] **Step 1: 先跑第七批相关测试集合**

Run:

```bash
cd app && npx jest --run-in-band --runTestsByPath \
  src/components/__tests__/WaveformAnimation.test.tsx \
  src/components/__tests__/PhotoGrid.test.tsx \
  src/components/__tests__/VoiceRecorder.test.tsx \
  src/components/__tests__/ImageViewer.shared-element.test.tsx
```

Expected: PASS

- [ ] **Step 2: 跑静态检查与全量测试**

Run: `cd app && npm run lint`
Expected: PASS

Run: `cd app && npm run typecheck`
Expected: PASS

Run: `cd app && npm test -- --runInBand`
Expected: PASS

- [ ] **Step 3: 回填文档执行结果**

在 spec 与 plan 中补：

- 当前状态
- 实际新增 / 修改文件
- 验证命令及结果
- 若实现与计划有轻微偏差，记录原因

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-03-23-media-recording-nativewind-migration-design.md docs/superpowers/plans/2026-03-23-media-recording-nativewind-migration.md
git commit -m "docs: backfill media recording nativewind migration"
```

## 本地结构化 Review 结论

- 已按 chunk 检查媒体链路边界、测试现状、allowlist 收口点和最终验收命令
- `WaveformAnimation`、`PhotoGrid`、`VoiceRecorder`、`ImageViewer` 都可以独立完成“失败测试 -> 最小实现 -> lint 收口 -> 提交”的闭环
- 未发现阻塞执行的问题
