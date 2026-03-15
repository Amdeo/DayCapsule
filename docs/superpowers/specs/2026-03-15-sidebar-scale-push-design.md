# 侧边栏缩放推挤式设计规格

**日期**：2026-03-15
**状态**：已批准，待实现

## 需求背景

当前侧边栏（`Sidebar.tsx`）使用 `Modal` 以覆盖（overlay）方式渲染，菜单浮在主内容之上并遮挡背景。用户希望改为**缩放推挤式**：打开菜单时，主内容同时向右平移并缩小，菜单从左侧滑入，主内容以缩小卡片的形式在右侧保持可见，点击右侧缩小区域即可关闭菜单。

## 交互设计

### 打开状态

- 侧边栏从屏幕左侧滑入，占据 `SIDEBAR_WIDTH`（`Math.min(screenWidth * 0.8, 320)`）宽度
- 主内容区同步向右平移并缩放，形成"卡片缩进"效果
- 主内容右侧露出部分由绝对定位的透明 `Pressable` 覆盖，点击即关闭侧边栏
- 无手势支持（仅顶部按钮触发开关）
- 无半透明遮罩（主内容缩小本身提供层次感，根容器深色背景填充空隙）

### 关闭方式

1. 点击主内容右侧缩小区域（透明 Pressable）
2. 侧边栏内部关闭按钮（`onClose` callback，现有逻辑保留）

## 常量定义

```ts
const { width: SCREEN_WIDTH } = Dimensions.get('screen');
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 320);
const MAIN_TRANSLATE_X = SIDEBAR_WIDTH * 0.8; // 约 256px，主内容平移量
const MAIN_SCALE = 0.85;
const MAIN_BORDER_RADIUS = 16;
```

## 动画规格

| 属性 | 初始值 | 展开值 | 说明 |
|------|--------|--------|------|
| 主内容 `translateX` | 0 | `MAIN_TRANSLATE_X` | 向右推挤 |
| 主内容 `scale` | 1 | `MAIN_SCALE`（0.85） | 缩小呈卡片状 |
| 主内容 `borderRadius` | 0 | `MAIN_BORDER_RADIUS`（16） | 缩小后加圆角 |
| 侧边栏 `translateX` | `-SIDEBAR_WIDTH` | 0 | 从左滑入 |

**动画曲线**：
- 打开：`cancelAnimation(drawerProgress); drawerProgress.value = withSpring(1, { damping: 20, stiffness: 200 })`
- 关闭：`cancelAnimation(drawerProgress); drawerProgress.value = withTiming(0, { duration: 250 })`

必须在每次调用前先 `cancelAnimation`，防止快速连续开关时 `runOnJS` 回调乱序触发（竞态条件）。

**驱动值**：单一 `SharedValue<number> drawerProgress`（初始为 `0`，展开为 `1`），所有动画通过 `interpolate` 派生，初始值必须在 `useSharedValue(0)` 时同步确定，避免首帧闪烁。

**Transform 顺序**：必须显式指定为 `transform: [{ translateX }, { scale }]`（先平移再缩放）。顺序不同会产生不同视觉结果，此顺序确保主内容向右平移后在原位缩小。

**Android borderRadius 注意**：在 Android 上动画 `borderRadius` 可能产生闪烁，如有问题可改用 `overflow: 'hidden'` + 固定 borderRadius，或拆分为四角单独设置。

## 布局结构

```
<View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>           ← 根容器，深色底
  │
  ├── <Animated.View style={mainContentAnimatedStyle}>            ← 主内容区（zIndex 未设，渲染在前）
  │     ├── <Timeline />
  │     └── <TextEditor />
  │
  ├── <Sidebar drawerProgress={drawerProgress} onClose={closeDrawer} />
  │     └── 绝对定位，left: 0，top: 0，bottom: 0，width: SIDEBAR_WIDTH
  │         zIndex: 10，translateX 由 drawerProgress 驱动（-SIDEBAR_WIDTH → 0）
  │
  └── {drawerOpen &&                                              ← 透明关闭层（zIndex: 5）
        <Pressable
          onPress={closeDrawer}
          style={{ position: 'absolute', left: MAIN_TRANSLATE_X, top: 0,
                   right: 0, bottom: 0 }}
        />}
</View>
```

**层级说明**：
- 主内容 `Animated.View`：无 zIndex（最底层）
- 透明 Pressable：`zIndex: 5`，绝对定位，`left: MAIN_TRANSLATE_X`，覆盖右侧露出区域（不在主内容 Animated.View 内部，避免 scale 影响点击区域）
- Sidebar：`zIndex: 10`，位于最上层

**状态管理**：`showSidebar` boolean state 替换为 `drawerOpen`，用单一 boolean state 控制 Pressable 渲染。`openDrawer` 先设 `drawerOpen=true` 再启动动画；`closeDrawer` 先启动动画，动画结束后通过 `runOnJS` 设 `drawerOpen=false`。两个函数开头均先调用 `cancelAnimation(drawerProgress)` 防止竞态。

**Pressable 偏移说明**：透明 Pressable 的 `left: MAIN_TRANSLATE_X` 是固定值，与动画进度无关，在动画播放中途可能存在短暂的点击区域错位。这是可接受的取舍——Pressable 仅在完全打开后才可见（`drawerOpen` 在动画开始时即设为 true 控制渲染），实际触发关闭的操作通常发生在动画结束后。

**StatusBar**：不作特殊处理。根 View 深色背景在缩放时填充上方区域，StatusBar 样式维持现有设置。

## 子页面触发机制

`Sidebar` 改为普通 View 后，子页面（Settings / About 等）依然在 `index.tsx` 中渲染为独立 Modal。触发路径：

1. 用户点击侧边栏菜单项 → Sidebar 内部调用 `handleMenuItemPress(action)`
2. `handleMenuItemPress` 先调用 `onClose`（即 `closeDrawer`），再通过已有的 `setShowXxx(true)` 控制子页面显示
3. 子页面相关 state（`showSettings` / `showAbout` 等）从 `Sidebar` 内部移出，改由 `index.tsx` 持有，并通过 props 传入 `Sidebar`

## Android 返回键处理

移除 Modal 后，Android 硬件返回键不再自动关闭侧边栏。需在 `index.tsx` 中添加：

```ts
useEffect(() => {
  if (!drawerOpen) return;
  const sub = BackHandler.addEventListener('hardwareBackPress', () => {
    closeDrawer();
    return true; // 拦截返回键
  });
  return () => sub.remove();
}, [drawerOpen]);
```

## 改动范围

### `app/src/components/Sidebar.tsx`

- 移除 `Modal`、`shouldRender`、`isAnimating` 等状态
- 改为 `Animated.View`（`position: absolute, left: 0, top: 0, bottom: 0, width: SIDEBAR_WIDTH, zIndex: 10`）
- 新增 prop：`drawerProgress: SharedValue<number>`，驱动 `translateX` 动画（`interpolate` 派生）
- 新增 props：子页面可见状态及其 setter（`showSettings`, `setShowSettings` 等），从内部 state 移出
- `onClose` prop 语义不变

### `app/app/(tabs)/index.tsx`

- 根 View 背景色改为 `#1a1a1a`
- 创建 `drawerProgress = useSharedValue(0)`，创建 `drawerOpen` boolean state
- 实现 `openDrawer`（设 `drawerOpen: true`，`drawerProgress → withSpring(1, ...)`）
- 实现 `closeDrawer`（`drawerProgress → withTiming(0, ...)`，动画结束后 `runOnJS` 设 `drawerOpen: false`）
- 主内容（`Timeline` + `TextEditor`）外套 `Animated.View`，绑定 scale + translateX
- 添加透明 Pressable（`drawerOpen` 时渲染，绝对定位覆盖右侧区域）
- 子页面 state 从 `Sidebar` 移出，在此持有并传入 `Sidebar`
- 添加 Android BackHandler
- 将 `drawerProgress` 传入 `<Sidebar>`

### 不涉及的文件

- `Timeline.v2.tsx`
- `FABMenu.tsx`
- 所有子页面组件（`SettingsPage`、`AboutPage` 等）

## 依赖

无新依赖。使用现有 `react-native-reanimated`（项目已集成）。
