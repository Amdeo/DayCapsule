# SearchBar 顶部安全区适配设计

**日期：** 2026-03-16
**状态：** 已确认
**影响范围：** `app/src/components/SearchBar.tsx`（仅此一个文件）

---

## 问题描述

`SearchBar` 组件的容器样式中存在硬编码的 `paddingTop: 60`，该值不会动态适配不同设备的系统状态栏高度。

在 Android 设备上，状态栏通常为 24–30dp，导致搜索栏与状态栏之间产生约 30–36dp 的多余空白，浪费屏幕空间。

**问题位置：** `SearchBar.tsx` 第 78 行：

```js
paddingTop: 60,  // 硬编码，不适配设备差异
```

---

## 解决方案

在 `SearchBar` 组件内部使用 `useSafeAreaInsets()` 获取设备实际的顶部安全区高度，替换硬编码值。

### 选型理由

- `useSafeAreaInsets()` 是项目已有的用法（`Timeline.v2.tsx` 第 379 行已在使用）
- 组件自给自足，无需父级传递 props（无 prop drilling）
- `react-native-safe-area-context` 已是项目依赖，无需新增包

### 方案选型过程

| 方案 | 描述 | 结论 |
|------|------|------|
| A（采用）| `SearchBar` 内部调用 `useSafeAreaInsets()` | 最简洁，符合项目模式 |
| B | 从 `Timeline` 通过 prop 向下传递 `insets.top` | prop drilling，不采用 |
| C | 用 `SafeAreaView` 包裹 | 增加 View 层级，背景色控制复杂，不采用 |

---

## 具体变更

**文件：** `app/src/components/SearchBar.tsx`

### 1. 新增 import

```diff
+import { useSafeAreaInsets } from 'react-native-safe-area-context';
```

### 2. 组件内调用 hook

在 `SearchBar` 函数体顶部（现有 hook 调用之后）添加：

```diff
+const insets = useSafeAreaInsets();
```

### 3. 替换 paddingTop

将 `container` 样式的 `paddingTop` 从静态常量改为运行时动态值。由于 `insets.top` 为运行时值，需将 `paddingTop` 从 `StyleSheet.create` 中移出，改为渲染时内联传入：

- 从 `styles.container`（`StyleSheet.create`）中移除 `paddingTop: 60`
- 渲染时在 `<View style={[styles.container, { paddingTop: insets.top }]}>` 中传入

---

## 行为对比

| 场景 | 修复前 | 修复后 |
|------|--------|--------|
| Android 状态栏 ~28dp | 顶部空白 ≈ 32dp | 顶部空白 ≈ 0dp |
| iOS 刘海屏 ~44dp | 顶部空白 ≈ 16dp | 顶部空白 ≈ 0dp |
| iOS 老设备 ~20dp | 顶部空白 ≈ 40dp | 顶部空白 ≈ 0dp |

---

## 无副作用说明

- 不影响任何其他组件
- `SearchBar` 对外 props 接口不变
- 无新增依赖

---

## 测试要点

1. Android 设备：确认搜索栏紧贴状态栏底部，无多余空白
2. iOS 刘海屏：确认搜索栏不被刘海遮挡
3. iOS 老设备：确认搜索栏正常显示
4. 搜索、菜单、视图模式切换等交互功能正常
