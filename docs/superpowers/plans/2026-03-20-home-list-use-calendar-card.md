# 主页列表使用日历卡片 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让主页列表直接使用现有日历卡片样式，并保持主页现有时间线结构与交互能力不变。

**Architecture:** 不新增卡片变体，不改 CalendarView。主页列表继续通过 `Timeline.v2.tsx` 渲染 `EntryCard`，只把主页列表传入的卡片 variant 切换为现有 `calendar` variant，并通过测试覆盖主页视图切换、三类条目显示和基础交互不回归。

**Tech Stack:** React Native, TypeScript, React Testing Library, Jest

---

## 关联文档

- Spec: `docs/superpowers/specs/2026-03-20-home-list-use-calendar-card-design.md`

---

## 文件范围

### 主要改动文件

- Modify: `app/src/components/Timeline.v2.tsx`
- Modify: `app/src/components/EntryCard.tsx`

### 测试文件

- Modify: `app/src/components/__tests__/Timeline.v2.view-mode.test.tsx`
- Modify: `app/src/components/__tests__/EntryCard.test.tsx`

### 文档收口

- Modify: `docs/superpowers/specs/2026-03-20-home-list-use-calendar-card-design.md`
- Modify: `docs/superpowers/plans/2026-03-20-home-list-use-calendar-card.md`

---

## Chunk 1: 主页列表切到日历卡片

### Task 1: 用失败测试锁定主页列表 variant 切换

**Files:**
- Modify: `app/src/components/__tests__/Timeline.v2.view-mode.test.tsx`
- Modify: `app/src/components/Timeline.v2.tsx`

- [x] **Step 1: 写失败中的视图切换断言**

目标：
- 在 list 模式下，主页列表传给 `EntryCard` 的 variant 应为 `calendar`
- 在 calendar 模式下，仍继续把完整交互透传给 `CalendarView`

建议测试：
- 扩展 `Timeline.v2.view-mode.test.tsx`
- 保留现有 mock 结构，增加对 list 模式下 `EntryCard` props 的断言

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npm test -- --runInBand app/src/components/__tests__/Timeline.v2.view-mode.test.tsx`
Expected:
- 断言 list 模式使用 `variant="calendar"` 失败

- [x] **Step 3: 写最小实现**

改动要求：
- 在 `Timeline.v2.tsx` 的主页列表 `EntryCard` 调用处传入 `variant="calendar"`
- 不改动主页外层时间线结构
- 不改动 `CalendarView` 的现有调用方式

- [x] **Step 4: 运行目标测试，确认通过**

Run: `cd app && npm test -- --runInBand app/src/components/__tests__/Timeline.v2.view-mode.test.tsx`
Expected:
- 目标测试通过

- [x] **Step 5: 更新任务状态**

在本计划中记录完成情况。

---

## Chunk 2: 卡片显示与交互回归

### Task 2: 用失败测试锁定主页卡片显示不回归

**Files:**
- Modify: `app/src/components/__tests__/EntryCard.test.tsx`
- Modify: `app/src/components/EntryCard.tsx`

- [x] **Step 1: 写失败中的卡片断言**

目标：
- text / photo / voice 三类条目在 `variant="calendar"` 下仍能渲染主页所需的基本内容
- 主页切换后不因为 variant 变化导致关键节点缺失

建议测试：
- 在 `EntryCard.test.tsx` 现有 `calendar variant` 分组基础上补主页列表需要的最小断言
- 重点覆盖：
  - 文本条目可见
  - 图片条目图片区块可见
  - 语音条目核心信息可见

- [x] **Step 2: 运行目标测试，确认先失败**

Run: `cd app && npm test -- --runInBand app/src/components/__tests__/EntryCard.test.tsx`
Expected:
- 新增断言在当前实现或当前主页接线下无法全部满足，或者暴露出 variant 切换后的差异

- [x] **Step 3: 做最小实现或修正**

改动要求：
- 只修复因主页列表切换到 `calendar` variant 导致的必要显示问题
- 不扩展到新的主页专用样式
- 不借机重构 `EntryCard`

- [x] **Step 4: 运行目标测试，确认通过**

Run: `cd app && npm test -- --runInBand app/src/components/__tests__/EntryCard.test.tsx`
Expected:
- 目标测试通过

- [x] **Step 5: 更新任务状态**

在本计划中记录修复点与结果。

### Task 3: 验证主页交互与整体回归

**Files:**
- Modify: `app/src/components/__tests__/Timeline.v2.view-mode.test.tsx`
- Modify: `app/src/components/__tests__/EntryCard.test.tsx`

- [x] **Step 1: 运行相关回归测试**

Run: `cd app && npm test -- --runInBand app/src/components/__tests__/Timeline.v2.view-mode.test.tsx app/src/components/__tests__/EntryCard.test.tsx`
Expected:
- 两组测试全部通过

- [x] **Step 2: 运行更小范围关联测试**

Run: `cd app && npm test -- --runInBand app/src/components/__tests__/CalendarView.test.tsx`
Expected:
- 日历视图测试继续通过，证明未影响日历页

- [x] **Step 3: 如有必要做最小修正**

改动要求：
- 只处理主页列表切换日历卡片导致的真实回归
- 不改动与本任务无关的视觉或交互逻辑

- [x] **Step 4: 运行最终组件回归**

Run: `cd app && npm test -- --runInBand app/src/components/__tests__/Timeline.v2.view-mode.test.tsx app/src/components/__tests__/EntryCard.test.tsx app/src/components/__tests__/CalendarView.test.tsx`
Expected:
- 三组测试全部通过

- [x] **Step 5: 更新任务状态**

在本计划中记录验证结果。

---

## Chunk 3: 文档收口

### Task 4: 同步 spec / plan 状态与验证记录

**Files:**
- Modify: `docs/superpowers/specs/2026-03-20-home-list-use-calendar-card-design.md`
- Modify: `docs/superpowers/plans/2026-03-20-home-list-use-calendar-card.md`

- [x] **Step 1: 更新 spec 状态**

要求：
- 实现完成后将 spec 状态改为 `已实现`
- 如果实际落地与设计略有偏差，补最终说明

- [x] **Step 2: 更新 plan 执行状态**

要求：
- 勾选已完成步骤
- 记录实际修改文件

- [x] **Step 3: 补验证结果**

至少记录：
- `cd app && npm test -- --runInBand app/src/components/__tests__/Timeline.v2.view-mode.test.tsx`
- `cd app && npm test -- --runInBand app/src/components/__tests__/EntryCard.test.tsx`
- `cd app && npm test -- --runInBand app/src/components/__tests__/CalendarView.test.tsx`

- [x] **Step 4: 更新本计划状态**

要求：
- 在计划末尾补最终验证摘要

---

## 最终验证清单

- [x] `cd app && npm test -- --runInBand src/components/__tests__/Timeline.v2.view-mode.test.tsx`
- [x] `cd app && npm test -- --runInBand src/components/__tests__/EntryCard.test.tsx`
- [x] `cd app && npm test -- --runInBand src/components/__tests__/CalendarView.test.tsx`
- [x] 手动确认主页 list 模式卡片已切为日历卡片
- [x] 手动确认日历页未受影响
- [x] 手动确认文档状态已收口

---

## 执行备注

- 严格按最小替换方案执行
- 不新增 `listCalendar` 或其他变体
- 不借机调整主页卡片阅读密度
- 如果 `EntryCard` 内已有 `calendar` variant 逻辑足够，优先复用而不是扩写分支

---

## 最终验证摘要

- 失败验证：
  - `cd app && npm test -- --runInBand src/components/__tests__/Timeline.v2.view-mode.test.tsx`
  - 新增断言初始失败，证明主页列表此前未传 `variant="calendar"`
- 实现后验证：
  - `cd app && npm test -- --runInBand src/components/__tests__/Timeline.v2.view-mode.test.tsx` 通过
  - `cd app && npm test -- --runInBand src/components/__tests__/EntryCard.test.tsx` 通过
  - `cd app && npm test -- --runInBand src/components/__tests__/CalendarView.test.tsx` 通过
  - `cd app && npm test -- --runInBand src/components/__tests__/Timeline.v2.view-mode.test.tsx src/components/__tests__/EntryCard.test.tsx src/components/__tests__/CalendarView.test.tsx` 通过

## 最终实现说明

- 主页列表已直接使用现有日历卡片
- 仅修改 `Timeline.v2.tsx` 中主页列表渲染 `EntryCard` 的接线
- 未新增卡片变体，也未额外调整其他视觉或交互逻辑
