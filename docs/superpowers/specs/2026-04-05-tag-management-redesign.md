# 预制标签管理页面重新设计

**日期：** 2026-04-05
**范围：** `src/components/tag-management-page/` 目录下的样式与布局
**设计方向：** iOS 设置风格（分组圆角卡片 + 拖拽排序 + 底部固定输入栏）

---

## 目标

将现有的"扁平列表 + 纯白背景"改版为更符合 iOS 原生规范的分组卡片风格，提升视觉层次感和操作一致性，同时保留全部功能（拖拽排序、添加、删除、重置）。

---

## 视觉规范

### 色彩

| 名称 | 值 | 用途 |
|------|-----|------|
| groupedBackground | `#F2F2F7` | 页面背景、导航栏背景、底部输入栏背景 |
| cardBackground | `#FFFFFF` | 卡片内容区背景 |
| separator | `#E5E5EA` | 卡片内行分隔线（0.5px） |
| outerSeparator | `#C6C6C8` | 底部输入栏顶部分隔线（0.5px） |
| label | `#1C1C1E` | 标签名正文 |
| secondaryLabel | `#8E8E93` | 计数提示文字（`12 / 20 个`）、分区说明 |
| tertiaryLabel | `#6C6C70` | 卡片顶部说明小字 |
| dragHandle | `#C7C7CC` | 拖拽手柄图标颜色 |
| destructive | `#FF3B30` | 删除按钮背景 |
| link | `#007AFF` | 重置按钮文字、添加按钮背景 |

### 字体

| 场景 | 大小 | 字重 |
|------|------|------|
| 导航栏标题 | 17pt | 700 |
| 导航栏返回按钮 | 17pt | 400 |
| 卡片行正文（标签名） | 17pt | 400 |
| 卡片顶部说明 | 13pt | 400 |
| 计数提示 | 13pt | 400 |
| 添加按钮文字 | 17pt | 600 |
| 输入框 placeholder | 17pt | 400 |

> React Native 中 pt = dp，以上数值直接用于 `fontSize`。

### 间距与圆角

- 页面水平内边距：`16`
- 卡片圆角：`10`
- 卡片行垂直内边距：`11`（上下各 11）
- 卡片行水平内边距：`16`
- 分区说明距卡片顶部：`6`（`marginBottom: 6`）
- 计数文字距卡片底部：`6`（`marginTop: 6`）
- 两个卡片之间间距：`24`（重置卡片 `marginTop: 24`）
- 底部输入栏内边距：垂直 `10`，水平 `16`，输入框与按钮 gap `8`

---

## 布局结构

```
SafeAreaView (background: #F2F2F7)
├── NavigationBar
│   ├── 返回按钮（#007AFF）
│   └── 标题「预制标签」（居中）
│
├── ScrollView (flex: 1, background: #F2F2F7)
│   ├── 分区说明小字「当前预制标签 · 长按拖拽可排序」
│   │
│   ├── 标签列表卡片（白色圆角卡片）
│   │   └── DraggableFlatList
│   │       └── 每行：⋮⋮拖拽手柄 | #标签名 | 红色删除圆钮
│   │
│   ├── 计数文字「12 / 20 个」（右对齐，灰色）
│   │
│   └── 重置卡片（白色圆角卡片）
│       └── ↺ 恢复初始预制标签（#007AFF）
│
└── 底部固定输入栏（background: #F2F2F7，顶部 0.5px 线）
    ├── TextInput（白色圆角，border: 0.5px #E5E5EA）
    └── 添加按钮（#007AFF 圆角）
```

---

## 组件变更说明

### `TagManagementPage.styles.ts`

完全重写为 iOS 分组风格。主要变更：

- `page`：`backgroundColor: '#F2F2F7'`
- 新增 `card`：`backgroundColor: '#FFFFFF'`，`borderRadius: 10`，`overflow: 'hidden'`
- 新增 `sectionLabel`：卡片顶部说明文字样式
- `tagRow`：移除 `borderBottomColor: '#F5F5F5'`，改为 `#E5E5EA`，`borderBottomWidth: 0.5`
- `tagName`：`fontSize: 17`，`color: '#1C1C1E'`
- 删除按钮：新增 `deleteButton`（`width: 22, height: 22, backgroundColor: '#FF3B30', borderRadius: 11`）和 `deleteButtonText`（白色 `−` 号）
- `hint`：`textAlign: 'right'`，`color: '#8E8E93'`，`marginTop: 6`
- 新增 `resetCard`：重置卡片容器，`marginTop: 24`
- `resetRow`：移除底部分隔线样式，改为卡片内行样式
- `resetText`：`color: '#007AFF'`，`fontSize: 17`
- `addRow`：`backgroundColor: '#F2F2F7'`，`borderTopWidth: 0.5`，`borderTopColor: '#C6C6C8'`
- `addInput`：`backgroundColor: '#FFFFFF'`，`borderWidth: 0.5`，`borderColor: '#E5E5EA'`，`fontSize: 17`
- `addButton`：`backgroundColor: '#007AFF'`，`borderRadius: 10`
- `addButtonText`：`fontSize: 17`，`fontWeight: '600'`

### `TagManagementPageContent.tsx`

布局调整：

1. 外层容器加 `backgroundColor: '#F2F2F7'`
2. 原 `pageHeader` 区域替换为：分区说明小字 → 标签列表卡片包装层 → 计数文字 → 重置卡片
3. 重置按钮从顶部移动到列表下方独立卡片
4. 计数文字移到列表卡片下方，右对齐

### `TagManagementTagRow.tsx`

- 删除按钮从 `<Ionicons name="close-circle" />` 改为自定义圆形 View + `−` 文字，背景 `#FF3B30`

### `TagManagementTagList.tsx`

- 无功能变更，`containerStyle` 移除 `flex:1`（改由外层卡片容器控制高度）

---

## 不变的功能

- 拖拽排序（`react-native-draggable-flatlist`，长按触发）
- 添加标签（底部输入框 + 添加按钮，达到上限时禁用）
- 删除标签（点击每行删除钮）
- 恢复初始标签（重置卡片中的按钮）
- 最大数量限制（`MAX_TAGS = 20`）

---

## 不在本次范围内

- 标签颜色/图标支持（保持纯文字）
- 标签搜索/过滤
- 撤销删除（Undo）
