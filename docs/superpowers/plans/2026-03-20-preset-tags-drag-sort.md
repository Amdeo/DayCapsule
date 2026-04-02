# 预制标签拖拽排序 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让预制标签管理页支持长按拖拽排序，并将排序结果持久化保存。

**Architecture:** 保持现有预制标签数据模型不变，在 `commonTagsStore` 中增加重排方法，在 `TagManagementPage` 中接入拖拽列表实现。测试重点覆盖排序结果、持久化写回和现有删除/恢复逻辑不回归，而不过度耦合具体手势动画细节。

**Tech Stack:** React Native, TypeScript, Zustand, Jest, React Testing Library

---

## 关联文档

- Spec: `docs/superpowers/specs/2026-03-20-preset-tags-drag-sort-design.md`

---

## 文件范围

### 主要改动文件

- Modify: `app/src/store/commonTagsStore.ts`
- Modify: `app/src/components/TagManagementPage.tsx`

### 测试文件

- Modify: `app/src/store/__tests__/commonTagsStore.test.ts`
- Modify: `app/src/components/__tests__/TagManagementPage.test.tsx`

### 文档收口

- Modify: `docs/superpowers/specs/2026-03-20-preset-tags-drag-sort-design.md`
- Modify: `docs/superpowers/plans/2026-03-20-preset-tags-drag-sort.md`

---

## Chunk 1: Store 重排能力

### Task 1: 用失败测试锁定重排与持久化

**Files:**
- Modify: `app/src/store/__tests__/commonTagsStore.test.ts`
- Modify: `app/src/store/commonTagsStore.ts`

- [x] **Step 1: 写失败中的 store 测试**

目标：
- 支持将标签从一个索引移动到另一个索引
- 重排后顺序立即更新
- 新顺序会写回持久化

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && pnpm test --runInBand src/store/__tests__/commonTagsStore.test.ts`
Expected:
- 当前 store 没有重排方法或相关行为，新增断言失败

- [x] **Step 3: 写最小实现**

改动要求：
- 在 `commonTagsStore` 中增加重排方法
- 重排后调用现有持久化链路保存
- 不改变新增、删除、恢复默认逻辑

- [x] **Step 4: 运行目标测试，确认通过**

Run: `cd app && pnpm test --runInBand src/store/__tests__/commonTagsStore.test.ts`
Expected:
- store 测试通过

- [x] **Step 5: 更新任务状态**

在本计划中记录完成情况。

---

## Chunk 2: 标签管理页接入拖拽排序

### Task 2: 用失败测试锁定拖拽排序入口

**Files:**
- Modify: `app/src/components/__tests__/TagManagementPage.test.tsx`
- Modify: `app/src/components/TagManagementPage.tsx`

- [x] **Step 1: 写失败中的页面测试**

目标：
- 页面支持触发排序完成后的回调
- 触发排序后会调用 store 的重排方法
- “当前预制标签”区块和已有新增能力继续存在

说明：
- 测试重点放在排序结果和调用链，不强求完整模拟真实拖拽动画

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && pnpm test --runInBand src/components/__tests__/TagManagementPage.test.tsx`
Expected:
- 当前页面没有拖拽排序实现，新增断言失败

- [x] **Step 3: 写最小实现**

改动要求：
- 使用可长按拖拽的列表方案
- 长按整行即可拖拽
- 删除按钮继续可用
- 排序完成后调用 store 重排方法
- 不新增排序模式、不增加拖拽手柄

- [x] **Step 4: 运行目标测试，确认通过**

Run: `cd app && pnpm test --runInBand src/components/__tests__/TagManagementPage.test.tsx`
Expected:
- 标签管理页测试通过

- [x] **Step 5: 更新任务状态**

在本计划中记录完成情况。

---

## Chunk 3: 回归验证与文档收口

### Task 3: 验证现有预制标签能力不回归

**Files:**
- Modify: `app/src/store/__tests__/commonTagsStore.test.ts`
- Modify: `app/src/components/__tests__/TagManagementPage.test.tsx`
- Modify: `docs/superpowers/specs/2026-03-20-preset-tags-drag-sort-design.md`
- Modify: `docs/superpowers/plans/2026-03-20-preset-tags-drag-sort.md`

- [x] **Step 1: 运行相关回归测试**

Run: `cd app && pnpm test --runInBand src/store/__tests__/commonTagsStore.test.ts src/components/__tests__/TagManagementPage.test.tsx src/components/__tests__/SettingsPage.test.tsx`
Expected:
- store、标签管理页和设置页测试全部通过

- [x] **Step 2: 运行 typecheck**

Run: `cd app && pnpm run typecheck`
Expected:
- TypeScript 检查通过

- [x] **Step 3: 更新 spec / plan 状态**

要求：
- 实现完成后将 spec 状态改为 `已实现`
- plan 勾选完成步骤并记录验证结果

---

## 最终验证清单

- [x] `cd app && pnpm test --runInBand src/store/__tests__/commonTagsStore.test.ts src/components/__tests__/TagManagementPage.test.tsx src/components/__tests__/SettingsPage.test.tsx`
- [x] `cd app && pnpm run typecheck`
- [x] 手动确认预制标签支持长按拖拽排序
- [x] 手动确认排序后重新进入页面顺序保持不变
- [x] 手动确认删除与恢复默认能力未变
- [x] 手动确认文档状态已收口

---

## 执行备注

- 不改 store 模型，只加重排能力
- 不增加排序模式
- 不加拖拽手柄
- 测试重点是排序结果和持久化，不追求完整手势动画仿真

---

## 最终验证摘要

- 失败验证：
  - `cd app && pnpm test --runInBand src/store/__tests__/commonTagsStore.test.ts`
  - 新增断言初始失败，证明 store 中还没有 `reorderCommonTags`
  - `cd app && pnpm test --runInBand src/components/__tests__/TagManagementPage.test.tsx`
  - 新增断言初始失败，证明页面还没有拖拽排序入口
- 实现后验证：
  - `cd app && pnpm test --runInBand src/store/__tests__/commonTagsStore.test.ts src/components/__tests__/TagManagementPage.test.tsx src/components/__tests__/SettingsPage.test.tsx` 通过
  - `cd app && pnpm run typecheck` 通过

## 最终实现说明

- 预制标签现在支持长按整行拖拽排序
- 排序结果会立即保存
- 现有新增、删除、恢复默认行为保持不变
