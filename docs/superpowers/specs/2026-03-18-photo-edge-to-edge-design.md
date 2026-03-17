# 照片卡片 Edge-to-Edge 显示设计

**日期**: 2026-03-18
**状态**: 已批准
**阶段**: 阶段一（单张照片）

## 问题

当前照片卡片图片受 `content` 样式的 `padding: 20` 限制，图片两侧各有 20px 空白，无法充满卡片宽度，视觉上不够饱满。

## 设计决策

图片去除左右边距，铺满卡片完整宽度（edge-to-edge），并根据是否有说明文字动态调整圆角。

### 变更范围

**仅修改 `app/src/components/EntryCard.tsx`**，不涉及数据模型、存储。

---

### 具体改动

#### 1. 新增 `getPhotoCardWidth` 函数

`EntryMarker`（`Timeline.v2.tsx` 第 293 行）的容器为 `paddingLeft: 64, paddingRight: 24`，
卡片宽度 = `SCREEN_WIDTH - 64 - 24 = SCREEN_WIDTH - 88`。

在文件顶部紧接 `getCardContentWidth` 之后新增：

```ts
// 照片卡片图片宽度：屏幕宽 - EntryMarker 左右 padding(64+24)
const getPhotoCardWidth = () => SCREEN_WIDTH - 88;
```

#### 2. `calculateImageHeight` 增加 `contentWidth` 可选参数

`calculateImageHeight` 目前只在 EntryCard 中为照片类型调用一次。
修改函数签名，新增可选第三参数（默认值保持 `getCardContentWidth()` 以向后兼容）：

```ts
const calculateImageHeight = (
  aspectRatio: number | undefined,
  maxHeight: number,
  contentWidth: number = getCardContentWidth()
): number => {
  if (!aspectRatio || aspectRatio <= 0) return Math.min(200, maxHeight);
  return Math.min(contentWidth / aspectRatio, maxHeight);
};
```

照片类型的调用处（当前约第 486 行）改为显式传入第三参数：

```tsx
{ height: calculateImageHeight(entry.media?.metadata?.aspectRatio, maxPhotoHeight, getPhotoCardWidth()) }
```

#### 3. `hasPhotoFooter` 变量

在 `EntryCard` 函数体内（photo 渲染逻辑之前）定义：

```ts
// 照片卡片是否有底部内容（决定图片圆角）
const hasPhotoFooter = entry.type === 'photo'
  ? !!(entry.content || (entry.tags && entry.tags.length > 0))
  : false;
```

#### 4. 动态圆角（内联样式）

React Native StyleSheet 不支持动态值，圆角使用**内联样式**叠加在 `styles.photoImage` 上。
圆角值 `10` 与卡片 `borderRadius: 10` 一致（`photoImage` 原有的固定 `borderRadius: 12` 在第 6 步中移除，
改为此处的动态 `10`，是有意修正以匹配当前卡片圆角）：

```ts
const photoImageRadius = hasPhotoFooter
  ? { borderRadius: 10, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }
  : { borderRadius: 10 };
```

**图片正常时（Image 组件）：**

```tsx
<Image
  style={[
    styles.photoImage,
    photoImageRadius,
    { height: calculateImageHeight(entry.media?.metadata?.aspectRatio, maxPhotoHeight, getPhotoCardWidth()) }
  ]}
  resizeMode="contain"
  ...
/>
```

**图片丢失时（`photoError === true`）：**

```tsx
<View style={[styles.photoImage, styles.photoMissing, photoImageRadius]}>
  ...
</View>
```

#### 5. `contentPhoto` 样式

覆盖 `content` 的 `padding: 20` 和 `gap: 12`，改为零（由各子元素自身 padding 控制间距）：

```ts
contentPhoto: {
  padding: 0,
  gap: 0,
},
```

#### 6. `photoImage` 样式

移除固定 `borderRadius: 12`（改为动态内联），移除 `marginTop`，保留其他：

```ts
photoImage: {
  width: '100%',
  backgroundColor: '#ECE7E0',
},
```

#### 7. `photoCaption` 样式

完整替换，加回水平内边距，移除原有 `marginTop: 8`（改用 `paddingTop`）：

```ts
photoCaption: {
  paddingHorizontal: 14,
  paddingTop: 8,
  paddingBottom: 8,
  fontSize: 14,
  lineHeight: 20,
  color: '#525252',
},
```

#### 8. 新增 `photoTagsContainer` 样式

用于照片卡片的 tags，区别于通用的 `tagsContainer`：

```ts
photoTagsContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 6,
  paddingHorizontal: 14,
  paddingTop: 0,
  paddingBottom: 12,
},
```

Tags 渲染处（位于所有类型卡片共用的底部区域，不在 type 分支内），根据类型选择容器样式：

```tsx
<View style={entry.type === 'photo' ? styles.photoTagsContainer : styles.tagsContainer}>
  {/* tags */}
</View>
```

**caption + tags 间距**：caption 有 `paddingBottom: 8`，photoTagsContainer 有 `paddingTop: 0`，两者合计 8px 间距。

---

## 测试要求

| 场景 | 预期行为 |
|------|---------|
| 纯图片（无 caption、无 tags） | `hasPhotoFooter=false`，四角圆角 10，图片充满卡片宽度 |
| 有 caption | `hasPhotoFooter=true`，图片顶圆底直，caption paddingH=14，paddingTop=8 |
| 有 tags（无 caption） | `hasPhotoFooter=true`，图片顶圆底直，tags paddingH=14，paddingBottom=12 |
| 有 caption + tags | `hasPhotoFooter=true`，图片顶圆底直，caption paddingBottom=8，tags paddingBottom=12 |
| 图片丢失（photoError） | 同圆角规则，占位 View 应用 `photoImageRadius` |
| 非照片类型（text/voice）的 tags | 继续使用 `tagsContainer`，不受影响 |
| 宽高比计算 | 使用 `getPhotoCardWidth()` = `SCREEN_WIDTH - 88`，高度计算准确 |
| 现有单元测试 | 全部通过，无回归 |
