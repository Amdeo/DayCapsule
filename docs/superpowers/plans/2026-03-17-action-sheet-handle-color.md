# Action Sheet Handle Color Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除 `EntryActionSheet` 顶部独立类型色条，并将类型色直接放进顶部 handle。

**Architecture:** 只修改 `EntryActionSheet` 的顶部结构和样式，不改 `EntryCard`、`Timeline.v2`、触发逻辑或动画时序。测试只覆盖“独立色条消失”和“handle 使用类型色”两个回归点，避免把视觉测试写脆。

**Tech Stack:** React Native, `react-native-reanimated`, Jest, `@testing-library/react-native`, TypeScript

---

## File Structure

| 操作 | 文件 | 职责 |
|---|---|---|
| 改 | `app/src/components/EntryActionSheet.tsx` | 删除顶部色条，保留并染色 handle |
| 改 | `app/src/components/__tests__/EntryActionSheet.test.tsx` | 回归测试顶部结构和类型色映射 |

---

## Chunk 1: 测试先行

### Task 1: 为顶部结构调整补失败测试

**Files:**
- Modify: `app/src/components/__tests__/EntryActionSheet.test.tsx`

- [ ] **Step 1: 写失败测试，断言面板不再渲染独立色条**

在测试文件中为 `EntryActionSheet` 增加一个顶层结构测试。要求组件顶部色条必须有明确测试锚点，例如：

```tsx
expect(queryByTestId('action-sheet-type-bar')).toBeNull();
```

如果当前组件还没有对应 `testID`，先在测试里写出预期，再让实现去补最小锚点。

- [ ] **Step 2: 写失败测试，断言 handle 会按 `entryType` 使用类型色**

新增测试，至少覆盖一种类型（推荐 `text`）：

```tsx
it('uses the entry type color on the handle', () => {
  const { getByTestId } = render(
    <EntryActionSheet {...baseProps} visible={true} entryType="text" />
  );

  expect(getByTestId('action-sheet-handle')).toHaveStyle({
    backgroundColor: '#A491D3',
  });
});
```

再追加一个不同类型（推荐 `voice`），避免颜色映射被写死。

- [ ] **Step 3: 写失败测试，断言删除确认视图顶部也沿用同一个彩色 handle**

先进入确认态，再检查：

```tsx
fireEvent.press(getByTestId('action-sheet-delete'));
expect(getByTestId('action-sheet-handle')).toHaveStyle({
  backgroundColor: '#A491D3',
});
```

- [ ] **Step 4: 运行测试确认失败**

Run:

```bash
cd app && npx jest src/components/__tests__/EntryActionSheet.test.tsx --no-coverage
```

Expected:
- FAIL
- 原因是当前仍存在独立色条，或没有 `action-sheet-handle` / `action-sheet-type-bar` 测试锚点

---

## Chunk 2: 最小实现

### Task 2: 调整 EntryActionSheet 顶部结构

**Files:**
- Modify: `app/src/components/EntryActionSheet.tsx`

- [ ] **Step 1: 为顶部色条和 handle 加明确测试锚点**

在当前实现中加入：

```tsx
testID="action-sheet-type-bar"
testID="action-sheet-handle"
```

然后在后续步骤中删除 `type-bar` 节点，但保留 `handle` 锚点。

- [ ] **Step 2: 删除独立顶部色条节点**

移除当前独立色条这一层，例如：

```tsx
<View style={[styles.typeBar, { backgroundColor: typeColor }]} />
```

同时删掉只服务于它的 `typeBar` 样式。

- [ ] **Step 3: 将 handle 背景色改为类型色**

把：

```tsx
<View style={styles.handle} />
```

改成：

```tsx
<View
  testID="action-sheet-handle"
  style={[styles.handle, { backgroundColor: typeColor }]}
/>
```

- [ ] **Step 4: 调整顶部 spacing，补回删除色条后丢掉的留白**

如果移除色条后顶部显得太紧，只调整 `handle` 的 `marginTop` / `marginBottom` 或 `panel` 的 `paddingTop`。不要新增其它装饰。

目标是视觉上仍保持现在的呼吸感，但顶部只剩“一根彩色 handle”。

- [ ] **Step 5: 确认默认菜单态和删除确认态共享同一 handle 结构**

不要分别维护两套顶部 UI。`mode === 'menu'` 和 `mode === 'confirm'` 都应复用同一个 `handle` 节点。

- [ ] **Step 6: 运行测试确认通过**

Run:

```bash
cd app && npx jest src/components/__tests__/EntryActionSheet.test.tsx --no-coverage
```

Expected:
- PASS

- [ ] **Step 7: 提交**

```bash
cd app
git add src/components/EntryActionSheet.tsx src/components/__tests__/EntryActionSheet.test.tsx
git commit -m "feat: move action sheet type color into handle"
```

---

## Chunk 3: 最终验证

### Task 3: 回归验证

**Files:**
- No file changes required

- [ ] **Step 1: 运行相关测试**

Run:

```bash
cd app && npx jest src/components/__tests__/EntryActionSheet.test.tsx src/components/__tests__/EntryCard.test.tsx --no-coverage
```

Expected:
- PASS
- `EntryCard` 现有交互不受顶部视觉调整影响

- [ ] **Step 2: 运行全量测试**

Run:

```bash
cd app && npx jest --no-coverage
```

Expected:
- PASS

- [ ] **Step 3: 运行类型检查**

Run:

```bash
cd app && npx tsc --noEmit
```

Expected:
- 无 TypeScript 错误

- [ ] **Step 4: 人工核对视觉结果**

确认以下四点：

- 顶部独立色条已消失
- 顶部只剩一个彩色 handle
- `text / photo / voice` 三种类型颜色映射正确
- 删除确认态顶部仍然一致

---

## Notes for Executor

- 严格按 TDD 执行，这次不要先改样式再补测试。
- 不要顺手改面板动画、圆角、阴影、字体、按钮间距。
- 如果测试需要样式断言，优先断言 `backgroundColor` 和是否存在某个 `testID`，不要把整段 style object 全部锁死。
