# 侧边栏缩放推挤式设计规格

**日期**：2026-03-15
**状态**：已批准，待实现

## 需求背景

当前侧边栏（`Sidebar.tsx`）使用 `Modal` 以覆盖（overlay）方式渲染，菜单浮在主内容之上并遮挡背景。用户希望改为**缩放推挤式**：打开菜单时，主内容同时向右平移并缩小，菜单从左侧滑入，主内容以缩小卡片的形式在右侧保持可见，点击右侧缩小区域即可关闭菜单。

## 交互设计

### 打开状态

- 侧边栏从屏幕左侧滑入，占据约 80%（最大 320px）宽度
- 主内容区同步向右平移并缩放，形成"卡片缩进"效果
- 主内容右侧露出部分覆盖透明 `Pressable`，点击即关闭侧边栏
- 无手势支持（仅顶部按钮触发开关）
- 无半透明遮罩（主内容缩小本身提供层次感，根容器深色背景填充空隙）

### 关闭方式

1. 点击主内容右侧缩小区域
2. 侧边栏内部关闭按钮（现有逻辑保留）

## 动画规格

| 属性 | 初始值 | 展开值 | 说明 |
|------|--------|--------|------|
| 主内容 `translateX` | 0 | `SIDEBAR_WIDTH × 0.8`（约 256px） | 向右推挤 |
| 主内容 `scale` | 1 | 0.85 | 缩小呈卡片状 |
| 主内容 `borderRadius` | 0 | 16 | 缩小后加圆角 |
| 侧边栏 `translateX` | `-SIDEBAR_WIDTH` | 0 | 从左滑入 |

**动画曲线**：
- 打开：`withSpring({ damping: 20, stiffness: 200 })`，带弹性
- 关闭：`withTiming(0, { duration: 250 })`，快速收回

**驱动值**：单一 `SharedValue<number> drawerProgress`（0→1），所有动画通过 `interpolate` 派生。

## 布局结构

```
<View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
  │
  ├── <Sidebar drawerProgress={drawerProgress} onClose={closeDrawer} />
  │     └── 绝对定位，left: 0，translateX 由 drawerProgress 驱动
  │
  └── <Animated.View style={mainContentAnimatedStyle}>
        ├── <Timeline />
        ├── <TextEditor />
        └── {drawerOpen && <Pressable onPress={closeDrawer} />}  ← 透明关闭层
      </Animated.View>
```

根容器背景色为 `#1a1a1a`，主内容缩放后露出的间隙由深色背景填充，增强层次感。

## 改动范围

### `app/src/components/Sidebar.tsx`

- 移除 `Modal`、`shouldRender`、`isAnimating` 等状态
- 改为普通 `View`（`position: absolute, left: 0`）
- 新增 prop：`drawerProgress: SharedValue<number>`，驱动 `translateX` 动画
- `onClose` prop 语义不变（调用方的 `closeDrawer`）
- 子页面 Modal（Settings / About 等）保持不变，在调用方外部渲染

### `app/app/(tabs)/index.tsx`

- 根 View 背景色改为 `#1a1a1a`
- 创建 `drawerProgress = useSharedValue(0)`
- 实现 `openDrawer` / `closeDrawer` 函数（操作 `drawerProgress`）
- 主内容（`Timeline` + `TextEditor`）外套 `Animated.View`，绑定 scale + translateX
- `showSidebar` boolean state 保留，用于控制透明 Pressable 的渲染
- 将 `drawerProgress` 传入 `<Sidebar>`

### 不涉及的文件

- `Timeline.v2.tsx`
- `FABMenu.tsx`
- 所有子页面组件（`SettingsPage`、`AboutPage` 等）

## 依赖

无新依赖。使用现有 `react-native-reanimated`（项目已集成）。
