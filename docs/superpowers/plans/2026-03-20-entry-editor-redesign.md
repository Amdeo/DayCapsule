# Entry Editor Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将文本编辑页从底部表单弹层重做为以正文为主舞台、标签为底部固定工具条的写作型编辑页。

**Architecture:** 保留现有 `EntryEditor` 的数据读写接口和保存行为，先通过测试锁定“文本查看页进入编辑”的现有链路，再把 `EntryEditor` 从“单个 ScrollView 表单”重组为“固定顶部栏 + 大正文编辑区 + 固定底部标签工具条”。实现优先控制在现有组件内完成，必要时拆出正文区与标签工具条子组件，但不扩展到照片或语音编辑页。

**Tech Stack:** React Native, TypeScript, Expo Vector Icons, React Native Testing Library, Jest

---

## File Structure

- Modify: `app/src/components/EntryEditor.tsx`
  - 现有编辑页主入口；重组布局、保留保存逻辑、接入新的正文主编辑区与底部标签工具条。
- Create or inline-split: `app/src/components/EntryEditorBody.tsx`
  - 若 `EntryEditor.tsx` 过大，则承载正文主编辑面；否则先在原文件内保留同等职责分区。
- Create or inline-split: `app/src/components/EntryEditorTagDock.tsx`
  - 若拆分文件，则承载底部固定标签工具条；否则先在原文件内保留同等职责分区。
- Modify: `app/src/components/TextEntryDetailPage.tsx`
  - 如有必要，微调进入编辑后的关闭/返回衔接，但不改查看页视觉方向。
- Create: `app/src/components/__tests__/EntryEditor.test.tsx`
  - 为编辑页重构补布局与交互回归测试。
- Modify: `app/src/components/__tests__/Timeline.v2.view-mode.test.tsx`
  - 如有必要，补一条“从详情页进入编辑后仍然可见编辑页”的链路确认。
- Modify: `docs/superpowers/specs/2026-03-20-entry-editor-redesign-design.md`
  - 实现完成后更新状态与实现记录。
- Modify: `docs/superpowers/plans/2026-03-20-entry-editor-redesign.md`
  - 执行时勾选步骤并补验证结果。

## Chunk 1: 锁定重做前的编辑体验回归线

### Task 1: 为编辑页布局和交互补失败测试

**Files:**
- Create: `app/src/components/__tests__/EntryEditor.test.tsx`
- Reference: `app/src/components/EntryEditor.tsx`
- Reference: `app/src/components/TextEntryDetailPage.tsx`

- [x] **Step 1: 写失败测试，锁定新编辑页的关键行为**

  在 `app/src/components/__tests__/EntryEditor.test.tsx` 中至少覆盖这些场景：

  ```tsx
  it('renders a large primary text editor area for text entries', () => {
    const screen = render(
      <EntryEditor visible entry={textEntry} onSave={jest.fn()} onClose={jest.fn()} />
    );

    const input = screen.getByTestId('entry-editor-content-input');
    expect(input).toBeTruthy();
    expect(input.props.multiline).toBe(true);
  });

  it('keeps the tag dock visible while rendering content editor separately', () => {
    const screen = render(
      <EntryEditor visible entry={textEntry} onSave={jest.fn()} onClose={jest.fn()} />
    );

    expect(screen.getByTestId('entry-editor-tag-dock')).toBeTruthy();
    expect(screen.getByTestId('entry-editor-content-surface')).toBeTruthy();
  });

  it('saves edited content and tags from the redesigned layout', () => {
    const onSave = jest.fn();
    const screen = render(
      <EntryEditor visible entry={textEntry} onSave={onSave} onClose={jest.fn()} />
    );

    fireEvent.changeText(screen.getByTestId('entry-editor-content-input'), '新的正文');
    fireEvent.changeText(screen.getByTestId('entry-editor-tags-input'), '产品, 想法');
    fireEvent.press(screen.getByText('保存'));

    expect(onSave).toHaveBeenCalledWith(textEntry.id, '新的正文', ['产品', '想法']);
  });
  ```

- [x] **Step 2: 运行测试，确认它先失败**

  Run:

  ```bash
  cd app && npx jest --runInBand --no-coverage src/components/__tests__/EntryEditor.test.tsx
  ```

  Expected: FAIL，缺少新 `testID`、布局分区或断言不成立。

- [ ] **Step 3: 提交失败测试**

  ```bash
  git add app/src/components/__tests__/EntryEditor.test.tsx
  git commit -m "test: cover redesigned entry editor layout"
  ```

## Chunk 2: 重组 EntryEditor 为“写作主舞台 + 底部标签工具条”

### Task 2: 重做页面骨架，不改变保存接口

**Files:**
- Modify: `app/src/components/EntryEditor.tsx`
- Optional Create: `app/src/components/EntryEditorBody.tsx`
- Optional Create: `app/src/components/EntryEditorTagDock.tsx`
- Test: `app/src/components/__tests__/EntryEditor.test.tsx`

- [x] **Step 1: 把 `EntryEditor` 顶层从“底部表单弹层”重组为固定顶部栏 + 主正文区 + 底部 dock**

  目标结构：

  ```tsx
  <Modal ...>
    <KeyboardAvoidingView style={styles.container}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.editorPage}>
        <View style={styles.headerBar}>...</View>

        <View style={styles.editorMain}>
          <ScrollView
            testID="entry-editor-scroll"
            contentContainerStyle={styles.editorScrollContent}
          >
            <View testID="entry-editor-content-surface" style={styles.contentSurface}>
              <TextInput
                testID="entry-editor-content-input"
                multiline
                ...
              />
            </View>
            <View style={styles.metaSection}>...</View>
          </ScrollView>
        </View>

        <View testID="entry-editor-tag-dock" style={styles.tagDock}>
          ...
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
  ```

- [x] **Step 2: 让正文输入区成为主视觉编辑面**

  最小实现要求：

  - 删除当前 `section + label + 小灰色 textInput` 结构。
  - 新正文区默认占据主要可编辑空间。
  - `TextInput` 保持 `multiline` 和 `textAlignVertical="top"`。
  - 不再把正文输入限制成小高度表单块。

- [x] **Step 3: 把标签相关交互迁到固定底部工具条**

  要求：

  - 保留 `commonTags`、手动输入、建议标签、已选标签预览。
  - `tagsInput` 的读写逻辑尽量复用原实现。
  - 标签工具条固定在底部，不跟正文滚动在一起。
  - 给标签输入加 `testID="entry-editor-tags-input"`。

- [x] **Step 4: 保留保存接口和已有数据流**

  `handleSave` 仍保持：

  ```ts
  const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
  onSave(entry.id, content, tags);
  onClose();
  ```

  不新增草稿态、不新增跨页状态。

- [x] **Step 5: 运行编辑页测试，确认通过**

  Run:

  ```bash
  cd app && npx jest --runInBand --no-coverage src/components/__tests__/EntryEditor.test.tsx
  ```

  Expected: PASS

- [ ] **Step 6: 提交页面骨架重做**

  ```bash
  git add app/src/components/EntryEditor.tsx app/src/components/__tests__/EntryEditor.test.tsx
  git commit -m "feat: redesign text entry editor layout"
  ```

## Chunk 3: 校准查看页进入编辑的完整链路

### Task 3: 验证“查看页 -> 编辑页”链路与现有时间流集成

**Files:**
- Modify: `app/src/components/__tests__/Timeline.v2.view-mode.test.tsx`
- Reference: `app/src/components/TextEntryDetailPage.tsx`
- Reference: `app/src/components/Timeline.v2.tsx`
- Reference: `app/src/components/EntryEditor.tsx`

- [x] **Step 1: 补或更新链路测试，确认进入编辑后仍渲染新编辑页**

  如果现有测试不足，扩充为：

  ```tsx
  it('opens redesigned entry editor from the text detail page edit action', () => {
    ...
    fireEvent.press(screen.getByTestId('mock-entry-card-entry-1'));
    fireEvent.press(screen.getByTestId('mock-text-detail-edit'));

    const latestEditorProps = mockEntryEditor.mock.calls.at(-1)?.[0];
    expect(latestEditorProps.visible).toBe(true);
    expect(latestEditorProps.entry).toMatchObject({ id: 'entry-1', type: 'text' });
  });
  ```

- [x] **Step 2: 运行时间流回归测试**

  Run:

  ```bash
  cd app && npx jest --runInBand --no-coverage src/components/__tests__/Timeline.v2.view-mode.test.tsx
  ```

  Expected: PASS

- [ ] **Step 3: 提交链路回归**

  ```bash
  git add app/src/components/__tests__/Timeline.v2.view-mode.test.tsx
  git commit -m "test: cover text detail to editor transition"
  ```

## Chunk 4: 全量相关验证与文档收口

### Task 4: 运行相关验证并更新 spec / plan 状态

**Files:**
- Modify: `docs/superpowers/specs/2026-03-20-entry-editor-redesign-design.md`
- Modify: `docs/superpowers/plans/2026-03-20-entry-editor-redesign.md`

- [x] **Step 1: 运行类型检查**

  Run:

  ```bash
  cd app && npx tsc --noEmit
  ```

  Expected: PASS

- [x] **Step 2: 运行相关测试集**

  Run:

  ```bash
  cd app && npx jest --runInBand --no-coverage --testPathPattern='EntryEditor.test|Timeline.v2.view-mode|EntryCard.test|CalendarView.test|SettingsPage'
  ```

  Expected: PASS

- [ ] **Step 3: 手动回归验证**

  在真机或模拟器中确认：

  - 从文本卡进入查看页，再进入编辑页，链路顺畅。
  - 编辑页首屏是大正文区，不是小表单块。
  - 标签工具条固定在底部。
  - 右上角保存仍可正常保存文本和标签。

- [x] **Step 4: 更新 spec 状态与实现说明**

  在 [`docs/superpowers/specs/2026-03-20-entry-editor-redesign-design.md`](/Users/cooper/Documents/code/MemoryCapsule/docs/superpowers/specs/2026-03-20-entry-editor-redesign-design.md) 中补：

  - 状态改为 `已实现`
  - 实现日期
  - 最终实现偏差（如有）

- [x] **Step 5: 更新 plan 勾选状态与验证记录**

  在本文件中勾选已完成步骤，并补充：

  - 实际运行命令
  - 测试结果
  - 手动回归结论

- [ ] **Step 6: 提交文档收口**

## 验证记录

- `cd app && npx jest --runInBand --no-coverage src/components/__tests__/EntryEditor.test.tsx`
  - 结果：PASS
- `cd app && npx jest --runInBand --no-coverage --testPathPattern='EntryEditor.test|Timeline.v2.view-mode|EntryCard.test|CalendarView.test|SettingsPage'`
  - 结果：PASS（5 suites, 44 tests）
- `cd app && npx tsc --noEmit`
  - 结果：PASS

## 当前状态

- 代码实现：完成
- 自动化验证：完成
- 真机/模拟器手动回归：待执行
- commit：未创建

  ```bash
  git add docs/superpowers/specs/2026-03-20-entry-editor-redesign-design.md docs/superpowers/plans/2026-03-20-entry-editor-redesign.md
  git commit -m "docs: finalize entry editor redesign plan and spec"
  ```
