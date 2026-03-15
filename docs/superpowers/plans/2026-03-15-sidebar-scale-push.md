# Sidebar Scale-Push Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将侧边栏从 Modal 覆盖式改为缩放推挤式——菜单打开时主内容向右平移并缩小，呈现立体卡片层次感。

**Architecture:** 移除 `Sidebar.tsx` 的 `Modal`，改为绝对定位的 `Animated.View`，由 `index.tsx` 持有的 `SharedValue drawerProgress`（0→1）统一驱动侧边栏 translateX 和主内容 translateX + scale + borderRadius 动画。子页面 state 从 Sidebar 内部移至 index.tsx，通过 props 传入。

**Tech Stack:** react-native-reanimated 3（withSpring / withTiming / cancelAnimation / runOnJS / useAnimatedStyle / interpolate / useSharedValue），React Native BackHandler，StyleSheet

---

## Chunk 1: 改造 Sidebar.tsx

### Task 1: 移除 Modal，将 Sidebar 改为 Animated.View

**Files:**
- Modify: `app/src/components/Sidebar.tsx`

#### 背景

当前 Sidebar 用 `Modal` 渲染，有 `shouldRender`、`isAnimating` 两个内部 state 控制动画时序。新版本：
- 不再需要 Modal、shouldRender、isAnimating
- 改为 `Animated.View`（绝对定位，`zIndex: 10`）
- 接收 `drawerProgress: SharedValue<number>` prop，派生 `translateX`
- 子页面 state（`showSettings` 等）从内部移出，改由调用方（index.tsx）持有并以 props 形式传入

#### 新 Props 接口

```ts
interface SidebarProps {
  drawerProgress: SharedValue<number>;
  onClose: () => void;
  // 子页面可见状态（从 index.tsx 传入）
  showSettings: boolean; setShowSettings: (v: boolean) => void;
  showAbout:    boolean; setShowAbout:    (v: boolean) => void;
  showStats:    boolean; setShowStats:    (v: boolean) => void;
  showTags:     boolean; setShowTags:     (v: boolean) => void;
  showBackup:   boolean; setShowBackup:   (v: boolean) => void;
  showHelp:     boolean; setShowHelp:     (v: boolean) => void;
}
```

#### 常量（在文件顶部定义）

```ts
const { width: SCREEN_WIDTH } = Dimensions.get('screen');
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 320);
```

#### 动画样式（useAnimatedStyle）

```ts
const animatedStyle = useAnimatedStyle(() => ({
  transform: [
    { translateX: interpolate(drawerProgress.value, [0, 1], [-SIDEBAR_WIDTH, 0]) },
  ],
}));
```

#### 根元素替换为

```tsx
<Animated.View style={[styles.sidebar, animatedStyle]}>
  {/* 原有内容保持不变：header、menuList、footer、sub-pages */}
</Animated.View>
```

其中 `styles.sidebar`：

```ts
sidebar: {
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: SIDEBAR_WIDTH,
  backgroundColor: '#FFFFFF',
  shadowColor: '#000',
  shadowOffset: { width: 2, height: 0 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 8,
  zIndex: 10,
},
```

#### handleMenuItemPress 简化

原来调用 `onClose()` 后再 `setTimeout(() => setShowXxx(true), 400)` 是因为要等 Modal 关闭。新版本 Sidebar 是普通 View，`onClose` 只触发关闭动画（250ms），子页面 Modal 独立渲染无需等待，因此可简化为：

```ts
const handleMenuItemPress = (action: 'settings' | ...) => {
  onClose();
  switch (action) {
    case 'settings': setShowSettings(true); break;
    case 'about':    setShowAbout(true);    break;
    case 'stats':    setShowStats(true);    break;
    case 'tags':     setShowTags(true);     break;
    case 'backup':   setShowBackup(true);   break;
    case 'help':     setShowHelp(true);     break;
  }
};
```

> 无需 setTimeout，子页面 Modal 直接展示即可。

#### 子页面渲染

保持不变，仍在 `Sidebar` 组件返回值的最外层渲染（JSX 片段 `<>`），因为子页面已经是独立 Modal，与 Sidebar 是否为 Modal 无关：

```tsx
return (
  <>
    <Animated.View style={[styles.sidebar, animatedStyle]}>
      {/* sidebar 内容 */}
    </Animated.View>

    <SettingsPage visible={showSettings} onClose={() => setShowSettings(false)} />
    <AboutPage    visible={showAbout}    onClose={() => setShowAbout(false)} />
    <StatsPage    visible={showStats}    onClose={() => setShowStats(false)} />
    <TagsPage     visible={showTags}     onClose={() => setShowTags(false)} />
    <BackupPage   visible={showBackup}   onClose={() => setShowBackup(false)} />
    <HelpPage     visible={showHelp}     onClose={() => setShowHelp(false)} />
  </>
);
```

#### 需要移除的 import

- `Modal`（来自 react-native）
- `FadeIn`, `FadeOut`, `SlideInLeft`, `SlideOutLeft`（来自 react-native-reanimated）

#### 需要新增的 import

```ts
import Animated, {
  useAnimatedStyle,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
```

---

- [ ] **Step 1: 在 Sidebar.tsx 顶部添加常量**

  在 `import` 区下方，`interface SidebarProps` 之前添加：

  ```ts
  const { width: SCREEN_WIDTH } = Dimensions.get('screen');
  const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 320);
  ```

  同时从 `react-native` import 中补充 `Dimensions`（若未引入）。

- [ ] **Step 2: 更新 SidebarProps 接口**

  将原 `{ visible: boolean; onClose: () => void }` 替换为新接口（见上方）。

- [ ] **Step 3: 更新函数签名，解构新 props**

  ```ts
  export function Sidebar({
    drawerProgress,
    onClose,
    showSettings, setShowSettings,
    showAbout,    setShowAbout,
    showStats,    setShowStats,
    showTags,     setShowTags,
    showBackup,   setShowBackup,
    showHelp,     setShowHelp,
  }: SidebarProps) {
  ```

- [ ] **Step 4: 移除内部 state 和 useEffect**

  删除：
  - `const [isAnimating, setIsAnimating] = useState(false);`
  - `const [shouldRender, setShouldRender] = useState(false);`
  - `const [showSettings, setShowSettings] = useState(false);`（以及其他5个子页面 state）
  - 整个 `useEffect` 块（监听 `visible`，控制 `shouldRender`/`isAnimating`）

  同时移除 JSX 中的 `onStartShouldSetResponder={() => true}` 和 `onResponderRelease={() => {}}` 两个 prop——这两个 prop 原本是为了阻止触摸事件穿透 Modal 背景，Modal 移除后不再需要。

- [ ] **Step 5: 更新 imports**

  从 `react-native` 移除 `Modal` 和 `Pressable`（Sidebar 内部不再有 backdrop Pressable）；
  确认 `Dimensions` 已有，不重复引入。
  从 `react-native-reanimated` 移除 `FadeIn, FadeOut, SlideInLeft, SlideOutLeft`，添加 `useAnimatedStyle, interpolate, SharedValue`。

- [ ] **Step 6: 添加 useAnimatedStyle**

  在函数体内（`const insets = useSafeAreaInsets();` 之后）添加：

  ```ts
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(drawerProgress.value, [0, 1], [-SIDEBAR_WIDTH, 0]) },
    ],
  }));
  ```

- [ ] **Step 7: 简化 handleMenuItemPress**

  移除 `setTimeout`，按上方示例直接调用 `setShowXxx(true)`。

- [ ] **Step 8: 替换 JSX 根结构**

  移除 `Modal` 及其条件渲染（`shouldRender &&`、`isAnimating &&`），用 `<Animated.View style={[styles.sidebar, animatedStyle]}>` 直接包裹内容。返回结构改为上方所示 `<>` 片段。

- [ ] **Step 9: 更新 styles.sidebar**

  将原 `sidebar` 样式替换为绝对定位版本（见上方 sidebar 样式定义），移除原 `container`、`backdrop` 样式（不再需要）。
  同时删除文件末尾的 `const { height: SCREEN_HEIGHT } = Dimensions.get('screen');`——该常量仅为原 `height: SCREEN_HEIGHT` 样式服务，绝对定位改用 `bottom: 0` 后已不再引用。
  完成后检查 `Dimensions` 是否仍被其他地方使用（Step 1 添加的常量中使用了 `Dimensions.get('screen')`），若仅剩 Step 1 的常量使用，则保留；若已无任何引用，则从 import 中移除。

- [ ] **Step 10: TypeScript 检查**

  全局确认 `<Sidebar>` 只在 `index.tsx` 一处调用（可 grep 验证）：

  ```bash
  cd app && grep -r "<Sidebar" src/ app/ --include="*.tsx" --include="*.ts"
  ```

  预期：仅 `app/(tabs)/index.tsx` 一处。随后运行类型检查：

  ```bash
  cd app && npx tsc --noEmit 2>&1 | head -30
  ```

  预期：`Sidebar.tsx` 本身零错误；仅 `index.tsx` 报告 `<Sidebar>` 调用处类型不匹配（因为 index.tsx 还未更新 props），这是正常的。

- [ ] **Step 11: 暂存 Sidebar.tsx**

  ```bash
  git add app/src/components/Sidebar.tsx
  git commit -m "refactor: convert Sidebar from Modal overlay to Reanimated Animated.View with drawerProgress prop"
  ```

---

## Chunk 2: 更新 index.tsx（抽屉动画 + 状态管理）

> **前置条件：** Chunk 1（Sidebar.tsx 改造）必须已完成并提交，Chunk 2 才能开始。Sidebar 的新 props 接口在 Chunk 1 中定义，Chunk 2 的类型检查依赖于此。

### Task 2: 在 HomeScreen 实现缩放推挤式抽屉

**Files:**
- Modify: `app/app/(tabs)/index.tsx`

#### 常量（文件顶部，与 Sidebar.tsx 保持一致）

```ts
const { width: SCREEN_WIDTH } = Dimensions.get('screen');
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 320);
const MAIN_TRANSLATE_X = SIDEBAR_WIDTH * 0.8; // 约 256px
const MAIN_SCALE = 0.85;
const MAIN_BORDER_RADIUS = 16;
```

#### 新增 imports

```ts
import { View, Alert, Linking, BackHandler } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  cancelAnimation,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
```

#### 状态与 SharedValue

```ts
const drawerProgress = useSharedValue(0);
const [drawerOpen, setDrawerOpen] = useState(false);

// 子页面状态（从 Sidebar 移出）
const [showSettings, setShowSettings] = useState(false);
const [showAbout,    setShowAbout]    = useState(false);
const [showStats,    setShowStats]    = useState(false);
const [showTags,     setShowTags]     = useState(false);
const [showBackup,   setShowBackup]   = useState(false);
const [showHelp,     setShowHelp]     = useState(false);
```

#### openDrawer / closeDrawer

```ts
const openDrawer = useCallback(() => {
  setDrawerOpen(true);
  cancelAnimation(drawerProgress);
  drawerProgress.value = withSpring(1, { damping: 20, stiffness: 200 });
}, [drawerProgress]);

const closeDrawer = useCallback(() => {
  cancelAnimation(drawerProgress);
  drawerProgress.value = withTiming(0, { duration: 250 }, (finished) => {
    if (finished) runOnJS(setDrawerOpen)(false);
  });
}, [drawerProgress]);
```

#### Android BackHandler

```ts
useEffect(() => {
  if (!drawerOpen) return;
  const sub = BackHandler.addEventListener('hardwareBackPress', () => {
    closeDrawer();
    return true;
  });
  return () => sub.remove();
}, [drawerOpen, closeDrawer]);
```

#### 主内容动画样式

```ts
const mainContentStyle = useAnimatedStyle(() => ({
  transform: [
    { translateX: interpolate(drawerProgress.value, [0, 1], [0, MAIN_TRANSLATE_X]) },
    { scale: interpolate(drawerProgress.value, [0, 1], [1, MAIN_SCALE]) },
  ],
  borderRadius: interpolate(drawerProgress.value, [0, 1], [0, MAIN_BORDER_RADIUS]),
  overflow: 'hidden', // 防止 Android borderRadius 闪烁
}));
```

#### JSX 结构

```tsx
return (
  <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
    {/* 主内容（最底层，无 zIndex） */}
    <Animated.View style={[{ flex: 1 }, mainContentStyle]}>
      <Timeline
        onQuickAdd={handleMediaSelect}
        onMenuPress={openDrawer}
        onPauseRecording={handlePauseRecording}
        onResumeRecording={handleResumeRecording}
        onStopRecording={handleStopRecording}
      />
    </Animated.View>

    {/* TextEditor 必须在 Animated.View 之外——它内部是 Modal，
        放入 Animated.View 会在 iOS 上产生 z-index 和 hit-test 问题 */}
    <TextEditor
      visible={showTextEditor}
      onSave={handleTextSave}
      onCancel={() => setShowTextEditor(false)}
    />

    {/* 侧边栏（position: absolute + zIndex: 10 在 Sidebar.tsx 内部样式中定义） */}
    <Sidebar
      drawerProgress={drawerProgress}
      onClose={closeDrawer}
      showSettings={showSettings} setShowSettings={setShowSettings}
      showAbout={showAbout}       setShowAbout={setShowAbout}
      showStats={showStats}       setShowStats={setShowStats}
      showTags={showTags}         setShowTags={setShowTags}
      showBackup={showBackup}     setShowBackup={setShowBackup}
      showHelp={showHelp}         setShowHelp={setShowHelp}
    />

    {/* 透明关闭层（zIndex: 5，点击右侧缩小区域关闭侧边栏）
        left: MAIN_TRANSLATE_X 为静态值，是可接受的取舍——
        实际用户点击通常发生在动画结束后，规格已确认此行为。 */}
    {drawerOpen && (
      <Pressable
        onPress={closeDrawer}
        style={{
          position: 'absolute',
          left: MAIN_TRANSLATE_X,
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 5,
        }}
      />
    )}
  </View>
);
```

> `Pressable` 需从 `react-native` 导入（见 Step 2）。`TextEditor` 作为兄弟节点渲染，其内部 Modal 不受主内容动画影响。

---

- [ ] **Step 1: 添加常量到文件顶部**

  在 `import` 区之后、`export interface PhotoSelectDeps` 之前添加四个常量（`SCREEN_WIDTH`, `SIDEBAR_WIDTH`, `MAIN_TRANSLATE_X`, `MAIN_SCALE`, `MAIN_BORDER_RADIUS`）。

- [ ] **Step 2: 更新 imports**

  - `react-native`：添加 `BackHandler`, `Pressable`, `Dimensions`（index.tsx 目前未引入这三者）
  - 新增 `react-native-reanimated` import（见上方）

- [ ] **Step 3: 添加 drawerProgress SharedValue 和 drawerOpen state**

  在 `HomeScreen` 函数体内，现有 `const [showTextEditor, ...]` 之后添加。

- [ ] **Step 4: 添加子页面 state（6个）**

  紧接 `drawerOpen` 之后添加 `showSettings`、`showAbout` 等6个 state。同时**移除**原来的 `const [showSidebar, setShowSidebar] = useState(false)`。

- [ ] **Step 5: 实现 openDrawer 和 closeDrawer**

  按上方代码实现，使用 `useCallback`。

- [ ] **Step 6: 添加 Android BackHandler useEffect**

  依赖项为 `[drawerOpen, closeDrawer]`。

- [ ] **Step 7: 实现 mainContentStyle（useAnimatedStyle）**

  按上方代码实现，包含 transform 顺序（先 translateX 后 scale）和 `overflow: 'hidden'`。

- [ ] **Step 8: 更新 JSX 结构**

  按上方 JSX 结构重写 `return` 块：
  - 根 View 背景色 `#1a1a1a`
  - **只有 `Timeline`** 套入 `Animated.View` + `mainContentStyle`（注意：`TextEditor` 不在 Animated.View 内）
  - `TextEditor` 作为根 View 的直接子节点（兄弟于 Animated.View），避免 Modal 嵌套问题
  - `onMenuPress` 改为 `openDrawer`
  - `<Sidebar>` 改用新 props（drawerProgress + 子页面 state）
  - 移除原 `showSidebar` 相关逻辑
  - 添加透明 Pressable（兄弟节点，不在 Animated.View 内）

- [ ] **Step 9: TypeScript 全量检查**

  ```bash
  cd app && npx tsc --noEmit 2>&1 | head -30
  ```

  预期：零错误。

- [ ] **Step 10: 提交**

  ```bash
  git add app/app/(tabs)/index.tsx
  git commit -m "feat: implement scale-push drawer in HomeScreen with Reanimated SharedValue"
  ```

---

## Chunk 3: 验证（手动测试）

由于侧边栏动画依赖原生 Reanimated，自动化测试无法覆盖动画效果，验证以手动测试为主。

### Task 3: 手动测试检查清单

- [ ] **Step 1: 构建并启动 dev client**

  ```bash
  cd app && npx expo start --dev-client
  ```

- [ ] **Step 2: 测试打开动画**

  点击 Timeline 顶部菜单按钮：
  - 预期：侧边栏从左侧弹出，主内容向右平移并缩小，有弹性回弹感
  - 预期：主内容右侧露出深色（`#1a1a1a`）背景填充区域

- [ ] **Step 3: 测试点击右侧关闭**

  侧边栏打开后，点击右侧缩小的主内容区域：
  - 预期：侧边栏滑回左侧，主内容平滑恢复原位（250ms）

- [ ] **Step 4: 测试关闭按钮**

  点击侧边栏内"×"按钮：
  - 预期：与 Step 3 相同效果

- [ ] **Step 5: 测试子页面跳转**

  点击侧边栏内"设置"、"统计"等菜单项：
  - 预期：侧边栏关闭，对应子页面 Modal 弹出，内容正常
  - 预期：子页面关闭后回到主界面，无残留 UI 状态
  - **特别验证**：子页面 Modal 是否在侧边栏关闭动画（250ms）完成之前明显弹出。**建议实现时直接在 Sidebar 的 `handleMenuItemPress` 中为 `setShowXxx(true)` 添加 `setTimeout(..., 260)` 延迟**——此抖动在慢速设备上必现，在开发设备上可能不可见，主动添加比事后修复更稳妥

- [ ] **Step 6: 测试快速连续开关（竞态）**

  快速点击菜单按钮和关闭区域多次：
  - 预期：动画不会卡住、不会停在中间状态

- [ ] **Step 7: Android 返回键测试（Android 设备）**

  侧边栏打开后按硬件返回键：
  - 预期：侧边栏关闭，不退出 App

- [ ] **Step 8: 提交测试通过标记**

  ```bash
  git tag v-sidebar-scale-push-verified
  ```

---

## 文件变动汇总

| 文件 | 操作 | 说明 |
|------|------|------|
| `app/src/components/Sidebar.tsx` | 修改 | Modal→Animated.View，props 接口更新，移除内部子页面 state |
| `app/app/(tabs)/index.tsx` | 修改 | 添加 drawerProgress、openDrawer/closeDrawer、mainContentStyle、BackHandler |

**不涉及：** `Timeline.v2.tsx`、`FABMenu.tsx`、所有子页面组件。
