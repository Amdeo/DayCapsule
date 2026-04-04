# 文字记录页重设计

## Context

当前文字添加页面（TextEditor 组件）存在以下用户体验问题：
- "添加文字记录" 标题字号过大（20px/700），占据宝贵空间
- 输入框太小（minHeight 仅 120px），不适合写长文
- 预制标签区域平铺 12 个标签，占据过多垂直空间
- 标签区不可折叠，与输入框争抢空间
- 纯白色背景与 EntryEditor（编辑页）的暖色调不统一

## 设计方案：工具栏标签型

参考 Apple Notes / Day One 的设计思路，核心改动：

### 1. Header 简化

| 改前 | 改后 |
|------|------|
| "添加文字记录" 20px/700 + 关闭按钮 | "新记录" 15px/600 + 关闭按钮 |
| 无拖动手柄 | 增加拖动手柄（36×4px 灰色胶囊） |
| 底部分割线 | 去掉分割线 |

去掉蓝色 "文本" 类型标签（typeTag），信息冗余。

### 2. 输入框增大

- `minHeight`: 120px → 200px
- 输入框随内容自动扩展（`onContentSizeChange`）
- 背景色：`#F5F5F5` → `#FFFDF9`（暖白色卡片）
- 增加微妙边框和阴影，与 EntryEditor 的 contentSurface 风格对齐
- 去掉 "内容" section label

### 3. 标签区改为单行工具栏

**默认状态（折叠）：**
- 标签区从多行 wrap 布局改为单行横向滚动（`ScrollView horizontal`）
- 显示 🏷 图标 + 前 N 个预设标签 + 末尾 `…` 按钮
- 选中的标签排到前面，显示为紫色实心 + ✓
- 占据固定 ~40px 高度

**展开状态：**
- 点击 `…` 或 🏷 图标展开完整标签面板
- 面板包含：已选标签（可 ✕ 移除）→ 分割线 → 所有预设标签 → 自定义输入框 + 添加按钮 → AI 建议
- 底部 "收起 ▴" 按钮
- 展开时输入框高度自动压缩，腾出空间

### 4. 视觉风格统一

- 面板背景：`#FFFFFF` → `#FAF8F5`（与 visualLanguage.surface.page 对齐）
- 输入框卡片：`#FFFDF9`（与 EntryEditor contentSurface 对齐）
- 使用 `visualLanguage.ts` 中定义的设计 token（当前文件未引用）
- Footer 按钮保持不变，但取消按钮颜色适配暖色调

### 5. Footer 调整

- 去掉顶部分割线
- 按钮间距和样式保持现有设计
- 取消按钮：`#F5F5F5` → `#F0EDEA`（暖色系）

## 交互逻辑

| 操作 | 行为 |
|------|------|
| 点击预设标签（折叠态） | 直接切换选中/取消，无需展开 |
| 点击 … 或 🏷 | 展开完整标签面板 |
| 点击「收起 ▴」 | 折叠回单行工具栏 |
| 输入内容 | 输入框自动扩展高度 |
| 键盘弹起 | KeyboardAvoidingView 正常工作 |

## 不改动的部分

- Modal 呈现方式（保持底部弹层 90% 高度）
- Controller 核心逻辑（useTextEditorController）
- 保存/取消的业务流程
- commonTagsStore 数据层
- tagSuggestionService AI 建议逻辑

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/components/TextEditor.tsx` | 增加拖动手柄，简化 header |
| `src/components/text-editor/TextEditorBody.tsx` | 重构为大输入框 + 标签工具栏/面板 |
| `src/components/text-editor/TextEditorFooter.tsx` | 去分割线，调色 |
| `src/components/text-editor/TextEditor.styles.ts` | 全面更新样式 |
| `src/components/text-editor/useTextEditorController.ts` | 增加 tagPanelExpanded 状态 |
