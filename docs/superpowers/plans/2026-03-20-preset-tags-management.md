# 预制标签管理 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有快速选择标签集合正式收口为“预制标签”，并让标签管理页直接显示和编辑这组预制标签。

**Architecture:** 保持现有 `commonTagsStore` 的持久化与使用链路不变，不新增第二套标签池。实现聚焦于统一 store 对外语义、设置入口与标签管理页文案，以及补齐相关测试，确保编辑器和搜索筛选继续复用同一组标签。

**Tech Stack:** React Native, TypeScript, Zustand, Jest, React Testing Library

---

## 关联文档

- Spec: `docs/superpowers/specs/2026-03-20-preset-tags-management-design.md`

---

## 文件范围

### 主要改动文件

- Modify: `app/src/store/commonTagsStore.ts`
- Modify: `app/src/components/TagManagementPage.tsx`
- Modify: `app/src/components/SettingsPage.tsx`

### 测试文件

- Modify: `app/src/store/__tests__/commonTagsStore.test.ts`
- Modify: `app/src/components/__tests__/SettingsPage.test.tsx`
- Add or Modify: `app/src/components/__tests__/TagManagementPage.test.tsx`

### 文档收口

- Modify: `docs/superpowers/specs/2026-03-20-preset-tags-management-design.md`
- Modify: `docs/superpowers/plans/2026-03-20-preset-tags-management.md`

---

## Chunk 1: 预制标签语义收口

### Task 1: 用失败测试锁定 store 语义和默认恢复行为

**Files:**
- Modify: `app/src/store/__tests__/commonTagsStore.test.ts`
- Modify: `app/src/store/commonTagsStore.ts`

- [x] **Step 1: 写失败中的 store 测试**

目标：
- 默认标签集合仍然存在且可加载
- 重置能力仍可恢复初始预制标签
- 对外命名或注释不再误导为“隐藏常用标签”

建议方式：
- 在现有 `commonTagsStore.test.ts` 基础上补或改断言
- 优先验证行为，不只验证文案

- [x] **Step 2: 运行目标测试，确认当前语义未对齐**

Run: `cd app && npm test -- --runInBand src/store/__tests__/commonTagsStore.test.ts`
Expected:
- 现有测试名称、断言或对外语义仍是“常用标签”，无法完整表达“预制标签”心智

- [x] **Step 3: 写最小实现**

改动要求：
- 保持持久化 key 和行为稳定
- 允许继续使用现有 store 文件，但补齐更准确的导出命名、注释或常量语义
- 不新增第二套 store

- [x] **Step 4: 运行目标测试，确认通过**

Run: `cd app && npm test -- --runInBand src/store/__tests__/commonTagsStore.test.ts`
Expected:
- store 测试通过

- [x] **Step 5: 更新任务状态**

在本计划中记录完成情况。

---

## Chunk 2: 标签管理页与设置入口改名

### Task 2: 用失败测试锁定设置入口和页面标题

**Files:**
- Modify: `app/src/components/TagManagementPage.tsx`
- Modify: `app/src/components/SettingsPage.tsx`
- Modify: `app/src/components/__tests__/SettingsPage.test.tsx`
- Add or Modify: `app/src/components/__tests__/TagManagementPage.test.tsx`

- [x] **Step 1: 写失败中的 UI 文案测试**

目标：
- 设置页入口显示“预制标签管理”或等价明确文案
- 标签管理页标题明确是“预制标签管理”
- 页面中“恢复默认”文案表意为恢复初始预制标签

- [x] **Step 2: 运行目标测试，确认当前实现失败**

Run: `cd app && npm test -- --runInBand src/components/__tests__/SettingsPage.test.tsx`
Expected:
- 当前入口仍为“常用标签管理”，测试失败

Run: `cd app && npm test -- --runInBand src/components/__tests__/TagManagementPage.test.tsx`
Expected:
- 若测试不存在则先新增；当前标题/提示文案不符合预制标签语义而失败

- [x] **Step 3: 写最小实现**

改动要求：
- 设置页入口文案统一为“预制标签”语义
- 标签管理页标题、提示文案、恢复文案统一为“预制标签”语义
- 页面主列表继续直接展示当前这组标签
- 不新增分组、不新增第二套只读预制标签区

- [x] **Step 4: 运行目标测试，确认通过**

Run: `cd app && npm test -- --runInBand src/components/__tests__/SettingsPage.test.tsx`
Expected:
- 设置页测试通过

Run: `cd app && npm test -- --runInBand src/components/__tests__/TagManagementPage.test.tsx`
Expected:
- 标签管理页测试通过

- [x] **Step 5: 更新任务状态**

在本计划中记录完成情况。

---

## Chunk 3: 复用链路回归

### Task 3: 验证编辑器和搜索筛选未被语义调整破坏

**Files:**
- Modify: `app/src/components/TagManagementPage.tsx`
- Modify: `app/src/store/commonTagsStore.ts`
- 视需要修改相关测试

- [x] **Step 1: 运行现有相关测试**

优先检查：
- `cd app && npm test -- --runInBand src/store/__tests__/commonTagsStore.test.ts`
- `cd app && npm test -- --runInBand src/components/__tests__/SettingsPage.test.tsx`

如果仓库已有覆盖编辑器或搜索里常用标签的测试，也纳入回归范围。

- [x] **Step 2: 做最小修正**

改动要求：
- 只修复因“常用标签”改称“预制标签”引起的真实回归
- 不改变编辑器和搜索筛选的数据来源
- 不扩展功能范围

- [x] **Step 3: 运行最终回归测试**

Run: `cd app && npm test -- --runInBand src/store/__tests__/commonTagsStore.test.ts src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/TagManagementPage.test.tsx`
Expected:
- 相关测试全部通过

- [x] **Step 4: 更新任务状态**

在本计划中记录验证结果。

---

## Chunk 4: 文档收口

### Task 4: 同步 spec / plan 状态与验证记录

**Files:**
- Modify: `docs/superpowers/specs/2026-03-20-preset-tags-management-design.md`
- Modify: `docs/superpowers/plans/2026-03-20-preset-tags-management.md`

- [x] **Step 1: 更新 spec 状态**

要求：
- 实现完成后将 spec 状态改为 `已实现`
- 若实际实现与设计略有偏差，补充最终说明

- [x] **Step 2: 更新 plan 执行状态**

要求：
- 勾选已完成步骤
- 记录实际修改文件

- [x] **Step 3: 补验证结果**

至少记录：
- `cd app && npm test -- --runInBand src/store/__tests__/commonTagsStore.test.ts`
- `cd app && npm test -- --runInBand src/components/__tests__/SettingsPage.test.tsx`
- `cd app && npm test -- --runInBand src/components/__tests__/TagManagementPage.test.tsx`

- [x] **Step 4: 更新本计划状态**

要求：
- 在计划末尾补最终验证摘要

---

## 最终验证清单

- [x] `cd app && npm test -- --runInBand src/store/__tests__/commonTagsStore.test.ts`
- [x] `cd app && npm test -- --runInBand src/components/__tests__/SettingsPage.test.tsx`
- [x] `cd app && npm test -- --runInBand src/components/__tests__/TagManagementPage.test.tsx`
- [x] 手动确认标签管理页直接显示当前预制标签
- [x] 手动确认设置入口文案改为预制标签语义
- [x] 手动确认编辑器和搜索筛选仍继续使用这组标签
- [x] 手动确认文档状态已收口

---

## 执行备注

- 优先做语义收口，不做标签系统重构
- 保持现有持久化 key 稳定，除非有充分理由
- 不新增第二套“系统预制标签 + 用户标签”双池模型
- 任何额外功能都视为超范围

---

## 最终验证摘要

- 失败验证：
  - `cd app && npm test -- --runInBand src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/TagManagementPage.test.tsx`
  - 新增断言初始失败，证明设置入口和标签管理页文案仍停留在“常用标签/标签管理”语义
- 实现后验证：
  - `cd app && npm test -- --runInBand src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/TagManagementPage.test.tsx` 通过
  - `cd app && npm test -- --runInBand src/store/__tests__/commonTagsStore.test.ts src/components/__tests__/SettingsPage.test.tsx src/components/__tests__/TagManagementPage.test.tsx` 通过
  - `cd app && npm run typecheck` 通过

## 最终实现说明

- 现有快速选择标签集合已在产品语义上收口为“预制标签”
- 设置页与标签管理页文案已统一
- 未新增第二套标签池，仍复用现有 store 与持久化逻辑
