# FABMenu UX Tweaks Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 扇形展开时隐藏提示气泡，花瓣按钮变大并离主 FAB 更远。

**Architecture:** 仅修改 `app/src/components/FABMenu.tsx` 中的 4 处：2 个布局常量、4 个 dist 值、1 个图标尺寸、1 个条件判断。无新增文件，无接口变更。

**Tech Stack:** React Native, TypeScript

**参考规格：** `docs/superpowers/specs/2026-03-15-fab-menu-ux-tweaks-design.md`

---

## Chunk 1: 全部改动

### Task 1: 修改 FABMenu.tsx

**Files:**
- Modify: `app/src/components/FABMenu.tsx`

---

- [ ] **Step 1: 将 `OPTION_SIZE` 从 48 改为 56**

在第 36 行，将：
```ts
const OPTION_SIZE = 48;
```
改为：
```ts
const OPTION_SIZE = 56;
```

`OPTION_ICON_HALF` 已写作 `OPTION_SIZE / 2`，无需单独修改。`optionWrapper` 高度写作 `OPTION_SIZE + 24`，修改后自动从 72 变为 80，属于预期副作用，无需单独处理。

---

- [ ] **Step 2: 将所有 `dist` 值统一改为 120**

在 `FAN_OPTIONS` 定义（第 42-47 行）中，将四个选项的 `dist` 全部改为 `120`：

```ts
const FAN_OPTIONS = [
  { type: 'text'   as LastAddType, icon: 'create-outline', label: '文字', color: '#A491D3', angle: -60, dist: 120 },
  { type: 'photo'  as LastAddType, icon: 'images',         label: '相册', color: '#57B8C8', angle: -20, dist: 120 },
  { type: 'camera' as LastAddType, icon: 'camera',         label: '拍照', color: '#77C9D4', angle:  20, dist: 120 },
  { type: 'voice'  as LastAddType, icon: 'mic-outline',    label: '语音', color: '#F5A623', angle:  60, dist: 120 },
] as const;
```

---

- [ ] **Step 3: 将 `FanOptionButton` 中图标尺寸从 22 改为 24**

在 `FanOptionButton` 组件（第 309 行左右），将：
```tsx
<Ionicons name={option.icon as any} size={22} color="#FFFFFF" />
```
改为：
```tsx
<Ionicons name={option.icon as any} size={24} color="#FFFFFF" />
```

---

- [ ] **Step 4: 扇形展开时隐藏提示气泡**

在 FABMenu 组件 JSX 中（第 252 行左右），将提示气泡的显示条件从：
```tsx
{lastAddType === null && (
  <View style={styles.tipBubble}>
```
改为：
```tsx
{lastAddType === null && !isExpanded && (
  <View style={styles.tipBubble}>
```

---

- [ ] **Step 5: TypeScript 检查**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

预期：零错误。若有错误逐条修复。

---

- [ ] **Step 6: 运行测试确认无回归**

```bash
cd app && npx jest --no-coverage 2>&1 | tail -8
```

预期：零 failed，通过数量与当前基线一致（本次改动不涉及逻辑变更，不应引发任何测试回归）。

---

- [ ] **Step 7: 提交**

```bash
cd /Users/cooper/Documents/code/MemoryCapsule
git add app/src/components/FABMenu.tsx
git commit -m "feat: FABMenu — hide tip on fan open, larger petal buttons at greater distance"
```
