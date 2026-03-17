# Timeline 视图切换动画与连线修复设计

**日期**: 2026-03-17
**状态**: 已批准

## 问题描述

1. **卡片跳动**：列表与按月模式切换时，`EntryMarker` 使用 `LinearTransition.springify()` 和 `FadeIn.springify()`，切换时所有卡片同时弹到新位置，图片卡片因高度较大抖动尤为明显。

2. **连线断裂**：背景竖线（贯穿列表全屏的灰色时间轴线）仅在 `viewMode === 'list'` 时渲染。切换到按月模式后，该线消失，各节头部的 24px 上/下线段无法与卡片区域衔接，造成圆点间连线断开。

## 修复方案（方案 A）

### 修复 1：去掉弹簧动画

**文件：** `app/src/components/Timeline.v2.tsx`

**位置：** `EntryMarker` 组件，`Animated.View` 的 `entering` 和 `layout` 属性（约第 290-294 行）

| 属性 | 修改前 | 修改后 |
|------|--------|--------|
| `entering` | `FadeIn.springify()` | `FadeIn.duration(200)` |
| `layout` | `LinearTransition.springify()` | `LinearTransition.duration(200)` |

效果：切换模式时卡片平滑滑入，200ms 线性过渡，不再抖动。

### 修复 2：列表/按月模式均显示背景竖线

**文件：** `app/src/components/Timeline.v2.tsx`

**位置：** 主渲染区背景竖线（约第 578 行）

| 修改前 | 修改后 |
|--------|--------|
| `{viewMode === 'list' && <View ...背景竖线... />}` | `<View ...背景竖线... />` |

去掉 `viewMode === 'list'` 条件，列表和按月模式均显示贯穿全屏的背景竖线，与各节头部的 24px 上/下线段自然衔接。

## 改动范围

```
修改  app/src/components/Timeline.v2.tsx
```

共 3 处修改，无新增文件，无接口变更，无状态层改动。
