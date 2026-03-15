# WaveformAnimation 溢出修复设计文档

**日期：** 2026-03-15
**状态：** 已批准

---

## 问题描述

`WaveformAnimation` 组件固定渲染 50 根竖条（每根 2px 宽 + 1px 间距），总固定宽度约 149px。组件容器使用 `justifyContent: 'center'`，但没有限制溢出。

在较窄的设备上，外层容器（`voiceWaveform`，`flex: 1`）实际宽度可能小于 149px，导致条形图向两侧溢出，覆盖播放按钮（左侧）和时长文字（右侧）。

---

## 根本原因

`WaveformAnimation` 的 `container` 样式缺少 `overflow: 'hidden'`，导致子元素（条形图）可以超出组件自身边界渲染。

---

## 修复方案

在 `app/src/components/WaveformAnimation.tsx` 的 `container` 样式中添加 `overflow: 'hidden'`。

**修改文件：** `app/src/components/WaveformAnimation.tsx`

**修改内容：**

```ts
container: {
  height: CONTAINER_HEIGHT,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: BAR_GAP,
  overflow: 'hidden',  // 新增：防止条形图超出容器边界
},
```

---

## 影响范围

- 播放状态的波形（`voicePlayRow` 中）：修复两侧溢出覆盖按钮和时长文字的问题
- 录音状态的波形（`waveformCompact` 中）：同步修复，一致性保障
- 两处调用方均无需改动

---

## 平台兼容性

React Native 的 `View` 在 iOS 和 Android 均完整支持 `overflow: 'hidden'`，无平台差异。

---

## 验收标准

- 窄屏设备（如 iPhone SE、小尺寸 Android）上，播放音频时波形条不再覆盖播放按钮或时长文字
- 宽屏设备上，波形显示正常（中央条形图完整可见，边缘若有裁剪也不影响视觉）
- 录音状态波形无回归
