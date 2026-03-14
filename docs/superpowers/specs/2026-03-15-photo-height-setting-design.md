# 照片卡片高度设置 — 设计文档

**日期：** 2026-03-15
**状态：** 已确认

## 背景

Timeline 中照片卡片的图片最大高度当前硬编码为 600dp，手机拍摄的竖向照片（如 3:4 比例）在宽约 350dp 的屏幕上会算出接近 600dp 的高度，严重占用屏幕空间，影响浏览体验。

## 目标

- 将照片卡片最大高度从硬编码改为用户可配置的设置项
- 默认值降低到 280dp，更适合 Timeline 浏览场景
- 设置 UI 采用可视化预设卡片，让用户看到效果再选择

## 架构

### 数据层 — `app/src/store/settingsStore.ts`

新增类型和值映射（完全仿照现有 `CardSpacing` 模式）：

```ts
export type PhotoHeightPreset = 'compact' | 'default' | 'large';

export const PHOTO_HEIGHT_VALUES: Record<PhotoHeightPreset, number> = {
  compact: 200,
  default: 280,
  large:   400,
};
```

新增 MMKV key：
```ts
photoHeight: 'settings:photoHeight',
```

新增默认值：
```ts
photoHeight: 'default' as PhotoHeightPreset,
```

`SettingsState` 新增字段：
```ts
photoHeight: PhotoHeightPreset;
setPhotoHeight: (value: PhotoHeightPreset) => Promise<void>;
```

更新 `loadSettings`：读取并验证 `photoHeight`（合法值：`'compact' | 'default' | 'large'`，否则回退 `'default'`）。

更新 `resetSettings`：删除 `photoHeight` key 并重置为默认值。

### UI 层 — `app/src/components/SettingsPage.tsx`

新增 `PhotoHeightSelector` 组件，位于「卡片间距」设置行附近（同属显示分组）。

UI 形式：三个横排可点击卡片，每个包含：
- 按比例缩放的渐变色块（视觉上体现高度差异，不依赖真实图片）
- 标签文字：紧凑 / 默认 / 宽松
- 选中态：`#77C9D4` 边框 + 淡青背景

样式命名使用 `phStyles`，避免与现有 `csStyles` 冲突。

从 `settingsStore` 导入 `PhotoHeightPreset`、`PHOTO_HEIGHT_VALUES` 并 re-export。

### 渲染层 — `app/src/components/EntryCard.tsx`

1. 从 `useSettingsStore` 读取 `photoHeight`
2. `calculateImageHeight` 将最大值从硬编码 `600` 改为 `PHOTO_HEIGHT_VALUES[photoHeight]`
3. `<Image>` 的 `resizeMode` 从 `"contain"` 改为 `"cover"`
4. 移除 `photoImage` 样式中的 `minHeight: 200`（cover 模式自动填充，不需要 minHeight）

## 受影响文件

| 文件 | 改动类型 |
|------|---------|
| `app/src/store/settingsStore.ts` | 新增类型、值映射、状态字段、action、MMKV key |
| `app/src/components/SettingsPage.tsx` | 新增 `PhotoHeightSelector` 组件及样式 |
| `app/src/components/EntryCard.tsx` | 读取设置、更新高度逻辑、resizeMode |

## 不在范围内

- 滑条式自定义输入（预设三档已满足需求）
- 针对单张图片的高度覆盖
- ImageViewer 全屏查看器的任何改动

## 默认值

`'default'` → 280dp，兼顾清晰度和 Timeline 浏览节奏。
