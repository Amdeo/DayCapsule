# 文字记录详情页 + 编辑页重设计

## Context

当前文字记录的详情页（`TextEntryDetailPage`）和编辑页（`EntryEditor`）是两个独立的全屏 Modal，体验割裂：用户需要在详情页点击"编辑"后再进入一个新的全屏 Modal。`EntryEditor` 的标签区（固定在底部的 TagDock）风格与刚重设计的 `TextEditor`（添加页）不一致。

新方案采用**全屏详情 + 内联切换编辑**模式，参考 Notion/Day One/Bear 的设计，将详情和编辑合并在同一个全屏页面内通过状态切换，编辑区标签组件直接复用 `TagArea`。

## 设计方案

### 视觉风格

与现有 TextEditor（添加页）保持一致：
- 背景色：`#FAF8F5`（暖色）
- 内容区卡片：`#FFFCF7`（阅读）/ `#FFFDF9`（编辑，与 TextEditor 一致）
- 标签：复用 `TagArea` 组件

### 状态机

```
TextEntryDetailPage
  ├── isEditing = false  →  阅读模式
  └── isEditing = true   →  编辑模式
```

### 阅读模式布局

```
┌─────────────────────────────┐
│  ← 返回   📝 文字记录         │  Header（顶部 SafeArea）
├─────────────────────────────┤
│                             │
│  ┌─────────────────────┐    │
│  │  内容正文（只读）     │    │  ScrollView
│  └─────────────────────┘    │
│                             │
│  #工作  #思考                │  标签（只读 chip）
│                             │
│  2026年4月5日 · 14:30       │  元数据
│  （最近编辑：...）            │
│                             │
├─────────────────────────────┤
│  [      ✏ 编辑          ]   │  固定底部栏（蓝色按钮）
└─────────────────────────────┘
```

### 编辑模式布局

```
┌─────────────────────────────┐
│  取消   📝 编辑   保存       │  Header（切换）
├─────────────────────────────┤
│                             │
│  ┌─────────────────────┐    │
│  │  TextInput（可编辑） │    │  ScrollView
│  │  autoFocus          │    │
│  └─────────────────────┘    │
│                             │
│  🏷 [工作✓][思考✓][学习][展开▾]│  TagArea（复用，工具栏）
│                             │
│  2026年4月5日 · 14:30 创建  │  元数据（只读）
│                             │
├─────────────────────────────┤
│  [取消]  [      保存修改   ] │  固定底部栏（双按钮）
└─────────────────────────────┘
```

## 实现细节

### 1. TextEntryDetailPage 新增 isEditing 状态

`useTextEntryDetailPageController` 增加：
- `isEditing: boolean`
- `editContent: string`
- `editTagsInput: string`
- `editCurrentTagsList: string[]`
- `editSuggestions: string[]`
- `tagPanelExpanded: boolean`
- `handleStartEdit()` — 进入编辑，初始化 editContent/editTagsInput
- `handleCancelEdit()` — 脏检查，有改动则弹确认框，否则直接退出编辑模式
- `handleSaveEdit()` — 调用 `onSave(entry.id, editContent, editTags)`，成功后退出编辑模式
- `handleAddTag(tag)` / `handleRemoveTag(tag)` / `toggleTagPanel()`
- 复用 `tagSuggestionService` 的 300ms 防抖建议

### 2. TextEntryDetailPage 组件结构

```
TextEntryDetailPage
  └── DetailPageShell（保留右滑动画）
        ├── Header（动态渲染：阅读/编辑两套）
        ├── ScrollView
        │     ├── [阅读] 只读内容卡片（View + Text）
        │     │   or
        │     │   [编辑] 可编辑内容卡片（View + TextInput）
        │     ├── [阅读] 只读标签 chips
        │     │   or
        │     │   [编辑] <TagArea />（复用组件）
        │     └── 元数据（创建时间、编辑时间）
        └── 固定底部栏
              ├── [阅读] 单个「编辑」按钮
              └── [编辑] 「取消」+「保存修改」双按钮
```

### 3. 文件改动范围

| 文件 | 改动 |
|------|------|
| `src/components/text-entry-detail-page/useTextEntryDetailPageController.ts` | 核心重写：增加 isEditing 状态机和编辑逻辑 |
| `src/components/text-entry-detail-page/TextEntryDetailPage.styles.ts` | 新增编辑模式的样式（内容输入卡片、底部双按钮） |
| `src/components/TextEntryDetailPage.tsx` | 增加 `onSave` prop，传递给 controller |
| `src/components/text-entry-detail-page/TextEntryDetailContent.tsx` | 拆分为 `ReadView` 和 `EditView` 两个内部组件，或通过 `isEditing` prop 切换 |
| `src/components/timeline-v2/TimelineDialogs.tsx` | `TextEntryDetailPage` 增加 `onSave` 接口；文字记录编辑不再触发 `EntryEditor` |
| `src/components/timeline-v2/useTimelineController.ts` | 调整 `handleDetailEdit`：文字记录不进 `editingEntry`，直接由 `TextEntryDetailPage` 内部处理 |

### 4. 复用组件

- **`TagArea`**（`src/components/text-editor/TagArea.tsx`）：直接 import 复用，props 接口完全兼容
- **`showConfirmDialog`**：复用现有的放弃修改确认框
- **`showErrorFeedback`**：复用现有的保存失败反馈

### 5. EntryEditor 不改动

`EntryEditor` 继续服务照片和语音记录的编辑。`TimelineDialogs` 中对 `text` 类型记录只展示 `TextEntryDetailPage`（不再传入 `EntryEditor`）。

## 交互细节

| 操作 | 行为 |
|------|------|
| 点击「编辑」 | isEditing = true，TextInput autoFocus |
| 点击「取消」(有改动) | showConfirmDialog「放弃修改？」，确认后 isEditing = false |
| 点击「取消」(无改动) | 直接 isEditing = false |
| 点击「保存修改」 | 调用 onSave，成功后 isEditing = false，更新显示内容 |
| 保存失败 | showErrorFeedback，保留编辑状态 |
| 标签展开面板 | 同 TextEditor 的 TagArea 行为 |

## 不改动的部分

- `DetailPageShell`（右滑进入动画保留）
- `EntryEditor`（照片/语音记录编辑不变）
- `TextEditor`（添加页不变）
- `TagArea`（只复用，不修改）
- 数据层（store、database）
