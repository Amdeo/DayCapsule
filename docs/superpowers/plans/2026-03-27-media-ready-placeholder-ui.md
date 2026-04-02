# Media Ready Placeholder UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让云端同步入站后的图片和语音在本地媒体尚未落地时显示加载占位，并禁止过早交互。

**Architecture:** 新增一个轻量 media-ready helper，判断媒体当前是否仍是远端 URI 且没有本地可用文件。`PhotoGrid` 和语音卡片基于这个 helper 显示“准备中”占位，`EntryCard` 控制器在媒体未就绪时不打开图片查看器也不触发音频播放。

**Tech Stack:** React Native + Jest

---

### Task 1: 为图片/语音待落地状态写失败测试

**Files:**
- Modify: `app/src/components/__tests__/PhotoGrid.test.tsx`
- Modify: `app/src/components/__tests__/EntryCard.test.tsx`

- [ ] **Step 1: 写失败测试**
  - 远端图片未 hydrate 时显示加载占位
  - 远端语音未 hydrate 时显示准备中且不显示播放按钮
  - 远端图片未 hydrate 时点击卡片不打开 viewer

- [ ] **Step 2: 运行测试确认失败**
  - Run: `pnpm test --runInBand --runTestsByPath src/components/__tests__/PhotoGrid.test.tsx src/components/__tests__/EntryCard.test.tsx`

### Task 2: 实现 media-ready helper 与展示层占位

**Files:**
- Create: `app/src/utils/mediaAvailability.ts`
- Modify: `app/src/components/photo-grid/PhotoGridCells.tsx`
- Modify: `app/src/components/entry-card/EntryCardDefaultVoiceContent.tsx`
- Modify: `app/src/components/entry-card/useEntryCardController.ts`
- Modify: `app/src/components/entry-card/EntryCard.styles.ts`

- [ ] **Step 1: 最小实现**
  - 新增 helper
  - 图片网格加 loading placeholder
  - 语音卡片加准备中展示
  - 未就绪时禁用图片 viewer 和语音播放入口

- [ ] **Step 2: 运行测试确认通过**
  - Run: `pnpm test --runInBand --runTestsByPath src/components/__tests__/PhotoGrid.test.tsx src/components/__tests__/EntryCard.test.tsx`

### Task 3: 回归验证

**Files:**
- Verify: `app/src/components/PhotoGrid.tsx`
- Verify: `app/src/components/EntryCard.tsx`

- [ ] **Step 1: 跑相关前端测试**
  - Run: `pnpm test --runInBand --runTestsByPath src/components/__tests__/PhotoGrid.test.tsx src/components/__tests__/EntryCard.test.tsx src/components/__tests__/EntryCard.missing-media.test.tsx src/components/__tests__/image/entry-card.missing-media-variants.test.tsx`

- [ ] **Step 2: 跑类型检查**
  - Run: `pnpm run typecheck`
