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
| 显示（弹回） | `withSpring` | `damping: 15, stiffness: 250` |

弹回动画允许轻微过冲（`overshootClamping: false`），视觉上更有活力。

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

---

## FABMenu 内部变更

### 1. 新增 SharedValue 与 Ref

```ts
const fabTranslateY = useSharedValue(0);   // Reanimated: 0=显示, 78=隐藏
const isHiddenRef = useRef(false);          // PanResponder 快速读取隐藏状态
const revealRef = useRef(onRevealRequest);  // 避免 stale closure
useEffect(() => { revealRef.current = onRevealRequest; }, [onRevealRequest]);
```

### 2. 响应 shouldHide prop

```ts
useEffect(() => {
  if (shouldHide) {
    fabTranslateY.value = withTiming(PEEK_TRANSLATE_Y, { duration: 200 });
    isHiddenRef.current = true;
  } else {
    fabTranslateY.value = withSpring(0, { damping: 15, stiffness: 250 });
    isHiddenRef.current = false;
  }
}, [shouldHide]);
```

### 3. Animated style

```ts
const fabTranslateYStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: fabTranslateY.value }],
}));
```

将 `<RNAnimated.View style={[styles.mainButtonWrapper, buttonAreaStyle]}>` 替换为：

```tsx
<Animated.View style={[styles.mainButtonWrapper, fabTranslateYStyle]}>
```

同时移除 `buttonAreaStyle` 变量及 `import Animated as RNAnimated from 'react-native'`。

### 4. PanResponder 隐藏状态处理

**`onPanResponderGrant`：**
```ts
onPanResponderGrant: () => {
  isPressing.current = true;
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
    // 隐藏状态：向上拖动超过 20dp 即唤回
    if (gestureState.dy < -20) revealRef.current?.();
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
    // 隐藏状态：点击（未大幅移动）即唤回，不触发任何功能
    revealRef.current?.();
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

## 验收标准

1. 向下滚动超过 50dp 时，FAB 平滑下滑（200ms），底部仅露出 10dp 弧形
2. 向上滚动时，FAB 弹性弹回（带轻微过冲）
3. 点击底部弧形时，FAB 弹性弹回
4. 按住弧形向上拖动超过 20dp 时，FAB 弹性弹回
5. 隐藏状态下，不触发长按扇形、不触发单击功能
6. 再次向下滚动时可再次隐藏
7. 现有扇形展开、单击、双击等功能在显示状态下工作正常
8. TypeScript 零错误，所有测试通过
