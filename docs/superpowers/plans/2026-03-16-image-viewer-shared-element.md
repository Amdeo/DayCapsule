# 图片查看器共享元素过渡动画 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为图片查看器实现微信朋友圈风格共享元素过渡动画——打开时从缩略图飞入全屏，关闭时飞回缩略图原位。

**Architecture:** 在 `EntryCard` 打开图片查看器前用 `measureInWindow` 采集缩略图坐标，通过 `originLayout` + `thumbnailRef` props 传给 `ImageViewer`；`ImageViewer` 新增 `phase` 状态机（idle→opening→open→closing/closing-fade）和英雄覆盖层（绝对定位 `Animated.Image`），由 Reanimated shared values 驱动位置/尺寸动画，动画完成后通过 `useEffect` 切换 phase。

**Tech Stack:** React Native 0.81.5、react-native-reanimated v3、react-native-gesture-handler、TypeScript 5.9

---

## Chunk 1: EntryCard — 采集坐标并传递 props

### Task 1: 更新 ImageViewer 接口类型（纯类型，无逻辑变更）

**Files:**
- Modify: `app/src/components/ImageViewer.tsx`

- [ ] **Step 1: 在文件顶部添加 `OriginLayout` 接口并扩展 `ImageViewerProps`**

  在 `ImageViewerProps` 接口前添加：

  ```ts
  export interface OriginLayout {
    x: number;
    y: number;
    width: number;
    height: number;
  }
  ```

  将 `ImageViewerProps` 扩展为：

  ```ts
  interface ImageViewerProps {
    visible: boolean;
    imageUri: string;
    onClose: () => void;
    originLayout?: OriginLayout;
    thumbnailRef?: React.RefObject<React.ElementRef<typeof Image>>;
  }
  ```

  同时在文件顶部 import 处补充缺失的 `Easing`（后续 Task 会用到）：

  ```ts
  import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    cancelAnimation,
    runOnJS,
    Easing,
  } from 'react-native-reanimated';
  ```

- [ ] **Step 2: 确认 TypeScript 编译无报错**

  ```bash
  cd app && npx tsc --noEmit 2>&1 | head -30
  ```

  期望：无新增错误（现有错误数量不变或减少）。

- [ ] **Step 3: Commit**

  ```bash
  cd app && git add src/components/ImageViewer.tsx
  git commit -m "feat: add OriginLayout type and extend ImageViewerProps"
  ```

---

### Task 2: EntryCard — 添加 ref、state 并修改打开逻辑

**Files:**
- Modify: `app/src/components/EntryCard.tsx`

- [ ] **Step 1: 在现有 import 列表末尾补充 `OriginLayout` 的导入**

  ```ts
  import { ImageViewer, OriginLayout } from './ImageViewer';
  ```

  （替换原有的 `import { ImageViewer } from './ImageViewer';`）

- [ ] **Step 2: 在 `EntryCard` 函数体内，紧接 `const [showImageViewer, setShowImageViewer] = useState(false);` 后添加**

  ```ts
  const [originLayout, setOriginLayout] = useState<OriginLayout | null>(null);
  const thumbnailRef = useRef<React.ElementRef<typeof Image>>(null);
  ```

  确认顶部已有 `useRef` import（来自 `react`）。

- [ ] **Step 3: 替换 `handleImagePress` 实现**

  将原有：

  ```ts
  const handleImagePress = () => {
    if (photoError) return;
    logger.log('图片被点击，打开查看器');
    setShowImageViewer(true);
  };
  ```

  替换为：

  ```ts
  const handleImagePress = () => {
    if (photoError) return;
    logger.log('图片被点击，打开查看器');
    if (thumbnailRef.current) {
      thumbnailRef.current.measureInWindow((x, y, width, height) => {
        setOriginLayout({ x, y, width, height });
        setShowImageViewer(true);
      });
    } else {
      setShowImageViewer(true);
    }
  };
  ```

- [ ] **Step 4: 替换 `handleCardPress` 中 `case 'photo'` 的打开逻辑**

  将原有：

  ```ts
  case 'photo':
    logger.log('图片记录，打开图片查看器');
    if (photoError) return;
    setShowImageViewer(true);
    break;
  ```

  替换为：

  ```ts
  case 'photo':
    logger.log('图片记录，打开图片查看器');
    if (photoError) return;
    if (thumbnailRef.current) {
      thumbnailRef.current.measureInWindow((x, y, width, height) => {
        setOriginLayout({ x, y, width, height });
        setShowImageViewer(true);
      });
    } else {
      setShowImageViewer(true);
    }
    break;
  ```

- [ ] **Step 5: 在缩略图 `<Image>` 组件上挂载 ref**

  找到（约第 351 行）：

  ```tsx
  <Image
    source={{ uri: PhotoService.resolvePhotoUri(entry.media?.thumbnail || entry.media.uri) }}
    style={[
      styles.photoImage,
      { height: calculateImageHeight(entry.media?.metadata?.aspectRatio, maxPhotoHeight) }
    ]}
    resizeMode="contain"
    testID="photo-image"
    onError={() => setPhotoError(true)}
  />
  ```

  添加 `ref={thumbnailRef}`：

  ```tsx
  <Image
    ref={thumbnailRef}
    source={{ uri: PhotoService.resolvePhotoUri(entry.media?.thumbnail || entry.media.uri) }}
    style={[
      styles.photoImage,
      { height: calculateImageHeight(entry.media?.metadata?.aspectRatio, maxPhotoHeight) }
    ]}
    resizeMode="contain"
    testID="photo-image"
    onError={() => setPhotoError(true)}
  />
  ```

- [ ] **Step 6: 更新 `<ImageViewer>` JSX，传递新 props**

  找到（约第 490 行）：

  ```tsx
  <ImageViewer
    visible={showImageViewer}
    imageUri={entry.media.uri}
    onClose={() => setShowImageViewer(false)}
  />
  ```

  替换为：

  ```tsx
  <ImageViewer
    visible={showImageViewer}
    imageUri={entry.media.uri}
    onClose={() => {
      setShowImageViewer(false);
      setOriginLayout(null);
    }}
    originLayout={originLayout ?? undefined}
    thumbnailRef={thumbnailRef}
  />
  ```

- [ ] **Step 7: 确认 TypeScript 编译无新增报错**

  ```bash
  cd app && npx tsc --noEmit 2>&1 | head -30
  ```

- [ ] **Step 8: Commit**

  ```bash
  cd app && git add src/components/EntryCard.tsx
  git commit -m "feat: collect thumbnail layout and pass to ImageViewer"
  ```

---

## Chunk 2: ImageViewer — 状态机 + 英雄覆盖层 + 动画

### Task 3: 添加 phase 状态机与英雄图 shared values

**Files:**
- Modify: `app/src/components/ImageViewer.tsx`

- [ ] **Step 1: 在 `ImageViewer` 函数体内，现有 shared values 声明区域之后添加**

  ```ts
  type Phase = 'idle' | 'opening' | 'open' | 'closing' | 'closing-fade';
  const [phase, setPhase] = useState<Phase>('idle');

  // 英雄覆盖层动画值（position: absolute 坐标）
  const heroLeft = useSharedValue(0);
  const heroTop = useSharedValue(0);
  const heroWidth = useSharedValue(SCREEN_WIDTH);
  const heroHeight = useSharedValue(SCREEN_HEIGHT);
  ```

  同时在文件顶部添加 `useState` import（若已有则跳过）。

- [ ] **Step 2: 替换 `visible` 变化的 `useEffect`，引入 opening 动画**

  将原有（约第 79 行）：

  ```ts
  useEffect(() => {
    if (visible) {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      dismissY.value = 0;
      dismissScale.value = 1;
      backdropOpacity.value = 1;
      panMode.value = 0;
      setShowActionSheet(false);
    }
  }, [visible]);
  ```

  替换为：

  ```ts
  useEffect(() => {
    if (visible) {
      // 重置手势层状态
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      dismissY.value = 0;
      dismissScale.value = 1;
      panMode.value = 0;
      setShowActionSheet(false);

      if (originLayout) {
        // 有坐标：初始化英雄图位置，启动 opening 动画
        heroLeft.value = originLayout.x;
        heroTop.value = originLayout.y;
        heroWidth.value = originLayout.width;
        heroHeight.value = originLayout.height;
        backdropOpacity.value = 0;
        setPhase('opening');
      } else {
        // 无坐标：降级为淡入
        backdropOpacity.value = withTiming(1, { duration: 250 });
        setPhase('open');
      }
    } else {
      setPhase('idle');
    }
  }, [visible]);
  ```

- [ ] **Step 3: 添加 opening 阶段动画的 useEffect**

  紧接上一个 `useEffect` 之后添加：

  ```ts
  // opening 动画：英雄图从缩略图坐标飞入全屏
  useEffect(() => {
    if (phase !== 'opening') return;
    const springConfig = { damping: 28, stiffness: 300 };
    heroLeft.value = withSpring(0, springConfig);
    heroTop.value = withSpring(0, springConfig);
    heroWidth.value = withSpring(SCREEN_WIDTH, springConfig);
    heroHeight.value = withSpring(SCREEN_HEIGHT, springConfig, (finished) => {
      if (finished) runOnJS(setPhase)('open');
    });
    backdropOpacity.value = withSpring(1, springConfig);
  }, [phase]);
  ```

- [ ] **Step 4: 确认 TypeScript 编译无新增报错**

  ```bash
  cd app && npx tsc --noEmit 2>&1 | head -30
  ```

- [ ] **Step 5: Commit**

  ```bash
  cd app && git add src/components/ImageViewer.tsx
  git commit -m "feat: add phase state machine and opening animation"
  ```

---

### Task 4: 实现 triggerClose、closing 动画与 onRequestClose

**Files:**
- Modify: `app/src/components/ImageViewer.tsx`

- [ ] **Step 1: 在 `performClose` 之后添加 `triggerClose` 和 `triggerCloseAnimation` 函数**

  ```ts
  // 启动关闭流程：预设英雄图初始位置 → 切换 phase
  // capturedDismissY：下滑手势松手时的当前偏移（单击关闭时传 0）。
  // 说明：Spec §4.3 原文为"直接读取 dismissY.value"，但因 triggerClose 通过
  // runOnJS 从 worklet 调用，dismissY.value 在 pan.onEnd worklet 中已停止动画，
  // 此时读取的值与手势松手瞬间一致。为避免跨线程语义歧义，改为在 worklet 侧
  // 捕获值后传参，两种方式结果等价。
  const triggerClose = (capturedDismissY: number = 0) => {
    cancelAnimation(dismissY);
    cancelAnimation(backdropOpacity);
    // 预设英雄图起点（不启动动画，挂载后再由 useEffect 启动）
    heroLeft.value = 0;
    heroTop.value = capturedDismissY;   // 当前图片真实位置
    heroWidth.value = SCREEN_WIDTH;
    heroHeight.value = SCREEN_HEIGHT;
    // 重置手势层（即将隐藏，无视觉影响）
    dismissY.value = 0;
    dismissScale.value = 1;
    setPhase('closing');
  };

  // closing 阶段动画：在英雄图挂载后（useEffect）执行
  const triggerCloseAnimation = () => {
    if (!thumbnailRef?.current) {
      startFadeClose();
      return;
    }
    thumbnailRef.current.measureInWindow((x, y, width, height) => {
      const isVisible = y + height > 0 && y < SCREEN_HEIGHT;
      if (isVisible) {
        const closingTiming = {
          duration: 250,
          easing: Easing.out(Easing.cubic),
        };
        heroLeft.value = withTiming(x, closingTiming);
        heroTop.value = withTiming(y, closingTiming);
        heroWidth.value = withTiming(width, closingTiming);
        heroHeight.value = withTiming(height, closingTiming, (finished) => {
          if (finished) runOnJS(performClose)();
        });
        backdropOpacity.value = withTiming(0, closingTiming);
      } else {
        startFadeClose();
      }
    });
  };

  const startFadeClose = () => {
    backdropOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) runOnJS(performClose)();
    });
  };
  ```

- [ ] **Step 2: 添加 closing 阶段动画触发的 useEffect**

  紧接 opening 的 useEffect 之后添加：

  ```ts
  // closing 动画：英雄图已挂载，安全启动飞回或淡出
  useEffect(() => {
    if (phase !== 'closing') return;
    triggerCloseAnimation();
  }, [phase]);
  ```

- [ ] **Step 3: 修改 `singleTapGesture.onEnd`**

  将原有：

  ```ts
  .onEnd(() => {
    backdropOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(performClose)();
      }
    });
  });
  ```

  替换为：

  ```ts
  .onEnd(() => {
    runOnJS(triggerClose)(0);
  });
  ```

- [ ] **Step 4: 修改 `panGesture.onEnd` 中的 dismiss 分支**

  找到（约第 182 行）：

  ```ts
  if (dismissY.value > DISMISS_THRESHOLD) {
    // Complete dismiss
    dismissY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
    backdropOpacity.value = withTiming(0, { duration: 250 }, (finished) => {
      if (finished) {
        dismissY.value = 0;
        dismissScale.value = 1;
        runOnJS(performClose)();
      }
    });
  }
  ```

  替换为：

  ```ts
  if (dismissY.value > DISMISS_THRESHOLD) {
    // 记录当前偏移，启动飞回关闭
    const currentDismissY = dismissY.value;
    runOnJS(triggerClose)(currentDismissY);
  }
  ```

- [ ] **Step 5: 修改 `onRequestClose`（Android 返回键）**

  找到 Modal 的 `onRequestClose` prop：

  ```ts
  onRequestClose={() => {
    backdropOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(performClose)();
      }
    });
  }}
  ```

  替换为：

  ```ts
  onRequestClose={() => {
    triggerClose(0);
  }}
  ```

- [ ] **Step 6: 确认 TypeScript 编译无新增报错**

  ```bash
  cd app && npx tsc --noEmit 2>&1 | head -30
  ```

- [ ] **Step 7: Commit**

  ```bash
  cd app && git add src/components/ImageViewer.tsx
  git commit -m "feat: implement triggerClose, closing animation and fix onRequestClose"
  ```

---

### Task 5: 更新渲染结构 — 英雄覆盖层 + phase 控制层可见性

**Files:**
- Modify: `app/src/components/ImageViewer.tsx`

- [ ] **Step 1: 添加英雄图 `useAnimatedStyle`**

  在现有 `backdropAnimatedStyle` 之后添加：

  ```ts
  const heroAnimatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: heroLeft.value,
    top: heroTop.value,
    width: heroWidth.value,
    height: heroHeight.value,
    backgroundColor: '#000000',
  }));
  ```

- [ ] **Step 2: 更新 JSX 渲染结构**

  将现有 Modal 内容（从 `<Animated.View` backdrop 到 `</GestureHandlerRootView>` 前）替换为以下结构：

  ```tsx
  {/* 遮罩（始终渲染）*/}
  <Animated.View
    style={[StyleSheet.absoluteFill, styles.backdrop, backdropAnimatedStyle]}
  />

  {/* 英雄覆盖层：opening / closing 阶段 */}
  {(phase === 'opening' || phase === 'closing') && (
    <Animated.Image
      source={{ uri: imageUri }}
      style={heroAnimatedStyle}
      resizeMode="contain"
    />
  )}

  {/* 手势交互层：open 阶段 */}
  {phase === 'open' && (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={styles.imageContainer}>
        <Animated.View style={imageAnimatedStyle}>
          <Image
            source={{ uri: imageUri }}
            style={[styles.image, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}
            resizeMode="contain"
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  )}

  {/* Action Sheet — 完整保留原有 JSX，位置移至手势层之后 */}
  {showActionSheet && (
    <View style={styles.actionSheetOverlay}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => setShowActionSheet(false)}
      />
      <View style={[styles.actionSheet, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.actionSheetHandle} />
        <TouchableOpacity
          style={styles.actionSheetItem}
          onPress={handleSaveToAlbum}
          activeOpacity={0.7}
        >
          <Text style={styles.actionSheetItemText}>保存到相册</Text>
        </TouchableOpacity>
        <View style={styles.actionSheetDivider} />
        <TouchableOpacity
          style={styles.actionSheetItem}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Text style={styles.actionSheetItemText}>分享</Text>
        </TouchableOpacity>
        <View style={styles.actionSheetGap} />
        <TouchableOpacity
          style={styles.actionSheetItem}
          onPress={() => setShowActionSheet(false)}
          activeOpacity={0.7}
        >
          <Text style={styles.actionSheetCancelText}>取消</Text>
        </TouchableOpacity>
      </View>
    </View>
  )}
  ```

  > 注意：`closing-fade` 阶段英雄图不挂载（`startFadeClose` 只操作 `backdropOpacity`，无需英雄图），这是正确的。
  >
  > `GestureHandlerRootView` 的根容器已有 `style={{ flex: 1 }}`，Modal `statusBarTranslucent` 时全屏坐标系与 `measureInWindow` 返回值一致，英雄图 `position: 'absolute'` 坐标正确。

- [ ] **Step 3: 确认 TypeScript 编译无新增报错**

  ```bash
  cd app && npx tsc --noEmit 2>&1 | head -30
  ```

- [ ] **Step 4: Commit**

  ```bash
  cd app && git add src/components/ImageViewer.tsx
  git commit -m "feat: add hero overlay layer and phase-driven render structure"
  ```

---

### Task 6: 设备旋转降级处理

**Files:**
- Modify: `app/src/components/ImageViewer.tsx`

- [ ] **Step 1: 添加旋转检测 useEffect**

  在现有 shared values 声明区之后、第一个 `useEffect` 之前，添加 ref（组件级别声明，非 effect 内部）：

  ```ts
  const prevDimensions = useRef({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
  ```

  然后在所有现有 `useEffect` 之后添加旋转检测 effect：

  ```ts
  // 旋转降级处理
  // - opening/closing 阶段：立即中止动画，降级为淡出关闭
  // - open 阶段：无需操作。triggerClose 在关闭时会重新调用 measureInWindow
  //   获取旋转后的最新缩略图坐标，自然处理旋转场景
  useEffect(() => {
    if (
      prevDimensions.current.width === SCREEN_WIDTH &&
      prevDimensions.current.height === SCREEN_HEIGHT
    ) {
      return;
    }
    prevDimensions.current = { width: SCREEN_WIDTH, height: SCREEN_HEIGHT };
    if (phase === 'opening' || phase === 'closing') {
      cancelAnimation(heroLeft);
      cancelAnimation(heroTop);
      cancelAnimation(heroWidth);
      cancelAnimation(heroHeight);
      cancelAnimation(backdropOpacity);
      backdropOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
        // 直接内联淡出逻辑，避免 startFadeClose 的 exhaustive-deps 问题
        if (finished) runOnJS(performClose)();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // 原因：heroLeft/Top/Width/Height/backdropOpacity 为 Reanimated shared values，
    // 稳定引用；phase/performClose 在此 effect 生命周期内不会变化；
    // 仅需响应尺寸变化，刻意排除其他依赖。
  }, [SCREEN_WIDTH, SCREEN_HEIGHT]);
  ```

  > 注意：`SCREEN_WIDTH` 和 `SCREEN_HEIGHT` 来自 `useWindowDimensions()`，React 会在尺寸变化时重新渲染，触发此 `useEffect`。

- [ ] **Step 2: 确认 TypeScript 编译无新增报错**

  ```bash
  cd app && npx tsc --noEmit 2>&1 | head -30
  ```

- [ ] **Step 3: Commit**

  ```bash
  cd app && git add src/components/ImageViewer.tsx
  git commit -m "feat: handle device rotation during hero animation"
  ```

---

### Task 7: 更新单元测试 mock

**Files:**
- Modify: `app/src/components/__tests__/EntryCard.missing-media.test.tsx`

- [ ] **Step 1: 更新 ImageViewer mock，接受新 props**

  找到（约第 36 行）：

  ```ts
  jest.mock('../ImageViewer', () => {
    const { View } = require('react-native');
    return {
      ImageViewer: ({ visible }: { visible: boolean }) =>
        visible ? <View testID="image-viewer" /> : null,
    };
  });
  ```

  替换为：

  ```ts
  jest.mock('../ImageViewer', () => {
    const { View } = require('react-native');
    return {
      ImageViewer: ({ visible }: { visible: boolean; originLayout?: unknown; thumbnailRef?: unknown }) =>
        visible ? <View testID="image-viewer" /> : null,
    };
  });
  ```

- [ ] **Step 2: 运行测试**

  ```bash
  cd app && npx jest src/components/__tests__/EntryCard.missing-media.test.tsx --no-coverage 2>&1 | tail -20
  ```

  期望：所有测试 PASS。

- [ ] **Step 3: 运行完整测试套件**

  ```bash
  cd app && npx jest --no-coverage 2>&1 | tail -20
  ```

  期望：35 个测试用例全部 PASS（或原有通过数量不变）。

- [ ] **Step 4: Commit**

  ```bash
  cd app && git add src/components/__tests__/EntryCard.missing-media.test.tsx
  git commit -m "test: update ImageViewer mock to accept new optional props"
  ```

---

## 手动验证检查清单

完成以上所有 Task 后，在真机或模拟器上验证以下场景（参考规格 §9 测试要点）：

- [ ] 点击缩略图 → 图片从缩略图位置飞入全屏，遮罩同步淡入
- [ ] 全屏时单击 → 图片飞回缩略图原位，遮罩淡出
- [ ] 全屏时下滑超阈值松手 → 图片从偏移位置飞回缩略图原位
- [ ] Timeline 往上滚动让缩略图出屏，再打开查看器后关闭 → 淡出降级
- [ ] 快速连续打开/关闭 3 次 → 动画流畅，无状态残留
- [ ] 双击缩放后单击关闭 → 正常飞回（手势层不干扰）
