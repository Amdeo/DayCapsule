# Home Topbar Flat Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变首页顶部排列与交互的前提下，把顶部从“圆形按钮 + 胶囊搜索框”替换成扁平工具栏语言。

**Architecture:** 这次是样式系统替换，不是信息架构调整。保留 `SearchBar` 的现有组合关系和稳定 testID，只收敛顶部按钮与搜索框的视觉 token，并让右侧云同步按钮同步进入同一套扁平样式体系。

**Tech Stack:** React Native, Expo, TypeScript, Jest, Testing Library, ESLint

---

## File Map

- Modify: `app/src/components/search-bar/SearchBar.styles.ts`
  - 搜索框、菜单按钮、模式按钮的扁平 token 来源
- Modify: `app/src/components/search-bar/SearchBarActions.tsx`
  - 保持现有排列与 testID，不改交互，只切换到新样式命名
- Modify: `app/src/components/__tests__/SearchBar.safe-area.test.tsx`
  - 把旧的圆形/胶囊断言替换为新的扁平基线
- Modify: `app/src/components/cloud-sync-status-button/CloudSyncStatusButton.styles.ts`
  - 让同步状态按钮跟顶部按钮统一为扁平矩形语言
- Modify: `app/src/components/__tests__/CloudSyncStatusButton.test.tsx`
  - 更新旧的圆形壳层断言
- Verify only: `app/src/components/SearchBar.tsx`
  - 确认 `paddingTop` safe-area 逻辑保持不变，不新增 props
- Verify only: `app/src/components/timeline-v2/TimelineHeaderArea.tsx`
  - 确认 `SearchBar` 组合关系不变
- Verify only: `app/src/components/timeline-v2/TimelineCloudSyncStatusAction.tsx`
  - 确认同步状态入口的交互路径不变

---

### Task 1: 锁定新的顶部视觉基线测试

**Files:**
- Modify: `app/src/components/__tests__/SearchBar.safe-area.test.tsx`
- Modify: `app/src/components/__tests__/CloudSyncStatusButton.test.tsx`
- Test: `app/src/components/__tests__/SearchBar.safe-area.test.tsx`
- Test: `app/src/components/__tests__/CloudSyncStatusButton.test.tsx`

- [ ] **Step 1: 先把 SearchBar 旧的圆形/胶囊断言改成新的扁平基线**

```tsx
it('keeps the menu button and search shell dimensions after the flat topbar redesign', () => {
  const { getByTestId } = render(<SearchBar />);

  expect(getByTestId('searchbar-menu-button-pressable')).toBeTruthy();
  expect(getByTestId('searchbar-menu-button')).toHaveStyle({
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8DED1',
    backgroundColor: '#F3EEE7',
  });
  expect(getByTestId('searchbar-search-box')).toHaveStyle({
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECE3D8',
    backgroundColor: '#F8F5F0',
  });
});
```

- [ ] **Step 2: 运行单测，确认它先失败**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
pnpm exec jest --runInBand --runTestsByPath src/components/__tests__/SearchBar.safe-area.test.tsx
```

Expected:

```text
FAIL src/components/__tests__/SearchBar.safe-area.test.tsx
Expected style ... borderRadius: 14 ... Received borderRadius: 24
```

- [ ] **Step 3: 把云同步按钮的旧圆形壳层断言改成同一套扁平基线**

```tsx
it('keeps the button shell at the expected flat topbar size', () => {
  const screen = render(<CloudSyncStatusButton uiState="synced" onPress={jest.fn()} />);

  expect(screen.getByTestId('cloud-sync-button')).toHaveStyle({
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8DED1',
    backgroundColor: '#F3EEE7',
  });
});
```

- [ ] **Step 4: 运行云同步按钮测试，确认也先失败**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
pnpm exec jest --runInBand --runTestsByPath src/components/__tests__/CloudSyncStatusButton.test.tsx
```

Expected:

```text
FAIL src/components/__tests__/CloudSyncStatusButton.test.tsx
Expected style ... borderRadius: 14 ... Received borderRadius: 24
```

- [ ] **Step 5: 提交测试基线改动**

```bash
cd /Users/cooper/Documents/code/MemoryCapsule
git add app/src/components/__tests__/SearchBar.safe-area.test.tsx app/src/components/__tests__/CloudSyncStatusButton.test.tsx
git commit -m "test: lock flat topbar visual baselines"
```

---

### Task 2: 把 SearchBar 从圆润气泡改成扁平工具栏语言

**Files:**
- Modify: `app/src/components/search-bar/SearchBar.styles.ts`
- Modify: `app/src/components/search-bar/SearchBarActions.tsx`
- Verify: `app/src/components/SearchBar.tsx`
- Test: `app/src/components/__tests__/SearchBar.safe-area.test.tsx`

- [ ] **Step 1: 在样式文件里引入新的顶部 token，替换旧 `circularButton` / 胶囊搜索框基线**

```ts
import { StyleSheet } from 'react-native';

const TOPBAR_BUTTON_SIZE = 48;
const TOPBAR_RADIUS = 14;
const TOPBAR_BORDER = '#E8DED1';
const TOPBAR_BUTTON_BG = '#F3EEE7';
const TOPBAR_SEARCH_BG = '#F8F5F0';

export const searchBarStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAF8F5',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    backgroundColor: TOPBAR_SEARCH_BG,
    borderRadius: TOPBAR_RADIUS,
    borderWidth: 1,
    borderColor: '#ECE3D8',
    paddingHorizontal: 16,
  },
  placeholder: {
    flex: 1,
    fontSize: 15,
    color: '#8F8477',
  },
  toolButton: {
    width: TOPBAR_BUTTON_SIZE,
    height: TOPBAR_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOPBAR_BUTTON_BG,
    borderRadius: TOPBAR_RADIUS,
    borderWidth: 1,
    borderColor: TOPBAR_BORDER,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
```

- [ ] **Step 2: 在 `SearchBarActions` 中把旧样式引用切到新 token，但不改排列、testID 和回调**

```tsx
<Animated.View
  testID="searchbar-menu-button"
  style={[styles.toolButton, menuButtonAnimatedStyle]}
>
  <Ionicons name="menu" size={24} color="#4A4A4A" />
</Animated.View>

<Pressable testID="searchbar-search-box" style={styles.searchBox} onPress={onSearchFocus}>
  <Text style={styles.placeholder}>搜索记忆...</Text>
  <Ionicons name="search" size={20} color="#6A89CC" />
</Pressable>

{onViewModePress ? (
  <Pressable
    testID="searchbar-view-mode-toggle"
    onPress={onViewModePress}
    style={styles.toolButton}
  >
    <Ionicons
      name={showViewModeActive ? 'layers' : 'layers-outline'}
      size={22}
      color={showViewModeActive ? '#6A89CC' : '#8F8477'}
    />
  </Pressable>
) : null}
```

- [ ] **Step 3: 确认 `SearchBar.tsx` 只继续负责 safe-area 和 controller，不新增新的结构性 props**

```tsx
export function SearchBar({
  onMenuPress,
  onSearchFocus,
  onViewModePress,
  showViewModeActive,
  rightActions,
}: SearchBarProps) {
  const insets = useSafeAreaInsets();
  const { animatedStyle, handlePressIn, handlePressOut } = useSearchBarController();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <SearchBarActions
        menuButtonAnimatedStyle={animatedStyle}
        onMenuPress={onMenuPress}
        onMenuPressIn={handlePressIn}
        onMenuPressOut={handlePressOut}
        onSearchFocus={onSearchFocus}
        onViewModePress={onViewModePress}
        showViewModeActive={showViewModeActive}
        rightActions={rightActions}
      />
    </View>
  );
}
```

- [ ] **Step 4: 运行 SearchBar 测试，确认新视觉基线和旧交互都通过**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
pnpm exec jest --runInBand --runTestsByPath src/components/__tests__/SearchBar.safe-area.test.tsx
```

Expected:

```text
PASS src/components/__tests__/SearchBar.safe-area.test.tsx
```

- [ ] **Step 5: 提交 SearchBar 扁平化改动**

```bash
cd /Users/cooper/Documents/code/MemoryCapsule
git add app/src/components/search-bar/SearchBar.styles.ts app/src/components/search-bar/SearchBarActions.tsx app/src/components/__tests__/SearchBar.safe-area.test.tsx
git commit -m "feat: flatten the home search bar shell"
```

---

### Task 3: 让右侧云同步按钮进入同一套扁平视觉系统

**Files:**
- Modify: `app/src/components/cloud-sync-status-button/CloudSyncStatusButton.styles.ts`
- Verify: `app/src/components/CloudSyncStatusButton.tsx`
- Verify: `app/src/components/timeline-v2/TimelineCloudSyncStatusAction.tsx`
- Modify: `app/src/components/__tests__/CloudSyncStatusButton.test.tsx`
- Test: `app/src/components/__tests__/CloudSyncStatusButton.test.tsx`

- [ ] **Step 1: 把云同步按钮外壳从圆形浮起改成与顶部按钮同体系的扁平矩形**

```ts
import { type ViewStyle } from 'react-native';

export const cloudSyncStatusButtonStyles = {
  button: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3EEE7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8DED1',
  },
  cloudWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(106, 137, 204, 0.18)',
    borderTopColor: '#6A89CC',
  },
} satisfies {
  button: ViewStyle;
  cloudWrap: ViewStyle;
  syncRing: ViewStyle;
};
```

- [ ] **Step 2: 确认按钮行为组件本身不变，只保留样式替换**

```tsx
export function CloudSyncStatusButton({ uiState, onPress }: CloudSyncStatusButtonProps) {
  const { breathe, rotation, floatY, completionScale } = useCloudSyncStatusButtonAnimation(uiState);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.button}
      testID="cloud-sync-button"
    >
      <View testID="cloud-sync-shell">
        <CloudSyncStatusButtonContent
          uiState={uiState}
          breathe={breathe}
          rotation={rotation}
          floatY={floatY}
          completionScale={completionScale}
        />
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 3: 运行云同步按钮测试，确认视觉基线更新后状态表达和点击不回归**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
pnpm exec jest --runInBand --runTestsByPath src/components/__tests__/CloudSyncStatusButton.test.tsx
```

Expected:

```text
PASS src/components/__tests__/CloudSyncStatusButton.test.tsx
```

- [ ] **Step 4: 复核组合层无需改逻辑**

```tsx
export function TimelineCloudSyncStatusAction() {
  const cloudSyncUiState = useCloudSyncIndicatorStore((state) => state.uiState);

  if (cloudSyncUiState === 'hidden') {
    return null;
  }

  return (
    <CloudSyncStatusButton
      uiState={cloudSyncUiState}
      onPress={() => {
        showCloudSyncMonitor();
      }}
    />
  );
}
```

- [ ] **Step 5: 提交同步按钮扁平化改动**

```bash
cd /Users/cooper/Documents/code/MemoryCapsule
git add app/src/components/cloud-sync-status-button/CloudSyncStatusButton.styles.ts app/src/components/__tests__/CloudSyncStatusButton.test.tsx
git commit -m "feat: flatten the cloud sync topbar button"
```

---

### Task 4: 做组合回归与视觉验收

**Files:**
- Verify: `app/src/components/timeline-v2/TimelineHeaderArea.tsx`
- Verify: `app/src/components/Timeline.v2.tsx`
- Test: `app/src/components/__tests__/SearchBar.safe-area.test.tsx`
- Test: `app/src/components/__tests__/CloudSyncStatusButton.test.tsx`
- Test: `app/src/components/__tests__/Timeline.v2.view-mode.test.tsx`

- [ ] **Step 1: 跑顶部相关回归，确保排列与交互锚点都没变**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
pnpm exec jest --runInBand --runTestsByPath \
  src/components/__tests__/SearchBar.safe-area.test.tsx \
  src/components/__tests__/CloudSyncStatusButton.test.tsx \
  src/components/__tests__/Timeline.v2.view-mode.test.tsx
```

Expected:

```text
PASS ... SearchBar.safe-area.test.tsx
PASS ... CloudSyncStatusButton.test.tsx
PASS ... Timeline.v2.view-mode.test.tsx
```

- [ ] **Step 2: 运行 lint 与 typecheck，确认这次只是视觉换皮，没有引入结构性问题**

Run:

```bash
cd /Users/cooper/Documents/code/MemoryCapsule/app
pnpm exec eslint \
  src/components/search-bar/SearchBar.styles.ts \
  src/components/search-bar/SearchBarActions.tsx \
  src/components/cloud-sync-status-button/CloudSyncStatusButton.styles.ts \
  src/components/__tests__/SearchBar.safe-area.test.tsx \
  src/components/__tests__/CloudSyncStatusButton.test.tsx
pnpm run typecheck
```

Expected:

```text
# eslint 无输出
> memorycapsule-app@1.0.0 typecheck
> tsc --noEmit
```

- [ ] **Step 3: 做一次真实页面截图验收**

Checklist:

```text
- 顶部不再出现圆形按钮
- 搜索框不再是胶囊形态
- 菜单 / 搜索 / 模式 / 同步状态排列不变
- 模式切换仍然按原来的路径工作
- 顶部观感更像扁平工具栏，而不是悬浮气泡组
```

- [ ] **Step 4: 提交组合验收结果**

```bash
cd /Users/cooper/Documents/code/MemoryCapsule
git add app/src/components/search-bar/SearchBar.styles.ts app/src/components/search-bar/SearchBarActions.tsx app/src/components/cloud-sync-status-button/CloudSyncStatusButton.styles.ts app/src/components/__tests__/SearchBar.safe-area.test.tsx app/src/components/__tests__/CloudSyncStatusButton.test.tsx
git commit -m "test: verify the flattened home topbar presentation"
```

---

## Self-Review

### Spec coverage

- “不改排列” 已由 `SearchBarActions.tsx` 仅切样式、保留现有 testID 和组合层保证。
- “不改交互” 已由 `SearchBar.tsx`、`TimelineCloudSyncStatusAction.tsx` 的 verify 步骤覆盖。
- “模式切换继续使用现在这套方式” 已通过不触碰 `TimelineViewModeToggle.tsx` 逻辑、并在 `Timeline.v2.view-mode.test.tsx` 回归中验证。
- “同步状态入口也纳入同一视觉系统” 已由 `CloudSyncStatusButton.styles.ts` 单独成任务。

### Placeholder scan

- 无 `TBD` / `TODO` / “自行处理样式”等占位语句。
- 每个代码步骤都给了具体代码，每个验证步骤都给了具体命令和预期输出。

### Type consistency

- 稳定沿用现有 testID：
  `searchbar-menu-button-pressable`
  `searchbar-menu-button`
  `searchbar-search-box`
  `searchbar-view-mode-toggle`
  `cloud-sync-button`
- 新样式统一使用 `toolButton`，避免后续混用 `circularButton` 旧命名。

