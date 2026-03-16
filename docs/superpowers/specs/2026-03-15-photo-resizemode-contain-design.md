# 照片卡片 resizeMode 修复 — 设计文档

**日期：** 2026-03-15
**状态：** 已确认

## 背景

Timeline 照片卡片当前使用 `resizeMode="cover"`，会将图片裁剪以填满容器。竖向照片（如 3:4 比例）在此模式下会被大幅裁剪，用户无法在 Timeline 中看到完整构图，只能通过点开查看器才能看全图。

## 目标

- 照片在卡片中完整显示，不裁剪
- 竖向照片自动缩小以适配高度上限，上下出现少量灰色留白；横向照片则两侧出现留白
- 高度上限（compact/default/large）语义不变，仍由 `PhotoHeightPreset` 控制

## 架构

### 改动范围

单文件单行改动：

**`app/src/components/EntryCard.tsx`**

将 `<Image>` 组件的 `resizeMode` 属性从 `"cover"` 改为 `"contain"`。

### 效果对比

| 模式 | 行为 |
|------|------|
| `cover`（当前）| 裁剪图片以填满容器，无留白 |
| `contain`（修复后）| 等比缩放以完整显示图片，超出高度上限时缩小；竖向照片留白在上下，横向照片留白在两侧（留白色为 `#F5F5F5`，来自已有样式）|

### 高度上限语义变化

- **修改前**：高度上限 = 容器裁剪高度（图片总被裁满）
- **修改后**：高度上限 = 图片最大显示高度（等比缩放，不裁剪）

`PHOTO_HEIGHT_VALUES`（compact 200 / default 280 / large 400）数值不变，仅语义从"裁剪限制"变为"显示高度上限"。

## 受影响文件

| 文件 | 改动类型 |
|------|---------|
| `app/src/components/EntryCard.tsx` | 单行修改：`resizeMode="cover"` → `resizeMode="contain"` |

## 不在范围内

- `PhotoHeightPreset` 数值调整
- `calculateImageHeight` 逻辑变更
- `minHeight` 样式调整（`cover` 时设置的 `minHeight: 200` 已在上一版本移除）
- ImageViewer 全屏查看器任何改动
- 横向照片的特殊处理
