# FAB 按钮精简设计

**日期：** 2026-03-18
**文件：** `app/src/components/FABMenu.tsx`

## 背景

当前 FAB 主按钮在用户选择过记录类型后，会在图标下方显示一个文字标签（"文字"/"相册"/"拍照"/"语音"）。此外，FAB 从半隐藏状态弹回时使用了带回弹感的弹簧动画。这两处效果需要去除。

## 改动范围

### 1. 去除主按钮文字标签

**目标：** 主 FAB 按钮只显示图标，不显示文字。

涉及代码：

- 删除 JSX 中的 `labelContainer` 区块（条件渲染 `fabLabel !== null` 的部分）
- 删除 `styles` 中的 `labelContainer` 和 `labelText` 样式定义
- 清理 `fabLabel` 变量（已无引用）
- 清理 `TYPE_CONFIG` 中各条目的 `label` 字段（已无引用）

不受影响：

- 扇形展开时各选项按钮下方的 `optionLabel` 标签保留
- 首次启动气泡提示（`tipBubble`）保留

### 2. 去除 FAB 按钮回弹动画

**目标：** FAB 从半隐藏状态滑回时，使用匀减速动画替代弹簧动画。

涉及代码（第 118 行）：

```
// 修改前
fabTranslateY.value = withSpring(0, { damping: 15, stiffness: 250, overshootClamping: false });

// 修改后
fabTranslateY.value = withTiming(0, { duration: 200 });
```

不受影响：

- 扇形展开动画（第 166 行 `withSpring(1, SPRING_CONFIG)`）保留
- `SPRING_CONFIG` 常量保留（仍被扇形展开使用）
- `withSpring` import 保留（仍被扇形展开使用）

## 验收标准

1. 主 FAB 按钮在选择过类型后，只显示对应图标，图标下方无文字
2. FAB 从底部滑回时，动画平滑无弹跳
3. 扇形展开/收起动画不受影响
4. 首次启动气泡提示不受影响
5. TypeScript 编译无错误
