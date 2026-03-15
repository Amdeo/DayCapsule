# WaveformAnimation 溢出修复设计文档

**日期：** 2026-03-15
**状态：** 已批准

---

## 问题描述

`WaveformAnimation` 组件固定渲染 50 根竖条（每根 2px 宽 + 1px 间距），总固定宽度约 149px。在较窄的设备上（屏幕宽度 ≤ 375pt，如 iPhone SE），外层容器（`voiceWaveform`，`flex: 1`）实际分配宽度可能小于 149px，条形图向两侧溢出，覆盖播放按钮（左侧）和时长文字（右侧）。

---

## 根本原因

`WaveformAnimation` 的 `container` 没有设置 `width`，在 `flexDirection: 'row'` + `gap` 布局下，50 根 bar 将容器撑到固定的 ~149px，超出父容器的实际分配宽度。`container` 缺少 `overflow: 'hidden'`，导致子元素可以超出组件自身边界渲染至相邻区域。

注意：`overflow: 'hidden'` 修复的是**视觉溢出**（Yoga 内部布局宽度不变，视觉上被裁剪在容器边界内）。

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

## 备选方案与取舍

| 方案 | 描述 | 取舍 |
|------|------|------|
| `overflow: 'hidden'`（本方案） | 容器加一行裁剪 | 改动最小，修复源头，所有调用点同时受益 |
| 自适应条数 | `onLayout` 动态计算 bar count | 效果精确但引入 state + layout 回调，复杂度高 |
| 固定 `maxWidth` | 给外层容器限制最大宽度 | 治标不治本，宽屏留白多，各设备表现不一致 |

---

## 影响范围

`WaveformAnimation` 在项目中共有 **3 处**调用，修复后全部受益，调用方均无需改动：

| 文件 | 样式 | 使用场景 |
|------|------|---------|
| `EntryCard.tsx` | `voiceWaveform`（`flex:1, height:32`） | 音频卡片播放行的波形 |
| `EntryCard.tsx` | `waveformCompact`（`width:'100%', height:28`） | EntryCard 内"录音中"状态行的波形 |
| `VoiceRecorder.tsx` | `waveformBox`（`width:'100%', height:28`） | 录音模态框中的实时波形 |

---

## 平台兼容性

React Native 的 `View` 在 iOS 和 Android 均完整支持 `overflow: 'hidden'`，无平台差异。

---

## 验收标准

- 在屏幕宽度 ≤ 375pt 的设备（如 iPhone SE 3rd gen）上，播放音频时波形条不覆盖左侧播放按钮和右侧时长文字
- 在宽屏设备上，波形显示正常（无视觉异常）
- 录音模态框（`VoiceRecorder`）波形无回归
- EntryCard"录音中"状态波形无回归
