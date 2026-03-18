# 常用标签快速选择 — 设计文档

**日期**: 2026-03-18
**状态**: 已批准

---

## 概述

在编辑器（TextEditor / EntryEditor）和搜索筛选界面（SearchOverlay）中，展示一组用户自定义的常用标签供快速点选，减少手动输入标签的摩擦。

---

## 决策记录

| 问题 | 决策 |
|------|------|
| 功能入口 | 编辑器 + 搜索筛选界面，两处均显示 |
| 编辑器布局 | 常用标签 chip 网格在前，保留原有文字输入框 |
| 常用标签编辑入口 | 设置页 → 标签管理（独立页面） |
| 编辑器显示内容 | 只显示用户在设置中配置的常用标签 |
| 新用户默认值 | 内置 12 个默认标签（工作、学习、健康、心情、朋友、家人、美食、旅行、思考、娱乐、购物、天气） |

---

## 架构

### 数据层：`useCommonTags` hook

**文件**: `app/src/hooks/useCommonTags.ts`

使用 MMKV（key: `common_tags`）存储用户的常用标签列表（JSON 字符串数组）。

```ts
const DEFAULT_COMMON_TAGS = [
  '工作', '学习', '健康', '心情', '朋友',
  '家人', '美食', '旅行', '思考', '娱乐', '购物', '天气'
];
```

对外暴露接口：
- `commonTags: string[]` — 当前常用标签列表
- `addCommonTag(tag: string): void` — 新增一个常用标签（去重）
- `removeCommonTag(tag: string): void` — 删除一个常用标签
- `resetToDefaults(): void` — 恢复默认 12 个标签

首次读取时若 MMKV 无值，自动写入并返回默认列表。

---

## 新增文件

### `TagManagementPage` 组件

**文件**: `app/src/components/TagManagementPage.tsx`

复用现有 `DetailPageShell` 模式（与 `BackupPage`、`AboutPage` 一致）。

页面结构：
- 顶部 header：标题「标签管理」+ 关闭按钮
- 「恢复默认」操作行（带确认 Alert）
- 已有常用标签列表：每行显示标签名 + 右侧删除按钮（红色）
- 底部输入区：TextInput + 「添加」按钮，回车或点击添加新标签（去重、去空）

---

## 修改文件

### `SettingsPage.tsx`

在「其他设置」区域新增一个 `SettingButton` 行：

```
常用标签管理    恢复默认 / 自定义常用标签    ›
```

点击后显示 `TagManagementPage`（内部 `useState` 控制 visible）。

---

### `TextEditor.tsx` / `EntryEditor.tsx`

在标签 `<View style={styles.section}>` 内，文字输入框**之前**插入常用标签 chip 网格：

**布局结构**：
```
[标签 label]
[常用 chip 1] [常用 chip 2] ...   ← 已选中的高亮为紫色
──────────────────────────────
[TextInput：或手动输入标签]
[tagsPreview chips]               ← 原有逻辑保留
[建议: ＋xxx] [＋yyy]             ← 原有关键词建议保留
```

**交互逻辑**：
- 点击未选中的 chip → 调用 `handleAddSuggestion(tag)`（与关键词建议相同逻辑，追加到 `tagsInput`）
- 点击已选中的 chip → 调用 `handleRemoveTag(tag)`，从 `tagsInput` 中移除该标签
- chip 选中状态 = 该标签是否在当前 `tagsInput` 解析出的标签数组中

**`handleRemoveTag` 实现**（需在两个编辑器中新增）：
```ts
const handleRemoveTag = useCallback((tag: string) => {
  setTagsInput((prev) => {
    const parts = prev.split(',').map((t) => t.trim()).filter(Boolean);
    return parts.filter((t) => t !== tag).join(', ');
  });
}, []);
```

**常用 chip 视觉规范**：
- 未选中：背景 `#F5F3FF`，边框 `#E0DAFA`，文字 `#6A5ACD`（紫色调，区别于关键词建议的蓝色 `#6A89CC`）
- 已选中：背景 `#A491D3`，文字 `#FFFFFF`（与 `SearchOverlay` 中的 `tagChipActive` 一致）
- `tagsPreview` chip 保持原有样式不变，两者因颜色差异可区分

---

### `SearchOverlay.tsx`

在标签筛选区，将常用标签与已有标签合并展示：

**规则**：
1. 计算合并列表：`allTagsList`（已使用标签）+ 常用标签中不在 `allTagsList` 里的部分
2. 若合并列表为空（无已使用标签且常用标签也为空），显示原有空状态提示「暂无标签，在编辑记录时添加」
3. 若合并列表非空，先展示 `allTagsList`（正常深色样式），再展示追加的常用标签（浅色/灰色，与已使用标签视觉区分）
4. 两类标签均可点击，切换选中状态，行为与现有逻辑一致

> **注**：由于默认有 12 个常用标签兜底，实际上空状态几乎不会出现，但逻辑上需要保留该判断。

---

## 文件变更汇总

| 文件 | 类型 | 说明 |
|------|------|------|
| `src/hooks/useCommonTags.ts` | 新建 | MMKV 读写 hook |
| `src/components/TagManagementPage.tsx` | 新建 | 标签管理页 |
| `src/components/SettingsPage.tsx` | 修改 | 新增「常用标签管理」入口行 |
| `src/components/TextEditor.tsx` | 修改 | 标签区新增 chip 网格 |
| `src/components/EntryEditor.tsx` | 修改 | 同上 |
| `src/components/SearchOverlay.tsx` | 修改 | 标签筛选区追加常用标签 |

---

## 边界情况

### `resetSettings()` 与 `resetToDefaults()` 的关系

`settingsStore.resetSettings()` 重置所有设置项（通知、卡片间距等），**不触发** `resetToDefaults()`。常用标签作为独立的用户偏好，与其他设置解耦，需用户主动在「标签管理」页点击「恢复默认」才会重置。

### 常用标签数量上限

最多允许 **20 个**常用标签。`TagManagementPage` 中超出上限时「添加」按钮置灰，并显示提示文字「最多 20 个常用标签」。

### `SettingsPage` 中的入口

`TagManagementPage` 通过 `SettingsPage` 内部的 `useState<boolean>` 控制显示，不依赖外部路由跳转，与设置页自身的打开方式保持一致。

---

## 不在本次范围内

- 标签排序（拖拽调整顺序）
- 标签分类分组
- 基于使用频率自动推荐常用标签
- `resetSettings()` 联动重置常用标签
