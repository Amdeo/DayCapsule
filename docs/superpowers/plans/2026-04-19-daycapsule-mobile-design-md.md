# DayCapsule Mobile DESIGN.md Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 产出一份可直接放入 `app/DESIGN.md` 的 DayCapsule 移动端设计系统文档，供 AI 后续生成或扩展界面时稳定复用。

**Architecture:** 以已批准的规格文档为单一事实来源，结合 `app/src/theme/visualLanguage.ts`、`app/tailwind.config.js` 与现有界面截图，将 DayCapsule 当前视觉事实整理为 Stitch 风格的 DESIGN.md 结构。实现范围只包含文档编写与内容校验，不包含 UI 代码修改。

**Tech Stack:** Markdown、Expo React Native 现有视觉令牌、项目规格文档

---

### Task 1: 锁定输入材料与 DESIGN.md 骨架

**Files:**
- Modify: `docs/superpowers/plans/2026-04-19-daycapsule-mobile-design-md.md`
- Read: `docs/superpowers/specs/2026-04-19-daycapsule-mobile-design-md-design.md`
- Read: `app/src/theme/visualLanguage.ts`
- Read: `app/tailwind.config.js`
- Create: `app/DESIGN.md`

- [ ] **Step 1: 复核规格与视觉令牌**

Run:

```bash
rtk sed -n '1,260p' docs/superpowers/specs/2026-04-19-daycapsule-mobile-design-md-design.md
rtk sed -n '1,240p' app/src/theme/visualLanguage.ts
rtk sed -n '1,240p' app/tailwind.config.js
```

Expected: 能确认 `静谧陶瓷感`、品牌蓝、三类记录色、轻边界和低阴影是最终 DESIGN.md 的核心规则。

- [ ] **Step 2: 搭建 DESIGN.md 章节骨架**

Write this markdown skeleton into `app/DESIGN.md`:

```md
# DayCapsule DESIGN.md

## 1. Visual Theme & Atmosphere
## 2. Color Palette & Roles
## 3. Typography Rules
## 4. Component Stylings
## 5. Layout Principles
## 6. Depth & Elevation
## 7. Do's and Don'ts
## 8. Responsive Behavior
## 9. Agent Prompt Guide
```

- [ ] **Step 3: 运行最小文件校验**

Run:

```bash
rtk test -f app/DESIGN.md && rtk sed -n '1,80p' app/DESIGN.md
```

Expected: 文件存在，且九个章节标题完整无缺。

- [ ] **Step 4: 提交骨架**

```bash
rtk git add app/DESIGN.md docs/superpowers/plans/2026-04-19-daycapsule-mobile-design-md.md
rtk git commit -m "Create the DayCapsule DESIGN.md writing scaffold"
```

### Task 2: 写入完整视觉系统内容

**Files:**
- Modify: `app/DESIGN.md`
- Read: `docs/superpowers/specs/2026-04-19-daycapsule-mobile-design-md-design.md`
- Read: `app/src/theme/visualLanguage.ts`
- Read: `app/tailwind.config.js`

- [ ] **Step 1: 填写视觉主题、色彩和排版规则**

Write the following sections into `app/DESIGN.md`:

```md
## 1. Visual Theme & Atmosphere
- Describe DayCapsule as a quiet ceramic mobile journaling product
- State that content is primary and UI should never dominate
- Name the emotional tone: calm, warm, restrained, editorial

## 2. Color Palette & Roles
- Define page/card/modal/text/secondary text colors with hex values
- Define brand action blue and pressed state
- Define text/photo/voice entry colors and their limited roles
- Define error color and note that semantic colors stay sparse

## 3. Typography Rules
- Specify modern sans-serif direction
- Define title/body/meta/tag hierarchy
- State that body copy is the most important text layer
```

- [ ] **Step 2: 填写组件、布局、层级和动效规则**

Write the following sections into `app/DESIGN.md`:

```md
## 4. Component Stylings
- Search bar, timeline headers, entry cards, creation shortcuts, dialogs, editor dock, chips

## 5. Layout Principles
- Medium density, diary-flow continuity, spacing priorities, whitespace rhythm

## 6. Depth & Elevation
- Light borders before shadows, only limited elevation for floating controls
```

- [ ] **Step 3: 填写守则、响应式和 AI 指令**

Write the following sections into `app/DESIGN.md`:

```md
## 7. Do's and Don'ts
- Preserve quiet ceramic mood, avoid candy colors, avoid tech-panel styling

## 8. Responsive Behavior
- Mobile-first, safe areas, touch targets, contrast, type-color cannot be the only signal

## 9. Agent Prompt Guide
- Tell AI to extend the current DayCapsule mobile system
- Keep brand blue for actions and type colors for categorization only
- Prefer calm card-based diary flow over dashboard patterns
```

- [ ] **Step 4: 提交完整文档**

```bash
rtk git add app/DESIGN.md
rtk git commit -m "Codify the DayCapsule mobile visual system in DESIGN.md"
```

### Task 3: 校验内容完整性与项目对齐

**Files:**
- Modify: `app/DESIGN.md`
- Read: `docs/superpowers/specs/2026-04-19-daycapsule-mobile-design-md-design.md`
- Read: `app/src/theme/visualLanguage.ts`
- Read: `app/tailwind.config.js`

- [ ] **Step 1: 做规格覆盖检查**

Run:

```bash
rtk rg -n '^## ' app/DESIGN.md
rtk rg -n 'ceramic|陶瓷|brand|entry|responsive|prompt|Do|Don' app/DESIGN.md
```

Expected: 九个章节齐全，并且能找到材质、品牌色、类型色、响应式和 Agent Prompt Guide 的文字。

- [ ] **Step 2: 做令牌一致性检查**

Run:

```bash
rtk rg -n '#6A89CC|#5876B6|#8F7AC8|#77C9D4|#F0A53A|#FAF6EF|#FFF9F2|#FFF8F0|#3F332A|#6F6257|#9E9084|#B96A57' app/DESIGN.md
```

Expected: 关键颜色令牌均存在，且与规格文档、`visualLanguage.ts`、`tailwind.config.js` 保持一致或是明确的收敛表达。

- [ ] **Step 3: 做文档可读性检查**

Run:

```bash
rtk sed -n '1,260p' app/DESIGN.md
```

Expected: 文档能被单独阅读理解，不依赖外部背景解释，不含 TODO/TBD/placeholder。

- [ ] **Step 4: 提交验证后修订**

```bash
rtk git add app/DESIGN.md
rtk git commit -m "Tighten DayCapsule DESIGN.md for agent readability"
```
