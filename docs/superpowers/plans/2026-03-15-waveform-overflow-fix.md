# WaveformAnimation 溢出修复 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `WaveformAnimation` 容器样式中加 `overflow: 'hidden'`，防止条形图在窄屏设备上溢出覆盖相邻元素。

**Architecture:** 单文件单行修改。`WaveformAnimation` 的 `container` 样式补充 `overflow: 'hidden'`，视觉溢出被裁剪，所有 3 处调用方（`EntryCard.tsx` 播放行、`EntryCard.tsx` 录音中状态行、`VoiceRecorder.tsx` 录音模态框）同时受益，无需改动调用方。

**Tech Stack:** React Native, react-native-reanimated, TypeScript

**参考文档：** `docs/superpowers/specs/2026-03-15-waveform-overflow-fix-design.md`

---

## Chunk 1: 修复 WaveformAnimation 溢出

### Task 1: 在 WaveformAnimation 容器加 overflow: hidden

**Files:**
- Modify: `app/src/components/WaveformAnimation.tsx`（styles.container，第 80-86 行）

---

- [ ] **Step 1: 确认当前样式**

打开 `app/src/components/WaveformAnimation.tsx`，确认 `container` 样式（约第 80-86 行）如下，且**没有** `overflow` 字段：

```ts
container: {
  height: CONTAINER_HEIGHT,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: BAR_GAP,
},
```

- [ ] **Step 2: 添加 overflow: 'hidden'**

在 `container` 样式末尾加一行：

```ts
container: {
  height: CONTAINER_HEIGHT,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: BAR_GAP,
  overflow: 'hidden',
},
```

- [ ] **Step 3: TypeScript 检查**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

预期：零错误。

- [ ] **Step 4: 运行测试套件确认无回归**

```bash
cd app && npx jest --no-coverage 2>&1 | tail -5
```

预期：全部测试通过（当前 84 个）。

- [ ] **Step 5: 提交**

```bash
cd /Users/cooper/Documents/code/MemoryCapsule && git add app/src/components/WaveformAnimation.tsx
git commit -m "fix: clip WaveformAnimation bars within container to prevent overflow on narrow screens"
```
