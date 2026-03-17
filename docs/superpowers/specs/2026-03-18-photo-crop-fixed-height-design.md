# 照片卡片裁剪显示设计

**日期**: 2026-03-18
**状态**: 已批准

## 问题

当前照片卡片使用 `resizeMode="contain"`，图片按宽高比动态计算高度（最高不超过档位值）。竖版照片高度差异大，Timeline 视觉不一致；图片两侧可能有留白，不够饱满。

## 设计决策

图片使用固定高度 + 居中裁剪，所有照片在 Timeline 中保持一致的显示高度，视觉整齐。

### 变更范围

**仅修改 `app/src/components/EntryCard.tsx`**，不涉及数据模型、存储、设置。

---

## 具体改动

### 1. 移除 `calculateImageHeight` 和 `getPhotoCardWidth`

这两个函数仅用于图片渲染处的高度计算，改为固定高度后不再需要，直接删除。

> 原函数定义约在第 47–61 行：
> ```ts
> const getPhotoCardWidth = () => SCREEN_WIDTH - 88;
> const calculateImageHeight = (...) => ...;
> ```

### 2. 图片高度改为固定值

原渲染（约第 499–503 行）：
```tsx
style={[
  styles.photoImage,
  photoImageRadius,
  { height: calculateImageHeight(entry.media?.metadata?.aspectRatio, maxPhotoHeight, getPhotoCardWidth()) }
]}
resizeMode="contain"
```

改为：
```tsx
style={[
  styles.photoImage,
  photoImageRadius,
  { height: maxPhotoHeight }
]}
resizeMode="cover"
```

`maxPhotoHeight` 已由 `PHOTO_HEIGHT_VALUES[photoHeight]` 定义（约第 90 行），无需新增变量。

### 3. `photoImage` 样式加 `overflow: 'hidden'`

`resizeMode="cover"` 需要容器裁剪溢出内容：

```ts
photoImage: {
  width: '100%',
  backgroundColor: '#ECE7E0',
  overflow: 'hidden',
},
```

### 4. `photoMissing` 占位 View 加固定高度内联样式

`photoMissing` 当前由 `styles.photoMissing` 的 `minHeight: 200` 控制高度，与档位设置无关。需同步改为跟随 `maxPhotoHeight`：

```tsx
<View style={[styles.photoImage, styles.photoMissing, photoImageRadius, { height: maxPhotoHeight }]}>
```

---

## 不变的部分

- `PhotoHeightPreset`（`compact / default / large`）和 `PHOTO_HEIGHT_VALUES`（`200 / 280 / 400`）保持不变
- `photoHeight` 设置和 UI 保持不变
- 动态圆角（`hasPhotoFooter` / `photoImageRadius`）逻辑保持不变
- edge-to-edge 宽度（`contentPhoto: { padding: 0, gap: 0 }`）保持不变

---

## 测试要求

| 场景 | 预期行为 |
|------|---------|
| compact 档位 | 图片高度为 200px，`resizeMode="cover"` |
| default 档位 | 图片高度为 280px，`resizeMode="cover"` |
| large 档位 | 图片高度为 400px，`resizeMode="cover"` |
| photoError 状态 | 占位 View 高度同样使用 `maxPhotoHeight` |
| 现有测试 | 全部通过，无回归 |
