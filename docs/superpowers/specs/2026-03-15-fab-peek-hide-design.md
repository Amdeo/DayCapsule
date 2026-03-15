# FAB Peek-Hide 设计文档

**日期：** 2026-03-15
**状态：** 已批准

---

## 目标

将 FAB 的隐藏行为从「半透明缩小悬浮」改为「滑入底部边缘，顶部 10dp 弧形可见」，并支持三种方式唤回按钮：向上滚动、点击弧形、按住弧形向上拖动。

---

## 修改范围

**修改两个文件：**
- `app/src/components/FABMenu.tsx`
- `app/src/components/Timeline.v2.tsx`

---

## 布局常量

复用 `FABMenu.tsx` 中已有的 `FAB_SIZE = 56` 和 `FAB_BOTTOM = 32` 常量，新增：

```ts
const PEEK_HEIGHT = 10        // 隐藏时露出的弧形高度（dp）
const PEEK_TRANSLATE_Y =      // 隐藏时的 translateY 偏移
  FAB_SIZE + FAB_BOTTOM - PEEK_HEIGHT  // = 56 + 32 - 10 = 78
```

---

## 动画参数

| 方向 | 动画类型 | 参数 |
|------|---------|------|
| 隐藏（下滑） | `withTiming` | `duration: 200` |
| 显示（弹回） | `withSpring` | `damping: 15, stiffness: 250, overshootClamping: false` |

弹回动画显式设置 `overshootClamping: false`（与 FABMenu 中已有的 `SPRING_CONFIG` 区分，后者为 `true`），允许轻微过冲，视觉上更有活力。

---

## Props 接口变更（FABMenu）

```ts
// 移除
fabOpacity?: RNAnimated.Value;
fabScale?: RNAnimated.Value;

// 新增
shouldHide?: boolean;         // 外部控制隐藏/显示
onRevealRequest?: () => void; // 内部手势触发唤回时的回调
```

同时从 `react-native` 的 import 解构中移除 `Animated as RNAnimated`（确认 FABMenu.tsx 中无其他 RNAnimated 使用点）。

---

## FABMenu 内部变更

### 1. 新增 SharedValue 与 Ref

```ts
const fabTranslateY = useSharedValue(0);   // Reanimated: 0=显示, 78=隐藏
const isHiddenRef = useRef(false);          // PanResponder 快速读取隐藏状态
const hasRevealedInMoveRef = useRef(false); // 防止 move+release 双重唤回
const revealRef = useRef(onRevealRequest);  // 避免 stale closure
useEffect(() => { revealRef.current = onRevealRequest; }, [onRevealRequest]);
```

### 2. 响应 shouldHide prop

扇形展开（`isExpandedRef.value === 1`）时忽略隐藏请求，保持当前状态不变。

```ts
useEffect(() => {
  if (shouldHide) {
    // 扇形展开时不隐藏
    if (isExpandedRef.value === 1) return;
    fabTranslateY.value = withTiming(PEEK_TRANSLATE_Y, { duration: 200 });
    isHiddenRef.current = true;
  } else {
    fabTranslateY.value = withSpring(0, { damping: 15, stiffness: 250, overshootClamping: false });
    isHiddenRef.current = false;
  }
}, [shouldHide]);
```

### 3. Animated style

应用于 `fabContainer`（最外层绝对定位容器），确保按钮主体、tipBubble、labelContainer 和遮罩层均随整体一起移动，并避免跨平台 overflow 裁剪问题：

```ts
const fabTranslateYStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: fabTranslateY.value }],
}));
```

将 `<RNAnimated.View style={[styles.fabContainer, buttonAreaStyle]}>` 替换为：

```tsx
<Animated.View style={[styles.fabContainer, fabTranslateYStyle]}>
```

同时移除 `buttonAreaStyle` 变量（其 opacity/transform 逻辑已不再需要）。

> **注意：** translateY 施加在 `fabContainer` 层级，而非仅在 `mainButtonWrapper`，原因是：
> 1. 扇形选项和遮罩层（backdropOverlay / optionsOverlay）作为兄弟元素需单独处理（见边界情况）
> 2. `fabContainer` 使用 `position: absolute`，transform 在此层最为直接
> 3. 避免 Android 默认 `overflow: hidden` 对子元素的裁剪

### 4. 扇形/遮罩层同步

由于规则"扇形展开时不触发隐藏"，当 `shouldHide=true` 时扇形必然处于收起状态，因此 backdropOverlay / optionsOverlay 不会可见，无需额外处理。

### 5. PanResponder 隐藏状态处理

**`onPanResponderGrant`：**
```ts
onPanResponderGrant: () => {
  isPressing.current = true;
  hasRevealedInMoveRef.current = false; // 重置双重唤回标志
  if (!isHiddenRef.current) {
    // 仅在显示状态下启动长按计时器
    longPressTimer.current = setTimeout(() => {
      if (isPressing.current) actionsRef.current.openFan();
    }, LONG_PRESS_MS);
  }
},
```

**`onPanResponderMove`：**
```ts
onPanResponderMove: (_evt, gestureState) => {
  if (isHiddenRef.current) {
    // 隐藏状态：向上拖动超过 20dp 即唤回（仅触发一次）
    if (gestureState.dy < -20 && !hasRevealedInMoveRef.current) {
      hasRevealedInMoveRef.current = true;
      revealRef.current?.();
    }
    return;
  }
  if (isExpandedRef.value !== 1) return;
  hoveredIndex.value = hitTest(gestureState.dx, gestureState.dy);
},
```

**`onPanResponderRelease`：**
```ts
onPanResponderRelease: (_evt, gestureState) => {
  isPressing.current = false;
  actionsRef.current.clearTimer();

  if (isHiddenRef.current) {
    // 隐藏状态：仅当位移很小（视为点击）且 move 中未已唤回时才唤回
    const isTap = Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10;
    if (isTap && !hasRevealedInMoveRef.current) {
      revealRef.current?.();
    }
    return;
  }
  // 以下为原有逻辑不变...
},
```

---

## Timeline.v2.tsx 变更

### 1. 移除 FAB 旧动画变量

```ts
// 移除
const fabOpacity = useRef(new RNAnimated.Value(1)).current;
const fabScale = useRef(new RNAnimated.Value(1)).current;
```

### 2. 新增隐藏状态

```ts
const [fabShouldHide, setFabShouldHide] = useState(false);
```

### 3. handleScroll 中替换 FAB 动画调用

```ts
// 移除
RNAnimated.parallel([
  RNAnimated.timing(fabOpacity, { toValue: 0.2, ... }),
  RNAnimated.timing(fabScale, { toValue: 0.85, ... }),
]).start();
// 和
RNAnimated.parallel([
  RNAnimated.timing(fabOpacity, { toValue: 1, ... }),
  RNAnimated.timing(fabScale, { toValue: 1, ... }),
]).start();

// 替换为
if (scrollDirection === 'down' && offsetY > 50) {
  setFabShouldHide(true);
} else if (scrollDirection === 'up') {
  setFabShouldHide(false);
}
```

同时从 `handleScroll` 的 `useCallback` 依赖数组中移除 `fabOpacity`、`fabScale`。

### 4. FABMenu 调用处更新 Props

```tsx
// 移除
fabOpacity={fabOpacity}
fabScale={fabScale}

// 新增
shouldHide={fabShouldHide}
onRevealRequest={() => setFabShouldHide(false)}
```

---

## 边界情况

| 场景 | 处理方式 |
|------|---------|
| 扇形展开时 shouldHide=true | 忽略隐藏请求（useEffect 中 early return） |
| 隐藏状态下 move 触发唤回后 release | `hasRevealedInMoveRef` 防止二次调用 |
| 隐藏状态下向下拖动后松手 | `isTap` 判断过滤，不触发唤回 |
| 隐藏动画进行中再次触发 shouldHide=true | withTiming 覆盖无副作用，可忽略 |

---

## 验收标准

1. 向下滚动超过 50dp 时，FAB 平滑下滑（200ms），底部仅露出 10dp 弧形
2. 向上滚动时，FAB 弹性弹回（带轻微过冲）
3. 点击底部弧形时（手指位移 <10dp），FAB 弹性弹回
4. 按住弧形明显向上拖动（>20dp）时，FAB 弹性弹回（手动验证：按住底部小弧形并向上划动即可）
5. 隐藏状态下，不触发长按扇形、不触发单击功能
6. 再次向下滚动时可再次隐藏
7. 现有扇形展开、单击、双击等功能在显示状态下工作正常
8. TypeScript 零错误，所有测试通过
