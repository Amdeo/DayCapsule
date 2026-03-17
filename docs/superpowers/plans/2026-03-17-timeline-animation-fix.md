# Timeline 动画与连线修复实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复列表/按月视图切换时卡片弹簧跳动和按月模式圆点连线断裂两个问题。

**Architecture:** 仅修改 `Timeline.v2.tsx`：将 `EntryMarker` 的弹簧动画改为固定时长过渡，去掉背景竖线的列表模式限制。

**Tech Stack:** React Native, react-native-reanimated (`FadeIn`, `LinearTransition`)

---

## Chunk 1: 修复动画跳动与连线断裂

### Task 1: 应用两处修复并验收

**Files:**
- Modify: `app/src/components/Timeline.v2.tsx`（第 291、293、578 行）

---

- [ ] **Step 1: 确认基线测试通过**

```bash
cd app && npx jest --passWithNoTests 2>&1 | tail -5
```

预期：所有测试通过。

- [ ] **Step 2: 修复 `FadeIn` 动画（第 291 行）**

定位 `EntryMarker` 的 `Animated.View`，将：
```tsx
entering={FadeIn.springify()}
```
改为：
```tsx
entering={FadeIn.duration(200)}
```

- [ ] **Step 3: 修复 `LinearTransition` 动画（第 293 行）**

紧接上一行，将：
```tsx
layout={LinearTransition.springify()}
```
改为：
```tsx
layout={LinearTransition.duration(200)}
```

- [ ] **Step 4: 修复按月模式连线断裂（第 578 行）**

定位主渲染区背景竖线，将：
```tsx
{viewMode === 'list' && <View
  style={{
    position: 'absolute',
    left: timelineLeft,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#E5E5E5',
    zIndex: 0,
  }}
/>}
```
改为：
```tsx
<View
  style={{
    position: 'absolute',
    left: timelineLeft,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#E5E5E5',
    zIndex: 0,
  }}
/>
```

- [ ] **Step 5: TypeScript 检查**

```bash
cd app && npx tsc --noEmit 2>&1 | head -10
```

预期：0 个错误。

- [ ] **Step 6: 运行测试**

```bash
cd app && npx jest --passWithNoTests 2>&1 | tail -5
```

预期：所有测试通过。

- [ ] **Step 7: 提交**

```bash
cd app && git add src/components/Timeline.v2.tsx && git commit -m "fix: replace spring animations with duration and show timeline line in monthly mode"
```
