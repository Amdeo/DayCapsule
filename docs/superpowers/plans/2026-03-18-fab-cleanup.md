# FAB 按钮精简 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 去除 FAB 主按钮下方的文字标签，并将 FAB 弹出动画从弹簧动画改为匀减速动画。

**Architecture:** 所有改动集中在单一文件 `app/src/components/FABMenu.tsx`。删除渲染层的 `labelContainer` JSX 及对应样式，清理相关无用变量；将 `shouldHide` 变为 `false` 时的 `withSpring(0, ...)` 替换为 `withTiming(0, { duration: 200 })`。测试在 `app/src/components/__tests__/FABMenu.peek-hide.test.tsx` 补充对应用例。

**Tech Stack:** React Native, Expo SDK 54, react-native-reanimated (withTiming/withSpring), Jest + react-test-renderer

---

## 文件变更地图

| 文件 | 操作 |
|------|------|
| `app/src/components/FABMenu.tsx` | 修改：删除 label 相关代码，替换回弹动画 |
| `app/src/components/__tests__/FABMenu.peek-hide.test.tsx` | 修改：新增两个测试用例 |

---

### Task 1: 为"无文字标签"写失败测试

**Files:**
- Modify: `app/src/components/__tests__/FABMenu.peek-hide.test.tsx`

- [ ] **Step 1: 在测试文件末尾新增测试用例**

在 `describe('FABMenu peek-hide', ...)` 块内，在已有两个用例之后添加：

```tsx
it('does not render a label text below the main FAB button when a type is selected', () => {
  const onSelect = jest.fn();
  let tree: renderer.ReactTestRenderer;

  act(() => {
    tree = renderer.create(<FABMenu onSelect={onSelect} />);
  });

  // lastAddType 在 mock 中固定为 'text'，若 label 未被移除则会渲染"文字"
  const allTexts = tree!.root
    .findAllByType(require('react-native').Text)
    .map((n: any) => n.props.children);

  expect(allTexts).not.toContain('文字');
});
```

- [ ] **Step 2: 运行测试，确认新用例失败**

```bash
cd app && npx jest FABMenu.peek-hide --no-coverage
```

预期：新增用例 FAIL（当前渲染了"文字"标签），已有两个用例仍 PASS。

---

### Task 2: 删除主按钮文字标签代码

**Files:**
- Modify: `app/src/components/FABMenu.tsx`

- [ ] **Step 1: 删除 labelContainer JSX 块**

定位并删除以下代码段（约第 291–297 行）：

```tsx
{/* 记忆标签 */}
{fabLabel !== null && (
  <View style={styles.labelContainer}>
    <Text style={styles.labelText}>{fabLabel}</Text>
  </View>
)}
```

- [ ] **Step 2: 删除 fabLabel 变量**

删除以下行（约第 240 行）：

```tsx
const fabLabel = fabConfig?.label ?? null;
```

- [ ] **Step 3: 删除 TYPE_CONFIG 中各条目的 label 字段**

将约第 63–68 行的 `TYPE_CONFIG` 改为：

```tsx
const TYPE_CONFIG: Record<LastAddType, { icon: string; color: string }> = {
  text:   { icon: 'create-outline', color: '#A491D3' },
  camera: { icon: 'camera',         color: '#77C9D4' },
  photo:  { icon: 'images',         color: '#57B8C8' },
  voice:  { icon: 'mic-outline',    color: '#F5A623' },
};
```

同时更新 `fabConfig` 的类型推断（无需显式改动，TypeScript 会自动推断）。

- [ ] **Step 4: 删除 labelContainer / labelText 样式**

删除 `StyleSheet.create({...})` 中的以下两个条目（约第 410–421 行）：

```tsx
labelContainer: {
  marginTop: 5,
  backgroundColor: 'rgba(255,255,255,0.95)',
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 10,
},
labelText: {
  fontSize: 11,
  fontWeight: '600',
  color: '#4A4A4A',
},
```

- [ ] **Step 5: 运行测试，确认 Task 1 新增用例现在 PASS**

```bash
cd app && npx jest FABMenu.peek-hide --no-coverage
```

预期：3 个用例全部 PASS。

- [ ] **Step 6: 确认 TypeScript 无错误**

```bash
cd app && npx tsc --noEmit
```

预期：无任何错误输出。

- [ ] **Step 7: 提交**

```bash
cd app && git add src/components/FABMenu.tsx src/components/__tests__/FABMenu.peek-hide.test.tsx
git commit -m "feat: remove text label below FAB main button"
```

---

### Task 3: 为"无回弹动画"写失败测试

**Files:**
- Modify: `app/src/components/__tests__/FABMenu.peek-hide.test.tsx`

- [ ] **Step 1: 在测试文件末尾新增测试用例**

```tsx
it('uses withTiming (not withSpring) to reveal the FAB when shouldHide becomes false', () => {
  const onSelect = jest.fn();
  const withTimingSpy = jest.spyOn(Reanimated, 'withTiming');
  const withSpringSpy = jest.spyOn(Reanimated, 'withSpring');

  let tree: renderer.ReactTestRenderer;

  // 先以 shouldHide=true 渲染，再切换为 false 触发 reveal 动画
  act(() => {
    tree = renderer.create(<FABMenu onSelect={onSelect} shouldHide />);
  });

  withTimingSpy.mockClear();
  withSpringSpy.mockClear();

  act(() => {
    tree!.update(<FABMenu onSelect={onSelect} shouldHide={false} />);
  });

  // reveal 时应调用 withTiming(0, { duration: 200 })
  expect(withTimingSpy).toHaveBeenCalledWith(0, expect.objectContaining({ duration: 200 }));
  // reveal 时不应调用 withSpring
  expect(withSpringSpy).not.toHaveBeenCalled();

  withTimingSpy.mockRestore();
  withSpringSpy.mockRestore();
});
```

- [ ] **Step 2: 运行测试，确认新用例失败**

```bash
cd app && npx jest FABMenu.peek-hide --no-coverage
```

预期：新增用例 FAIL（当前 reveal 使用 `withSpring`），已有用例仍 PASS。

---

### Task 4: 将 FAB 弹出动画替换为 withTiming

**Files:**
- Modify: `app/src/components/FABMenu.tsx`

- [ ] **Step 1: 替换 reveal 动画（第 118 行）**

找到以下代码：

```tsx
fabTranslateY.value = withSpring(0, { damping: 15, stiffness: 250, overshootClamping: false });
```

替换为：

```tsx
fabTranslateY.value = withTiming(0, { duration: 200 });
```

- [ ] **Step 2: 运行测试，确认 Task 3 新增用例现在 PASS**

```bash
cd app && npx jest FABMenu.peek-hide --no-coverage
```

预期：4 个用例全部 PASS。

- [ ] **Step 3: 确认 TypeScript 无错误**

```bash
cd app && npx tsc --noEmit
```

预期：无任何错误输出。

- [ ] **Step 4: 提交**

```bash
cd app && git add src/components/FABMenu.tsx src/components/__tests__/FABMenu.peek-hide.test.tsx
git commit -m "fix: replace FAB reveal spring animation with withTiming"
```

---

## 验收清单

- [ ] 主 FAB 按钮在选择过类型后，只显示图标，无文字标签
- [ ] FAB 从底部滑回时，动画平滑无弹跳
- [ ] 扇形展开/收起动画不受影响（`withSpring(1, SPRING_CONFIG)` 未改动）
- [ ] 首次启动气泡提示不受影响
- [ ] 所有测试通过：`cd app && npx jest --no-coverage`
- [ ] TypeScript 无错误：`cd app && npx tsc --noEmit`
