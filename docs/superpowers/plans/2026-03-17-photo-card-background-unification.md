# 图片卡片背景统一 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `EntryCard` 中图片卡片的背景从当前明显偏青的大底色收敛为中性底，同时把图片区域背景统一成中性浅灰，避免图片内容与卡片背景相互抢视觉。

**Architecture:** 仅修改 `EntryCard.tsx` 中与 `photo` 类型相关的颜色映射和 `photoImage` 默认背景色，不改结构、不改 `ImageViewer`、不改时间线外层。测试以样式回归为主，锁定 `photo` 类型的卡片底色、按下态底色和图片区域背景色。

**Tech Stack:** React Native, Jest, @testing-library/react-native, TypeScript

---

## File Structure

| 操作 | 文件 | 职责 |
|---|---|---|
| 改 | `app/src/components/EntryCard.tsx` | 收敛图片卡片背景与图片区域背景 |
| 改 | `app/src/components/__tests__/EntryCard.missing-media.test.tsx` | 补图片卡片背景相关样式断言 |

---

## Chunk 1: 先补失败测试

### Task 1: 为图片卡片背景统一补回归测试

**Files:**
- Modify: `app/src/components/__tests__/EntryCard.missing-media.test.tsx`

- [ ] **Step 1: 为 `photo` 卡片默认背景写失败测试**

新增一个测试，渲染 `photoEntry` 后断言：

```ts
expect(getByTestId('entry-card-container')).toHaveStyle({
  backgroundColor: '<新的中性色>',
});
```

这里的目标是锁定图片卡片不再使用当前偏青的大底色。

- [ ] **Step 2: 为 `photo` 卡片按下态背景写失败测试**

对 `entry-card` 触发 `pressIn`，断言：

```ts
expect(getByTestId('entry-card-container')).toHaveStyle({
  backgroundColor: '<新的按下态中性色>',
});
```

再触发 `pressOut`，确认回到默认背景。

- [ ] **Step 3: 为 `photoImage` 默认背景写失败测试**

断言 `photo-image` 的 style 包含新的中性浅灰背景：

```ts
expect(getByTestId('photo-image')).toHaveStyle({
  backgroundColor: '<新的图片区背景色>',
});
```

- [ ] **Step 4: 运行测试确认失败**

Run:

```bash
cd app && npx jest src/components/__tests__/EntryCard.missing-media.test.tsx --no-coverage
```

Expected:
- FAIL
- 原因是当前 `photo` 卡片仍使用淡青底色

---

## Chunk 2: 最小实现

### Task 2: 收敛 `EntryCard` 的图片卡片背景

**Files:**
- Modify: `app/src/components/EntryCard.tsx`

- [ ] **Step 1: 调整 `getCardBgColor()` 的 `photo` 分支**

将当前 `photo` 的卡片底色从淡青收敛为更中性的浅暖灰 / 米白色。

要求：

- 与文字卡、语音卡并排时更统一
- 但不要直接改成纯白

- [ ] **Step 2: 调整 `getCardPressedColor()` 的 `photo` 分支**

将 `photo` 的按下态改为默认中性色再深一档。

要求：

- 保留按下反馈
- 不重新引入明显青色倾向

- [ ] **Step 3: 调整 `photoImage` 的默认背景色**

将 `photoImage.backgroundColor` 改为统一的中性浅灰，用于：

- 图片加载前底色
- `contain` 模式的四周留白
- 缺图占位背景的一致性

- [ ] **Step 4: 不改以下内容**

明确保持不变：

- 图片高度计算
- `photoMissing` 结构
- 图片点击打开查看器逻辑
- 文字卡、语音卡背景映射

- [ ] **Step 5: 运行测试确认通过**

Run:

```bash
cd app && npx jest src/components/__tests__/EntryCard.missing-media.test.tsx --no-coverage
```

Expected:
- PASS

---

## Chunk 3: 最终验证

### Task 3: 回归验证

**Files:**
- No file changes required

- [ ] **Step 1: 运行相关测试**

Run:

```bash
cd app && npx jest src/components/__tests__/EntryCard.missing-media.test.tsx src/components/__tests__/EntryCard.test.tsx --no-coverage
```

Expected:
- PASS

- [ ] **Step 2: 运行全量测试**

Run:

```bash
cd app && npx jest --no-coverage
```

Expected:
- PASS

- [ ] **Step 3: 运行类型检查**

Run:

```bash
cd app && npx tsc --noEmit
```

Expected:
- 无 TypeScript 错误

- [ ] **Step 4: 人工视觉核对**

在真机或模拟器上确认：

1. 图片卡片不再整块偏青
2. 图片内容仍然是视觉主角
3. 图片缺失占位和说明文字区没有变脏

---

## Notes for Executor

- 这轮只做颜色映射收敛，不新增装饰元素。
- 如果需要引入具体颜色值，优先选择和现有卡片体系一致的中性浅暖灰，而不是全白或新彩色。
- 不要顺手改时间线背景、ImageViewer 或卡片圆角/阴影。
