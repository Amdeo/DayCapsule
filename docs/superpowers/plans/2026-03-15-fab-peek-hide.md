# FAB Peek-Hide Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace FAB's semi-transparent hide (opacity 0.2 + scale 0.85) with a slide-to-bottom behavior that leaves a 10dp arc peeking, with three reveal methods: scroll up, tap arc, drag-up on arc.

**Architecture:** FABMenu gains a `shouldHide` boolean prop and internal Reanimated `translateY` animation; Timeline replaces the two `RNAnimated.Value` refs with a single `fabShouldHide` boolean state. PanResponder is extended to handle gestures when hidden.

**Tech Stack:** React Native (Expo SDK 54), react-native-reanimated v4 (`withTiming`, `withSpring`, `useSharedValue`, `useAnimatedStyle`), TypeScript

**Spec:** `docs/superpowers/specs/2026-03-15-fab-peek-hide-design.md`

---

## File Map

| File | Change |
|------|--------|
| `app/src/components/FABMenu.tsx` | Remove `fabOpacity`/`fabScale` props; add `shouldHide`/`onRevealRequest`; add Reanimated `translateY`; update PanResponder |
| `app/src/components/Timeline.v2.tsx` | Remove `fabOpacity`/`fabScale` refs; add `fabShouldHide` state; replace scroll animation; update FABMenu call site |

---

## Chunk 1: FABMenu Core Changes

### Task 1: FABMenu — constants, props, SharedValues, animated style

**Files:**
- Modify: `app/src/components/FABMenu.tsx`

**Key locations in current file:**
- Line 14: `Animated as RNAnimated` in react-native import — remove (only used in buttonAreaStyle and RNAnimated.View below)
- Lines 71–75: `FABMenuProps` interface — remove old props, add new props
- Line 77: component signature — update destructuring
- Lines 208–211: `buttonAreaStyle` object — remove (AFTER JSX is updated)
- Line 242: outer `<View style={styles.fabContainer}>` — change to `<Animated.View>`
- Line 243: inner `<RNAnimated.View style={[styles.mainButtonWrapper, buttonAreaStyle]}>` — change to `<View>`
- Line 265: `</RNAnimated.View>` — change to `</View>`
- Line 266: `</View>` (fabContainer close) — change to `</Animated.View>`

- [ ] **Step 1: Add PEEK constants after `LONG_PRESS_MS` (after line 39)**

  After `const LONG_PRESS_MS = 300;`, insert:
  ```ts
  const PEEK_HEIGHT = 10;
  const PEEK_TRANSLATE_Y = FAB_SIZE + FAB_BOTTOM - PEEK_HEIGHT; // 56 + 32 - 10 = 78
  ```

- [ ] **Step 2: Update `FABMenuProps` interface (lines 71–75)**

  Replace:
  ```ts
  interface FABMenuProps {
    onSelect: (type: 'text' | 'photo' | 'voice', photoResult?: PhotoResult) => void;
    fabOpacity?: RNAnimated.Value;
    fabScale?: RNAnimated.Value;
  }
  ```
  With:
  ```ts
  interface FABMenuProps {
    onSelect: (type: 'text' | 'photo' | 'voice', photoResult?: PhotoResult) => void;
    shouldHide?: boolean;
    onRevealRequest?: () => void;
  }
  ```

- [ ] **Step 3: Update component signature (line 77)**

  Replace:
  ```ts
  export function FABMenu({ onSelect, fabOpacity, fabScale }: FABMenuProps) {
  ```
  With:
  ```ts
  export function FABMenu({ onSelect, shouldHide, onRevealRequest }: FABMenuProps) {
  ```

- [ ] **Step 4: Add new refs and SharedValue after the existing callback refs section (after line 104)**

  After `useEffect(() => { setLastAddTypeRef.current = setLastAddType; }, [setLastAddType]);`, insert:
  ```ts
  // Peek-hide: translateY animation (0 = visible, PEEK_TRANSLATE_Y = hidden)
  const fabTranslateY = useSharedValue(0);
  const isHiddenRef = useRef(false);
  const hasRevealedInMoveRef = useRef(false);
  const revealRef = useRef(onRevealRequest);
  useEffect(() => { revealRef.current = onRevealRequest; }, [onRevealRequest]);
  ```

- [ ] **Step 5: Add `useEffect` to respond to `shouldHide` (immediately after the revealRef effect)**

  ```ts
  useEffect(() => {
    if (shouldHide) {
      if (isExpandedRef.value === 1) return;
      fabTranslateY.value = withTiming(PEEK_TRANSLATE_Y, { duration: 200 });
      isHiddenRef.current = true;
    } else {
      fabTranslateY.value = withSpring(0, { damping: 15, stiffness: 250, overshootClamping: false });
      isHiddenRef.current = false;
    }
  }, [shouldHide]);
  ```

- [ ] **Step 6: Add `fabTranslateYStyle` after existing `backdropAnimatedStyle`**

  After `const backdropAnimatedStyle = useAnimatedStyle(...)`, add:
  ```ts
  const fabTranslateYStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: fabTranslateY.value }],
  }));
  ```

- [ ] **Step 7: Replace animated wrapper in JSX — BEFORE removing buttonAreaStyle**

  In the JSX block (around lines 242–266), make two changes:

  **Change 1** — outer container (line 242): change `<View` to `<Animated.View` and add `fabTranslateYStyle`:
  ```tsx
  // Before:
  <View style={styles.fabContainer} pointerEvents="box-none">
  // After:
  <Animated.View style={[styles.fabContainer, fabTranslateYStyle]} pointerEvents="box-none">
  ```
  > Note: `pointerEvents="box-none"` works on Reanimated's `Animated.View` — verify on device that touches pass through to content below.

  **Change 2** — inner wrapper (line 243): change `<RNAnimated.View` to `<View` and remove `buttonAreaStyle`:
  ```tsx
  // Before:
  <RNAnimated.View style={[styles.mainButtonWrapper, buttonAreaStyle]}>
  // After:
  <View style={styles.mainButtonWrapper}>
  ```

  **Change 3** — closing tags (lines 265–266):
  ```tsx
  // Before:
      </RNAnimated.View>
    </View>
  // After:
      </View>
    </Animated.View>
  ```

- [ ] **Step 8: Remove `buttonAreaStyle` variable (lines 208–211) — AFTER JSX is updated**

  Delete this entire block:
  ```ts
  const buttonAreaStyle = {
    opacity: fabOpacity !== undefined ? fabOpacity : 1,
    transform: [{ scale: fabScale !== undefined ? fabScale : 1 }],
  };
  ```

- [ ] **Step 9: Remove `Animated as RNAnimated` from react-native import**

  First verify no remaining usages:
  ```bash
  grep -n 'RNAnimated' app/src/components/FABMenu.tsx
  ```
  Expected: zero results (all usages were in Props interface, buttonAreaStyle, and RNAnimated.View — all removed in steps 2, 7, 8).

  Then update line 14, change:
  ```ts
  import {
    View,
    Text,
    PanResponder,
    StyleSheet,
    Pressable,
    Dimensions,
    Animated as RNAnimated,
  } from 'react-native';
  ```
  To:
  ```ts
  import {
    View,
    Text,
    PanResponder,
    StyleSheet,
    Pressable,
    Dimensions,
  } from 'react-native';
  ```

- [ ] **Step 10: Verify TypeScript compiles**

  Run from `app/` directory:
  ```bash
  npx tsc --noEmit 2>&1 | head -40
  ```
  Expected: zero errors (or only pre-existing unrelated errors)

- [ ] **Step 11: Commit**

  ```bash
  git add app/src/components/FABMenu.tsx
  git commit -m "feat: FABMenu — add peek-hide constants, props, translateY animation"
  ```

---

### Task 2: FABMenu — update PanResponder for hidden state

> **Prerequisite:** Task 1 must be fully complete. `hasRevealedInMoveRef`, `isHiddenRef`, and `revealRef` are declared in Task 1 Step 4; Task 2 uses all three.

**Files:**
- Modify: `app/src/components/FABMenu.tsx` (PanResponder section, lines ~165–198)

- [ ] **Step 1: Update `onPanResponderGrant`**

  Replace:
  ```ts
  onPanResponderGrant: () => {
    isPressing.current = true;
    longPressTimer.current = setTimeout(() => {
      if (isPressing.current) actionsRef.current.openFan();
    }, LONG_PRESS_MS);
  },
  ```
  With:
  ```ts
  onPanResponderGrant: () => {
    isPressing.current = true;
    hasRevealedInMoveRef.current = false;
    if (!isHiddenRef.current) {
      longPressTimer.current = setTimeout(() => {
        if (isPressing.current) actionsRef.current.openFan();
      }, LONG_PRESS_MS);
    }
  },
  ```

- [ ] **Step 2: Update `onPanResponderMove`**

  Replace:
  ```ts
  onPanResponderMove: (_evt, gestureState) => {
    if (isExpandedRef.value !== 1) return;
    hoveredIndex.value = hitTest(gestureState.dx, gestureState.dy);
  },
  ```
  With:
  ```ts
  onPanResponderMove: (_evt, gestureState) => {
    if (isHiddenRef.current) {
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

- [ ] **Step 3: Update `onPanResponderRelease`**

  Replace:
  ```ts
  onPanResponderRelease: (_evt, gestureState) => {
    isPressing.current = false;
    actionsRef.current.clearTimer();

    if (isExpandedRef.value === 1) {
      const idx = hitTest(gestureState.dx, gestureState.dy);
      actionsRef.current.closeFan();
      if (idx >= 0) {
        setTimeout(() => actionsRef.current.triggerOption(FAN_OPTIONS[idx].type), 250);
      }
    } else {
      // 单击：触发上次记忆（从 ref 读取最新值）
      const current = lastAddTypeRef.current;
      if (current !== null) actionsRef.current.triggerOption(current);
    }
  },
  ```
  With:
  ```ts
  onPanResponderRelease: (_evt, gestureState) => {
    isPressing.current = false;
    actionsRef.current.clearTimer();

    if (isHiddenRef.current) {
      const isTap = Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10;
      if (isTap && !hasRevealedInMoveRef.current) {
        revealRef.current?.();
      }
      return;
    }

    if (isExpandedRef.value === 1) {
      const idx = hitTest(gestureState.dx, gestureState.dy);
      actionsRef.current.closeFan();
      if (idx >= 0) {
        setTimeout(() => actionsRef.current.triggerOption(FAN_OPTIONS[idx].type), 250);
      }
    } else {
      // 单击：触发上次记忆（从 ref 读取最新值）
      const current = lastAddTypeRef.current;
      if (current !== null) actionsRef.current.triggerOption(current);
    }
  },
  ```

- [ ] **Step 4: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit 2>&1 | head -40
  ```
  Expected: zero errors

- [ ] **Step 5: Commit**

  ```bash
  git add app/src/components/FABMenu.tsx
  git commit -m "feat: FABMenu — PanResponder hidden-state handling (tap/drag to reveal)"
  ```

---

## Chunk 2: Timeline Changes

### Task 3: Timeline.v2.tsx — replace RNAnimated FAB with state-driven shouldHide

**Files:**
- Modify: `app/src/components/Timeline.v2.tsx`

**Key locations in current file:**
- Line 7: `Animated as RNAnimated` in react-native import — **keep it** (still needed for `scrollTopOpacity`/`scrollTopScale` at lines 391–392 and `RNAnimated.View` at line 642)
- Line 6: `useState` already imported — no import change needed
- Lines 393–394: `fabOpacity` and `fabScale` useRef declarations — remove
- Line 395: `const lastScrollY = useRef(0);` — insert `fabShouldHide` state after this line
- Lines 443–471: FAB animation block in `handleScroll` — replace
- Line 492: `useCallback` deps — remove `fabOpacity`, `fabScale`
- Lines 678–682: FABMenu JSX — update props

- [ ] **Step 1: Add `fabShouldHide` state after `lastScrollY` (after line 395)**

  > Note: `useState` is already imported on line 6 — no import change needed.

  After `const lastScrollY = useRef(0);`, insert:
  ```ts
  const [fabShouldHide, setFabShouldHide] = useState(false);
  ```

- [ ] **Step 2: Remove `fabOpacity` and `fabScale` refs (lines 393–394)**

  Delete:
  ```ts
  const fabOpacity = useRef(new RNAnimated.Value(1)).current;
  const fabScale = useRef(new RNAnimated.Value(1)).current;
  ```

- [ ] **Step 3: Replace FAB animation block in `handleScroll` (lines 443–471)**

  Replace this entire block:
  ```ts
  // FAB 透明度和缩放：根据滚动方向变化
  if (scrollDirection === 'down' && offsetY > 50) {
    // 向下滑动：真透明 + 缩小
    RNAnimated.parallel([
      RNAnimated.timing(fabOpacity, {
        toValue: 0.2,
        duration: 200,
        useNativeDriver: true,
      }),
      RNAnimated.timing(fabScale, {
        toValue: 0.85,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  } else if (scrollDirection === 'up') {
    // 向上滑动：完全显示 + 恢复大小
    RNAnimated.parallel([
      RNAnimated.timing(fabOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      RNAnimated.timing(fabScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }
  ```
  With:
  ```ts
  // FAB peek-hide：向下滚动超过 50dp 时隐藏，向上滚动时显示
  if (scrollDirection === 'down' && offsetY > 50) {
    setFabShouldHide(true);
  } else if (scrollDirection === 'up') {
    setFabShouldHide(false);
  }
  ```

- [ ] **Step 4: Remove `fabOpacity` and `fabScale` from `handleScroll` useCallback deps (line 492)**

  Change:
  ```ts
  }, [showScrollTop, fabOpacity, fabScale, scrollTopOpacity]);
  ```
  To:
  ```ts
  }, [showScrollTop, scrollTopOpacity]);
  ```

- [ ] **Step 5: Update FABMenu call site in JSX (lines 678–682)**

  Replace:
  ```tsx
  <FABMenu
    onSelect={onQuickAdd ?? (() => {})}
    fabOpacity={fabOpacity}
    fabScale={fabScale}
  />
  ```
  With:
  ```tsx
  <FABMenu
    onSelect={onQuickAdd ?? (() => {})}
    shouldHide={fabShouldHide}
    onRevealRequest={() => setFabShouldHide(false)}
  />
  ```

- [ ] **Step 6: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit 2>&1 | head -40
  ```
  Expected: zero errors

- [ ] **Step 7: Run existing test suite**

  ```bash
  npx jest --passWithNoTests 2>&1 | tail -20
  ```
  Expected: all tests pass (35 cases)

- [ ] **Step 8: Commit**

  ```bash
  git add app/src/components/Timeline.v2.tsx
  git commit -m "feat: Timeline — state-driven FAB peek-hide, remove RNAnimated FAB values"
  ```

---

## Manual Acceptance Testing

After both chunks are complete, verify on device/simulator:

1. **向下滚动 >50dp** → FAB 平滑下滑（200ms），底部仅露出 10dp 弧形
2. **向上滚动** → FAB 弹性弹回（带轻微过冲）
3. **点击底部弧形**（手指不移动）→ FAB 弹性弹回
4. **按住弧形向上划 >20dp** → FAB 弹性弹回
5. **隐藏状态下长按** → 不弹出扇形
6. **隐藏状态下单击** → 不触发功能
7. **再次向下滚动** → 可再次隐藏
8. **显示状态下长按** → 扇形正常弹出
9. **显示状态下单击** → 触发上次记忆功能
