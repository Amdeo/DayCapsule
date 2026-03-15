# 照片卡片 resizeMode Contain 修复 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `EntryCard.tsx` 中照片 `<Image>` 的 `resizeMode` 从 `"cover"` 改为 `"contain"`，使照片在 Timeline 卡片中完整显示，不裁剪。

**Architecture:** 单文件单行改动。`resizeMode="contain"` 让图片在已有的高度容器内等比缩放，超出高度上限时自动缩小；竖向照片留白出现在上下（背景色 `#F5F5F5`），横向照片留白在两侧。`calculateImageHeight` 和 `PhotoHeightPreset` 无需改动。

**Tech Stack:** React Native, Expo SDK 54, TypeScript

---

## Chunk 1: 修改 resizeMode

### Task 1: 将 resizeMode 从 cover 改为 contain

**Files:**
- Modify: `app/src/components/EntryCard.tsx:356`

---

- [ ] **Step 1: 确认当前代码**

```bash
cd app && grep -n 'resizeMode' src/components/EntryCard.tsx
```

预期输出：
```
356:                    resizeMode="cover"
```

- [ ] **Step 2: 修改 resizeMode**

将 `app/src/components/EntryCard.tsx` 第 356 行：

```tsx
resizeMode="cover"
```

改为：

```tsx
resizeMode="contain"
```

- [ ] **Step 3: TypeScript 类型检查**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

预期：零错误。

- [ ] **Step 4: 运行测试套件，确认无回归**

```bash
cd app && npx jest --no-coverage 2>&1 | tail -10
```

预期：所有测试通过（75 个），无新增失败。

- [ ] **Step 5: 提交**

```bash
git add app/src/components/EntryCard.tsx
git commit -m "fix: use resizeMode contain so photos display without cropping in timeline"
```

---

### 验收标准（手动测试）

在模拟器中：

1. 打开 Timeline，查看竖向照片卡片 → 图片完整显示，顶部/底部有少量灰色留白，无裁剪
2. 查看横向照片卡片 → 图片完整显示，左右有少量灰色留白
3. 点击照片 → ImageViewer 全屏查看正常（不受影响）
4. 切换高度设置（紧凑/默认/宽松）→ 高度上限正常生效，图片等比缩放适配
