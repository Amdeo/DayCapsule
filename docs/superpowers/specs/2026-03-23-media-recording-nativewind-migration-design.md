# 媒体查看与录音链路 NativeWind 第七批迁移设计

## 状态

- 当前状态：已完成实现并通过验证
- 设计确认日期：2026-03-23
- 实现完成日期：2026-03-23

## 评审记录

- 2026-03-23：已完成第六批“备份与统计链路”迁移，当前 worktree 继续在 `nativewind-style-guardrails` 上推进下一批。
- 2026-03-23：已检查剩余 allowlist，确认 `WaveformAnimation`、`PhotoGrid`、`VoiceRecorder`、`ImageViewer` 构成一条边界清晰的媒体查看与录音链路。
- 2026-03-23：已确认本轮目标仍然是把现有样式迁到 `NativeWind`，不借迁移之名改媒体手势、录音状态机或业务行为。
- 2026-03-23：用户已明确要求后续自动推进，不再逐项请示；本轮设计基于该授权直接落文并继续 planning。
- 2026-03-23：当前会话未显式授权使用子代理 review，本轮 spec review 继续采用本地结构化 review 留痕。
- 2026-03-23：`WaveformAnimation`、`PhotoGrid`、`VoiceRecorder`、`ImageViewer` 已全部迁到 `NativeWind`，并从 allowlist 中移除。
- 2026-03-23：第七批相关测试、全量 lint、typecheck 与全量测试均已通过。

## 背景

前六批迁移已经完成首页壳层、搜索编辑链路、详情操作链路、侧栏二级页共享壳层、设置与账号链路，以及备份与统计链路。

当前仍在 allowlist 中、且与媒体查看和录音直接相关的文件是：

- [WaveformAnimation.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/WaveformAnimation.tsx)
- [PhotoGrid.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/PhotoGrid.tsx)
- [VoiceRecorder.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/VoiceRecorder.tsx)
- [ImageViewer.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/ImageViewer.tsx)

它们形成的关系很明确：

- `VoiceRecorder` 依赖 `WaveformAnimation`
- `EntryCard` 等入口通过 `PhotoGrid` 展示多图
- 图片点击后进入 `ImageViewer`

因此把这四个文件作为一批处理，可以把“录音中波形、图片网格、全屏查看器、录音弹层”这一整段媒体体验一次性收口，而不把时间轴和导航壳层混进来。

## 目标

- 把 `WaveformAnimation`、`PhotoGrid`、`VoiceRecorder`、`ImageViewer` 的静态视觉样式迁到 `NativeWind`
- 保持图片网格布局、查看器手势、录音状态切换、波形动画和保存/分享逻辑不变
- 为缺失测试的媒体/录音组件补齐稳定的根壳层和关键状态测试
- 迁移完成后，把这 4 个文件从 [style-guard-allowlist.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/eslint/style-guard-allowlist.js) 中移除

## 非目标

- 不改 `ImageViewer` 的单击关闭、双击缩放、长按菜单、下滑关闭、捏合/平移逻辑
- 不改 `VoiceRecorder` 的开始、暂停、继续、停止、重录、保存、取消逻辑
- 不改 `PhotoGrid` 的单图、多图、overflow 展示规则和尺寸计算
- 不改 `WaveformAnimation` 的波形数量、动画驱动方式和颜色来源
- 不把本轮扩展到 `EntryCard`、`Timeline`、`BottomToolbar` 等上游入口

## 方案对比

### 方案 A：四个文件整批迁移

- 优点：媒体链路完整，录音和查看器的壳层风格可以一起收口；`WaveformAnimation` 和 `VoiceRecorder`、`PhotoGrid` 和 `ImageViewer` 的依赖关系天然适合一批处理
- 缺点：包含一个手势重的查看器和一个状态机重的录音弹层，执行时需要更严格的测试顺序

### 方案 B：只做 `WaveformAnimation`、`VoiceRecorder`

- 优点：范围更小
- 缺点：图片相关组件仍留在 allowlist，媒体体验会继续割裂

### 方案 C：只做 `PhotoGrid`、`ImageViewer`

- 优点：聚焦图片链路
- 缺点：录音弹层和波形组件仍未收口，不能真正完成媒体类组件迁移

推荐采用方案 A。

## 最终方案

### 1. 总体迁移策略

本轮继续沿用前六批的原则：

- 只迁静态样式表达，不改业务行为
- 能用 `className` 表达的静态壳层全部迁走
- 动画值、手势驱动位移、运行时宽高、动态颜色和共享元素相关绝对定位继续允许保留 `style`
- 不为迁移重做结构，只做最小测试锚点和样式收口

固定边界如下：

- `WaveformAnimation` 保留 `react-native-reanimated` 动画驱动逻辑
- `PhotoGrid` 保留单图/多图布局判断、`onLayout` 宽度计算、overflow 逻辑和图片缺失降级
- `VoiceRecorder` 保留录音状态机、`VoiceService` 调用、计时器和 `Alert`
- `ImageViewer` 保留所有 gesture、shared-value、shared-element、保存到相册和分享逻辑

### 2. `WaveformAnimation` 迁移设计

[WaveformAnimation.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/WaveformAnimation.tsx) 是本批最小文件，优先迁移。

迁移后它仍然保留：

- `WaveBar` 内部 `useSharedValue`
- `withRepeat` / `withTiming`
- `isRecording` 驱动动画状态

具体处理方式：

- 删除 `StyleSheet.create`
- 用 `className` 表达：
  - container
  - bar
- 保留：
  - `height.value`
  - `backgroundColor: color`
  - 固定宽度、圆角等若 NativeWind 不够顺手时使用最小动态 style

允许补的稳定测试锚点：

- `waveform-animation-root`

### 3. `PhotoGrid` 迁移设计

[PhotoGrid.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/PhotoGrid.tsx) 已有较完整测试，可在其上直接扩充。

迁移后它仍然保留：

- `GAP` / `MAX_DISPLAY`
- 单图与多图区分
- `onLayout` 更新 `containerWidth`
- `cellSize` 计算
- overflow 展示
- 图片加载失败回退

具体处理方式：

- 删除 `StyleSheet.create`
- 用 `className` 表达：
  - grid
  - overflowCell / overflowText
  - singleMissing
  - gridCellMissing
- 保留：
  - `style={{ width: cellSize, height: cellSize }}`
  - 单图 `style` 中的 `height: maxPhotoHeight`
  - `photoImageRadius`

允许补的稳定测试锚点：

- 复用现有：
  - `photo-grid`
  - `photo-cell-*`
  - `photo-overflow`
- 额外补：
  - `photo-grid-root`

### 4. `VoiceRecorder` 迁移设计

[VoiceRecorder.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/VoiceRecorder.tsx) 目前没有独立测试，是本批里业务风险最高的 Modal。

迁移后它仍然保留：

- `handleStart` / `handlePause` / `handleResume` / `handleStop`
- `handleCancel` / `handleSave` / `handleRetry`
- 计时器逻辑
- `ActivityIndicator`
- `WaveformAnimation`

具体处理方式：

- 删除 `StyleSheet.create`
- 用 `className` 表达：
  - overlay / backdrop / sheet / handle
  - header / typeBadge / closeBtn
  - body
  - idle / recording / done 三种状态的静态壳层
  - actions / primaryBtn / secondaryBtn / stopBtn / disabled
  - 文本样式
- 保留：
  - Modal 遮罩层
  - 阴影若 NativeWind 表达不完整时的最小 style
  - `View style={{ height: 24 }}`
  - 波形颜色的运行时切换

允许补的稳定测试锚点：

- `voice-recorder-root`
- `voice-recorder-idle`
- `voice-recorder-recording`
- `voice-recorder-done`

### 5. `ImageViewer` 迁移设计

[ImageViewer.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/ImageViewer.tsx) 是本批最复杂文件，最后迁移。

迁移后它仍然保留：

- 所有 `Gesture` 组合逻辑
- `useSharedValue` / `useAnimatedStyle`
- `opening` / `open` / `closing` / `closing-fade`
- 保存到相册和分享逻辑
- `originLayout` / `thumbnailRef` 共享元素相关逻辑

具体处理方式：

- 删除 `StyleSheet.create`
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
- 保留：
  - `StyleSheet.absoluteFill` / `StyleSheet.absoluteFillObject` 所代表的全屏绝对定位，可改为 `className="absolute inset-0"`
  - `heroAnimatedStyle`
  - `SCREEN_WIDTH` / `SCREEN_HEIGHT`
  - 所有 animated `style`

允许补的稳定测试锚点：

- `image-viewer-root`
- `image-viewer-action-sheet`

### 6. 测试与验收策略

第一层是组件级测试：

- 新增 `WaveformAnimation.test.tsx`
  - 锁定根壳层存在
  - 锁定 bar 数量正确
- 扩充 `PhotoGrid.test.tsx`
  - 锁定根壳层存在
  - 继续保留多图尺寸与 overflow 断言
- 新增 `VoiceRecorder.test.tsx`
  - 锁定待机态根壳层
  - 覆盖开始录音、停止后显示完成态、取消行为
- 扩充 `ImageViewer.shared-element.test.tsx`
  - 锁定查看器根壳层存在
  - 锁定 action sheet 根壳层在显示时存在
  - 保留原有 shared-element / `onRequestClose` 回归断言

第二层是守卫与全量验收：

- 迁移完成后，从 [style-guard-allowlist.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/eslint/style-guard-allowlist.js) 删除：
  - `src/components/WaveformAnimation.tsx`
  - `src/components/PhotoGrid.tsx`
  - `src/components/VoiceRecorder.tsx`
  - `src/components/ImageViewer.tsx`
- 跑相关组件测试、`pnpm run lint`、`pnpm run typecheck` 和全量 `pnpm test --runInBand`

### 7. 风险与控制

这批最大风险有三类：

- `ImageViewer` 的 gesture / animated style 在迁移中被误改
- `VoiceRecorder` 的状态切换和按钮流转被误伤
- `PhotoGrid` 的尺寸计算或 overflow 规则在迁移中偏掉

对应控制方式：

- 先迁 `WaveformAnimation`
- 再迁已有测试较稳的 `PhotoGrid`
- 然后迁 `VoiceRecorder`
- 最后迁 `ImageViewer`
- 对所有手势、动画、动态尺寸和共享元素相关样式只做最小必要保留

## 本地结构化 Review 结论

- 已检查第七批范围、上下游依赖、测试现状和 allowlist 收口点
- `WaveformAnimation`、`PhotoGrid`、`VoiceRecorder`、`ImageViewer` 可以组成一条边界清晰的连续迁移链路
- 未发现阻塞进入 implementation plan 的问题

## 实现结果

- 已完成 [WaveformAnimation.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/WaveformAnimation.tsx)、[PhotoGrid.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/PhotoGrid.tsx)、[VoiceRecorder.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/VoiceRecorder.tsx)、[ImageViewer.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/ImageViewer.tsx) 的静态样式迁移，四者均不再依赖 `StyleSheet.create`
- 已补稳定测试锚点：
  - `waveform-animation-root`
  - `waveform-bar-*`
  - `photo-grid-root`
  - `voice-recorder-root`
  - `voice-recorder-idle`
  - `voice-recorder-recording`
  - `voice-recorder-done`
  - `image-viewer-root`
  - `image-viewer-action-sheet`
- 已新增 [WaveformAnimation.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/WaveformAnimation.test.tsx) 与 [VoiceRecorder.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/VoiceRecorder.test.tsx)，并扩充 [PhotoGrid.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/PhotoGrid.test.tsx) 与 [ImageViewer.shared-element.test.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/__tests__/ImageViewer.shared-element.test.tsx)
- 已从 [style-guard-allowlist.js](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/eslint/style-guard-allowlist.js) 删除这 4 个组件，完成第七批媒体查看与录音链路收口
- 入口关系和业务行为保持不变：
  - `VoiceRecorder -> WaveformAnimation`
  - 图片卡片入口 -> `PhotoGrid` -> `ImageViewer`
  - 波形动画、图片网格布局、录音状态机、图片查看器 gesture / shared-element / 保存分享逻辑均未调整

## 验证结果

- `cd app && npx jest --run-in-band --runTestsByPath src/components/__tests__/WaveformAnimation.test.tsx src/components/__tests__/PhotoGrid.test.tsx src/components/__tests__/VoiceRecorder.test.tsx src/components/__tests__/ImageViewer.shared-element.test.tsx`：PASS，4 个 suite / 13 个测试全部通过
- `cd app && pnpm run lint`：PASS
- `cd app && pnpm run typecheck`：PASS
- `cd app && pnpm test --runInBand`：PASS，59 个 suite / 364 个测试全部通过

## 偏差说明

- [ImageViewer.tsx](/Users/cooper/Documents/code/MemoryCapsule/.worktrees/nativewind-style-guardrails/app/src/components/ImageViewer.tsx) 新增可选属性 `debugShowActionSheet?: boolean`，仅用于测试或调试时稳定渲染 action sheet 壳层，不改变默认交互路径、长按触发逻辑或业务行为
- 除此之外无功能性偏差
