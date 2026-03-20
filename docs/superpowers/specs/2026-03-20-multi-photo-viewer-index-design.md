# 设计文档：多图片卡片点击打开对应图片

**日期：** 2026-03-20
**状态：** 已批准
**影响文件：** `app/src/components/EntryCard.tsx`、`app/src/components/__tests__/EntryCard.test.tsx`

---

## 背景

当前多图片卡片已经支持网格展示，但点击任意一张缩略图时，`EntryCard` 都固定把第一张图片的 URI 传给 `ImageViewer`。

这导致：

- 普通时间线中的多图卡片，点任意图片都只会查看第一张
- 日历视图中的多图卡片，也存在同样问题

问题本质不是图片查看器渲染错误，而是卡片层在点击链路中丢失了被点击图片的索引。

---

## 目标

修复多图片卡片的点击行为，保证：

1. 用户点击第几张图片，就打开第几张图片
2. 普通时间线与日历视图行为一致
3. 不扩大 `ImageViewer` 接口，不顺带引入多图左右切换能力

---

## 非目标

本轮不做以下事项：

- 不把 `ImageViewer` 升级为多图查看器
- 不增加左右滑动切图
- 不修改 `ImageViewer` 的动画、手势和关闭逻辑
- 不调整 `PhotoGrid` 的布局规则和视觉样式

---

## 方案对比

### 方案一：在 `EntryCard` 内维护当前选中索引（推荐）

在 `EntryCard` 内新增 `selectedImageIndex` 状态；点击缩略图时记录索引，并将 `entry.media[selectedImageIndex]` 的 URI 传给 `ImageViewer`。

**优点：**

- 改动最小，直接命中当前 bug
- 不需要扩大 `ImageViewer` 接口
- 回归面小，普通视图和日历视图都能统一处理

**缺点：**

- 未来如果要做查看器内左右切图，还需要再扩接口

### 方案二：`ImageViewer` 接收 `images + initialIndex`

把查看器接口改为接收整组图片和初始索引，但本轮仍然只显示单张。

**优点：**

- 为未来多图查看器预铺接口

**缺点：**

- 这次只是修点击 bug，却会顺带放大组件边界
- 测试面和兼容面都会增加

### 方案三：直接升级为多图查看器

让 `ImageViewer` 直接支持初始索引和左右切图。

**优点：**

- 一步到位

**缺点：**

- 明显超出当前问题范围
- 会带来更高的行为回归风险

### 结论

采用**方案一**。  
索引问题在卡片层修复，`ImageViewer` 保持单图查看器定位不变。

---

## 最终方案

### 1. 状态设计

在 `EntryCard` 内新增局部状态：

```ts
const [selectedImageIndex, setSelectedImageIndex] = useState(0);
```

职责：

- 记录本次打开查看器前用户点击的是第几张图片
- 为 `ImageViewer` 提供当前应展示的图片 URI

### 2. 点击入口统一

新增统一入口：

```ts
const handleImagePress = (index: number) => {
  setSelectedImageIndex(index);
  setShowImageViewer(true);
};
```

所有图片点击入口都收敛到这里：

- 普通时间线中的 `PhotoGrid`
- 日历视图中的单图点击
- 日历视图中的多图点击

### 3. 查看器入参

`ImageViewer` 继续保持单图接口：

```tsx
<ImageViewer
  visible={showImageViewer}
  imageUri={entry.media[selectedImageIndex]?.uri ?? entry.media[0].uri}
  onClose={() => setShowImageViewer(false)}
/>
```

这里使用回退逻辑：

- 优先显示 `selectedImageIndex` 对应图片
- 若索引越界，回退到第一张图，避免空 URI

### 4. 日历视图处理

日历视图当前单图和多图布局都写在 `EntryCard` 内部，点击行为需要显式改成按实际图片位置传索引：

- 主图传 `0`
- 第二张传 `1`
- 第三张传 `2`

如果有溢出遮罩，仍然以被点击的那个实际缩略图索引为准，不额外引入“点击溢出后打开网格模式”。

---

## 影响范围

### `app/src/components/EntryCard.tsx`

需要完成：

- 新增 `selectedImageIndex` 状态
- 新增统一的 `handleImagePress(index)` 方法
- 将普通时间线 `PhotoGrid` 的 `onPhotoPress` 改为透传索引
- 将日历单图/多图的点击入口改为传对应索引
- 将 `ImageViewer.imageUri` 从固定第一张图改为按索引取值

### `app/src/components/__tests__/EntryCard.test.tsx`

需要补充：

- 普通多图卡片点击第二张图时，`ImageViewer` 收到第二张图 URI
- 日历多图卡片点击侧图时，`ImageViewer` 收到对应 URI

---

## 错误处理

### 索引越界

若 `selectedImageIndex` 指向的数据不存在，统一降级到第一张图片：

```ts
entry.media[selectedImageIndex]?.uri ?? entry.media[0].uri
```

### 关闭查看器后的状态

关闭查看器时不强制重置 `selectedImageIndex`。

原因：

- 下次用户点击图片时，该值会被新的点击覆盖
- 无需额外状态清理逻辑
- 减少一次无意义 state 更新

---

## 验收标准

满足以下条件视为完成：

1. 普通时间线中的多图卡片，点击任意缩略图后，查看器显示对应图片
2. 日历视图中的多图卡片，点击任意可见缩略图后，查看器显示对应图片
3. 单图卡片行为不变
4. `ImageViewer` 组件接口不新增 `images`、`initialIndex` 等多图字段
5. 相关测试通过，且现有 `EntryCard` 测试无回归

---

## 评审记录

### 2026-03-20 第一轮评审

结论：通过

检查项：

- 方案是否精确命中“点击索引丢失”的根因：通过
- 是否控制在卡片层修复，不放大 `ImageViewer` 边界：通过
- 是否覆盖普通时间线和日历视图两个入口：通过
- 是否有明确降级逻辑和测试要求：通过

备注：

- 本轮按当前会话约束采用本地留痕评审，未启用子代理评审流程
