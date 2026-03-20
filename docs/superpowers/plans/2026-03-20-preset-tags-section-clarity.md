# 预制标签管理页显式分区 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在预制标签管理页中显式展示“当前预制标签”区块，让用户明确知道当前正在编辑的就是预制标签。

**Architecture:** 保持现有标签数据模型不变，只调整 `TagManagementPage` 的页面结构表达，并用组件测试锁定新的区块标题和说明文案。此次不改 store、不新增双分组、不调整快速选择链路。

**Tech Stack:** React Native, TypeScript, Jest, React Testing Library

---

## 关联文档

- Spec: `docs/superpowers/specs/2026-03-20-preset-tags-section-clarity-design.md`

---

## 文件范围

### 主要改动文件

- Modify: `app/src/components/TagManagementPage.tsx`

### 测试文件

- Modify: `app/src/components/__tests__/TagManagementPage.test.tsx`

### 文档收口

- Modify: `docs/superpowers/specs/2026-03-20-preset-tags-section-clarity-design.md`
- Modify: `docs/superpowers/plans/2026-03-20-preset-tags-section-clarity.md`

---

## Chunk 1: 显式分区标题

### Task 1: 用失败测试锁定“当前预制标签”区块

**Files:**
- Modify: `app/src/components/__tests__/TagManagementPage.test.tsx`
- Modify: `app/src/components/TagManagementPage.tsx`

- [x] **Step 1: 写失败中的 UI 结构测试**

目标：
- 标签管理页出现明确的“当前预制标签”标题
- 必要时出现一行辅助说明，表明这组标签用于快速选择

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npm test -- --runInBand src/components/__tests__/TagManagementPage.test.tsx`
Expected:
- 当前页面没有显式分区标题，新增断言失败

- [x] **Step 3: 写最小实现**

改动要求：
- 在标签列表区域前增加“当前预制标签”标题
- 如需要，增加一句轻量说明文案
- 不新增第二组标签区
- 不改现有新增、删除、恢复逻辑

- [x] **Step 4: 运行目标测试，确认通过**

Run: `cd app && npm test -- --runInBand src/components/__tests__/TagManagementPage.test.tsx`
Expected:
- 目标测试通过

- [x] **Step 5: 更新任务状态**

在本计划中记录完成情况。

---

## Chunk 2: 回归验证与文档收口

### Task 2: 验证页面语义和现有链路未回归

**Files:**
- Modify: `app/src/components/__tests__/TagManagementPage.test.tsx`
- Modify: `docs/superpowers/specs/2026-03-20-preset-tags-section-clarity-design.md`
- Modify: `docs/superpowers/plans/2026-03-20-preset-tags-section-clarity.md`

- [x] **Step 1: 运行相关回归测试**

Run: `cd app && npm test -- --runInBand src/components/__tests__/TagManagementPage.test.tsx src/components/__tests__/SettingsPage.test.tsx`
Expected:
- 标签管理页和设置页测试都通过

- [x] **Step 2: 运行 typecheck**

Run: `cd app && npm run typecheck`
Expected:
- TypeScript 检查通过

- [x] **Step 3: 更新 spec / plan 状态**

要求：
- 实现完成后将 spec 状态改为 `已实现`
- plan 勾选完成步骤并记录验证结果

---

## 最终验证清单

- [x] `cd app && npm test -- --runInBand src/components/__tests__/TagManagementPage.test.tsx src/components/__tests__/SettingsPage.test.tsx`
- [x] `cd app && npm run typecheck`
- [x] 手动确认标签管理页显示“当前预制标签”区块
- [x] 手动确认现有新增、删除、恢复能力未变
- [x] 手动确认文档状态已收口

---

## 执行备注

- 只增强页面结构表达
- 不改 store
- 不改设置页入口文案
- 不新增双池模型

---

## 最终验证摘要

- 失败验证：
  - `cd app && npm test -- --runInBand src/components/__tests__/TagManagementPage.test.tsx`
  - 新增断言初始失败，证明页面里还没有真正的“当前预制标签”区块标题与说明
- 实现后验证：
  - `cd app && npm test -- --runInBand src/components/__tests__/TagManagementPage.test.tsx src/components/__tests__/SettingsPage.test.tsx` 通过
  - `cd app && npm run typecheck` 通过

## 最终实现说明

- 标签管理页已显式标出“当前预制标签”
- 页面结构更直观，但数据模型和交互能力未改变
