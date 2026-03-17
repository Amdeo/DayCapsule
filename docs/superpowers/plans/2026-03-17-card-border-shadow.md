# EntryCard 边框阴影改进 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 EntryCard 卡片加上一圈暖米色细边框，并微调阴影扩散半径，使卡片在 `#FAF8F5` 背景上层次更清晰。

**Architecture:** 只修改 `app/src/components/EntryCard.tsx` 中的 `styles.cardShadow` 样式对象，新增 `borderWidth` / `borderColor` 两个属性，并微调 `shadowOpacity` 和 `shadowRadius`。无逻辑变更，不涉及任何新组件或接口。

**Tech Stack:** React Native StyleSheet, NativeWind（本次不涉及）, iOS shadow props, Android elevation

**Spec:** `docs/superpowers/specs/2026-03-17-card-border-shadow-design.md`

---

### Task 1: 更新 cardShadow 样式

**Files:**
- Modify: `app/src/components/EntryCard.tsx:654-661`

- [ ] **Step 1: 确认当前样式**

打开 `app/src/components/EntryCard.tsx`，定位到第 654 行，确认 `cardShadow` 当前内容为：

```ts
cardShadow: {
  borderRadius: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 3,
},
```

- [ ] **Step 2: 替换 cardShadow 样式**

将 `cardShadow` 替换为：

```ts
cardShadow: {
  borderRadius: 16,
  borderWidth: 1,
  borderColor: 'rgba(139, 115, 85, 0.15)',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.07,
  shadowRadius: 8,
  elevation: 3,
},
```

变更说明：
- 新增 `borderWidth: 1`
- 新增 `borderColor: 'rgba(139, 115, 85, 0.15)'`（暖米色，与背景 `#FAF8F5` 色调一致）
- `shadowOpacity` 0.08 → 0.07（微降，配合阴影扩散）
- `shadowRadius` 6 → 8（阴影扩散更自然）
- `elevation: 3` 保持不变

- [ ] **Step 3: 确认 borderColor 位于外层 cardShadow 而非内层 cardContainer**

检查 `cardContainer`（第 662 行）仍为：

```ts
cardContainer: {
  borderRadius: 16,
  overflow: 'hidden',
},
```

`overflow: 'hidden'` 在 `cardContainer`（内层 Pressable）上，不会裁切 `cardShadow`（外层 Animated.View）的边框。确认无误。

- [ ] **Step 4: 运行现有测试确认无回归**

```bash
cd app && npx jest --testPathPattern="EntryCard" --passWithNoTests
```

预期：所有测试通过（纯样式改动，无逻辑变更）

- [ ] **Step 5: 提交**

```bash
git add app/src/components/EntryCard.tsx
git commit -m "feat: add warm border and refine shadow on entry cards"
```
