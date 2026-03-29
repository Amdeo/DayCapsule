# Editor Save Leave Guard Test Granularity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为编辑器写入路径补齐高颗粒度 Jest 与 Android Maestro 回归，锁定默认态、保存成功/失败、脏态判断和未保存离开保护。

**Architecture:** 这份计划只覆盖 `ED-*` 场景，继续沿用现有 `renderEntryEditor` helper 和 `entry-editor.*.test.tsx` 套件，不重建新的测试层。先补 Jest 行为断言，再用 `app-core/editor-unsaved-leave-guard.yaml` 锁 Android 返回键闭环。

**Tech Stack:** React Native, Jest, React Native Testing Library, TypeScript, Maestro YAML, Android emulator

---

## File Structure

- Modify: `app/src/components/__tests__/helpers/renderEntryEditor.tsx`
  Responsibility: 如有必要，只补最小默认 props 支持，不重写 helper。
- Modify: `app/src/components/__tests__/editor/entry-editor.dirty-state.test.tsx`
  Responsibility: 脏态、恢复原值、可保存状态。
- Modify: `app/src/components/__tests__/editor/entry-editor.save-flow.test.tsx`
  Responsibility: 保存成功、失败、重复点击去重。
- Modify: `app/src/components/__tests__/editor/entry-editor.leave-guard.test.tsx`
  Responsibility: 未保存离开、继续编辑、确认离开。
- Modify: `app/.maestro/flows/app-core/editor-unsaved-leave-guard.yaml`
  Responsibility: Android 返回键触发离开保护。
- Modify: `app/.maestro/README.md`
  Responsibility: 记录 flow 的 fixture 前提和命令。
- Modify: `app/package.json`
  Responsibility: 仅在需要时补最小 `test:frontend:editor` 分组入口。

## Task 1: Tighten Dirty-State Rules

**Files:**
- Modify: `app/src/components/__tests__/editor/entry-editor.dirty-state.test.tsx`
- Modify: `app/src/components/__tests__/helpers/renderEntryEditor.tsx`
- Test: `app/src/components/__tests__/editor/entry-editor.dirty-state.test.tsx`

- [ ] **Step 1: Add the failing revert-to-original test**

在 `app/src/components/__tests__/editor/entry-editor.dirty-state.test.tsx` 追加：

```tsx
it('returns to the disabled save state when the user restores the original content', () => {
  const { screen } = renderEntryEditor();

  fireEvent.changeText(screen.getByTestId('entry-editor-content-input'), '新的正文');
  expect(screen.getByTestId('entry-editor-save-button').props.accessibilityState.disabled).toBe(false);

  fireEvent.changeText(
    screen.getByTestId('entry-editor-content-input'),
    '今天重新看了下这版时间流，感觉还是要把卡片收回主页体系里。'
  );

  expect(screen.getByTestId('entry-editor-save-button').props.accessibilityState.disabled).toBe(true);
});
```

- [ ] **Step 2: Run the targeted dirty-state suite**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/editor/entry-editor.dirty-state.test.tsx --runInBand`

Expected: PASS or FAIL directly pointing to a real dirty-state regression.

- [ ] **Step 3: If needed, patch only the smallest dirty-state comparison logic**

如果失败，只允许补最小“恢复原值后回到 pristine”语义，例如：

```ts
const isDirty = content !== initialContent || normalizedTags !== initialTags;
```

不要顺手改保存流程、提示文案或 modal 行为。

- [ ] **Step 4: Re-run the dirty-state suite**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/editor/entry-editor.dirty-state.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit the dirty-state update**

```bash
git add app/src/components/__tests__/editor/entry-editor.dirty-state.test.tsx app/src/components/__tests__/helpers/renderEntryEditor.tsx app/src/components/EntryEditor.tsx
git commit -m "test(editor): tighten dirty state coverage"
```

如果没有生产代码改动，就不要把 `EntryEditor.tsx` 加进提交。

## Task 2: Extend Save Success And Failure Coverage

**Files:**
- Modify: `app/src/components/__tests__/editor/entry-editor.save-flow.test.tsx`
- Test: `app/src/components/__tests__/editor/entry-editor.save-flow.test.tsx`

- [ ] **Step 1: Add the failing pristine-save guard test**

在 `entry-editor.save-flow.test.tsx` 追加：

```tsx
it('does not call onSave when the editor is still pristine', () => {
  const onSave = jest.fn();
  const { screen } = renderEntryEditor({ onSave });

  fireEvent.press(screen.getByTestId('entry-editor-save-button'));

  expect(onSave).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the targeted save-flow suite**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/editor/entry-editor.save-flow.test.tsx --runInBand`

Expected: PASS or FAIL pointing to incorrect save-button gating.

- [ ] **Step 3: If the new test fails, apply the smallest save guard fix**

只允许补最小保存按钮保护，例如：

```ts
if (!isDirty || isSaving) {
  return;
}
```

不要引入新的 store、hook 或额外抽象。

- [ ] **Step 4: Re-run the save-flow suite**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/editor/entry-editor.save-flow.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit the save-flow coverage**

```bash
git add app/src/components/__tests__/editor/entry-editor.save-flow.test.tsx app/src/components/EntryEditor.tsx
git commit -m "test(editor): cover pristine save guard"
```

如果没有生产代码改动，提交里只保留测试文件。

## Task 3: Tighten Leave-Guard User Choices

**Files:**
- Modify: `app/src/components/__tests__/editor/entry-editor.leave-guard.test.tsx`
- Test: `app/src/components/__tests__/editor/entry-editor.leave-guard.test.tsx`

- [ ] **Step 1: Add the failing continue-editing regression test**

在 `entry-editor.leave-guard.test.tsx` 追加：

```tsx
it('keeps the edited content when the user chooses to continue editing', () => {
  const onClose = jest.fn();
  const { screen } = renderEntryEditor({ onClose });

  fireEvent.changeText(screen.getByTestId('entry-editor-content-input'), '继续编辑的正文');
  fireEvent.press(screen.getByTestId('entry-editor-back-button'));

  const actions = (Alert.alert as jest.Mock).mock.calls[0][2] as Array<{ text?: string; onPress?: () => void }>;
  const continueAction = actions.find((action) => action.text === '继续编辑');
  continueAction?.onPress?.();

  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByDisplayValue('继续编辑的正文')).toBeTruthy();
});
```

- [ ] **Step 2: Run the leave-guard suite**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/editor/entry-editor.leave-guard.test.tsx --runInBand`

Expected: PASS or FAIL directly pointing to lost editor state.

- [ ] **Step 3: If needed, apply the smallest leave-guard fix**

只允许补最小 Alert action 处理，不改写整个 close 流程。例如保持：

```ts
{ text: '继续编辑', style: 'cancel' }
```

以及：

```ts
{ text: '放弃修改', style: 'destructive', onPress: onClose }
```

- [ ] **Step 4: Re-run the leave-guard suite**

Run: `cd app && npm test -- --runTestsByPath src/components/__tests__/editor/entry-editor.leave-guard.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit the leave-guard coverage**

```bash
git add app/src/components/__tests__/editor/entry-editor.leave-guard.test.tsx app/src/components/EntryEditor.tsx
git commit -m "test(editor): cover continue editing path"
```

## Task 4: Verify Android Leave-Guard Flow And Grouped Entry Point

**Files:**
- Modify: `app/.maestro/flows/app-core/editor-unsaved-leave-guard.yaml`
- Modify: `app/.maestro/README.md`
- Modify: `app/package.json`
- Test: `app/.maestro/flows/app-core/editor-unsaved-leave-guard.yaml`

- [ ] **Step 1: Keep the Maestro flow focused on unsaved-leave behavior**

确保 `app/.maestro/flows/app-core/editor-unsaved-leave-guard.yaml` 只保留以下主语义：

```yaml
appId: com.memorycapsule.app
---
- runFlow: ../../common/launch-app.yaml
- runFlow: ../../common/open-entry-editor.yaml
- inputText: "未保存的修改"
- back
- assertVisible: "放弃修改？"
- tapOn: "继续编辑"
- assertVisible: "未保存的修改"
- back
- tapOn: "放弃修改"
- assertVisible:
    id: home-screen-root
```

- [ ] **Step 2: Run the single Maestro flow**

Run: `cd app && maestro test .maestro/flows/app-core/editor-unsaved-leave-guard.yaml`

Expected: PASS；如果失败，失败点应直接指向入口选择器、返回键或对话框文案。

- [ ] **Step 3: Add the smallest grouped Jest script only if it improves execution**

如果需要，给 `app/package.json` 增加：

```json
"test:frontend:editor": "jest --runInBand --runTestsByPath src/components/__tests__/editor/entry-editor.dirty-state.test.tsx src/components/__tests__/editor/entry-editor.save-flow.test.tsx src/components/__tests__/editor/entry-editor.leave-guard.test.tsx"
```

- [ ] **Step 4: Update Maestro docs**

在 `app/.maestro/README.md` 增补：

```md
maestro test app/.maestro/flows/app-core/editor-unsaved-leave-guard.yaml
```

并注明它依赖稳定文本 fixture 或可编辑入口。

- [ ] **Step 5: Commit the Android leave-guard updates**

```bash
git add app/.maestro/flows/app-core/editor-unsaved-leave-guard.yaml app/.maestro/README.md app/package.json
git commit -m "test(maestro): verify editor leave guard flow"
```
