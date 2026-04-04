# Text Entry Detail + Edit Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the text entry detail page and edit page into a single full-screen page with inline read/edit mode switching, reusing `TagArea` from the new TextEditor.

**Architecture:** `TextEntryDetailPage` gains `isEditing` state; `DetailPageShell` gets `headerLeft` + `footerContent` props to support dynamic header/footer; `TagArea` is imported directly; `handleDetailEdit` path is removed from the timeline state machine since editing is now internal to the detail page.

**Tech Stack:** React Native, Expo, Zustand, `@testing-library/react-native`, existing `TagArea` / `showConfirmDialog` / `showErrorFeedback` utilities.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/detail-page-shell/DetailPageShellFrame.tsx` | Modify | Add `headerLeft?: ReactNode`, `footerContent?: ReactNode` |
| `src/components/detail-page-shell/DetailPageShell.styles.ts` | Modify | Update page background from `#FFFFFF` → `#FAF8F5` |
| `src/components/DetailPageShell.tsx` | Modify | Pass through new props |
| `src/components/text-entry-detail-page/useTextEntryDetailPageController.ts` | Rewrite | Inline edit state machine |
| `src/components/text-entry-detail-page/TextEntryDetailPage.styles.ts` | Modify | Add edit-mode styles |
| `src/components/text-entry-detail-page/TextEntryDetailContent.tsx` | Rewrite | Conditional read/edit rendering + TagArea |
| `src/components/TextEntryDetailPage.tsx` | Rewrite | New `onSave` prop, dynamic header+footer |
| `src/components/timeline-v2/TimelineDialogs.tsx` | Modify | Remove `onDetailEdit`, add `onSave` |
| `src/components/timeline-v2/useTimelineEntryDetailState.ts` | Modify | Remove `handleDetailEdit` |
| `src/components/timeline-v2/useTimelineController.ts` | Modify | Remove `handleDetailEdit` from return |
| `src/components/Timeline.v2.tsx` | Modify | Remove `handleDetailEdit` from usage |
| `src/components/__tests__/TextEntryDetailPage.test.tsx` | Rewrite | New test cases for edit mode |

---

### Task 1: Extend `DetailPageShellFrame` with `headerLeft` and `footerContent`

**Files:**
- Modify: `src/components/detail-page-shell/DetailPageShellFrame.tsx`
- Modify: `src/components/detail-page-shell/DetailPageShell.styles.ts`
- Modify: `src/components/DetailPageShell.tsx`

- [ ] **Step 1: Update `DetailPageShell.styles.ts` — warm background**

Replace `backgroundColor: '#FFFFFF'` with `#FAF8F5` in the `page` style:

```typescript
// src/components/detail-page-shell/DetailPageShell.styles.ts
  page: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: '#FAF8F5',   // was '#FFFFFF'
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
```

- [ ] **Step 2: Update `DetailPageShellFrame.tsx` — add `headerLeft` and `footerContent`**

```typescript
// src/components/detail-page-shell/DetailPageShellFrame.tsx
import React, { ReactNode } from 'react';
import { Pressable, ScrollView, StyleProp, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { detailPageShellStyles as styles } from './DetailPageShell.styles';

interface DetailPageShellFrameProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  headerTopPadding: number;
  contentBottomPadding: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollEnabled: boolean;
  footerContent?: ReactNode;
}

export function DetailPageShellFrame({
  title,
  onClose,
  children,
  headerLeft,
  headerRight,
  headerTopPadding,
  contentBottomPadding,
  contentContainerStyle,
  scrollEnabled,
  footerContent,
}: DetailPageShellFrameProps) {
  return (
    <View style={{ flex: 1 }}>
      <View testID="detail-page-header" style={[styles.header, { paddingTop: headerTopPadding }]}>
        {headerLeft ? (
          <View style={styles.backButton}>{headerLeft}</View>
        ) : (
          <Pressable
            testID="detail-page-back-button"
            onPress={onClose}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#4A4A4A" />
          </Pressable>
        )}
        <Text style={styles.headerTitle}>{title}</Text>
        {headerRight ? (
          <View testID="detail-page-header-right" style={styles.headerRight}>{headerRight}</View>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {scrollEnabled ? (
        <ScrollView
          testID="detail-page-scroll"
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: contentBottomPadding },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View
          testID="detail-page-content"
          style={[
            styles.content,
            styles.staticContent,
            { paddingBottom: contentBottomPadding },
            contentContainerStyle,
          ]}
        >
          {children}
        </View>
      )}

      {footerContent}
    </View>
  );
}
```

- [ ] **Step 3: Update `DetailPageShell.tsx` — pass through new props**

```typescript
// src/components/DetailPageShell.tsx
import React, { ReactNode } from 'react';
import { Dimensions, Modal, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DetailPageShellFrame } from './detail-page-shell/DetailPageShellFrame';
import { detailPageShellStyles as styles } from './detail-page-shell/DetailPageShell.styles';
import { useDetailPageShellController } from './detail-page-shell/useDetailPageShellController';
import { ConfirmDialogHost } from './ConfirmDialogHost';
import { FeedbackHost } from './FeedbackHost';

const { height: SCREEN_HEIGHT } = Dimensions.get('screen');

interface DetailPageShellProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollEnabled?: boolean;
  footerContent?: ReactNode;
}

export function DetailPageShell({
  visible,
  title,
  onClose,
  children,
  headerLeft,
  headerRight,
  contentContainerStyle,
  scrollEnabled = true,
  footerContent,
}: DetailPageShellProps) {
  const insets = useSafeAreaInsets();
  const { shouldRender, isAnimating } = useDetailPageShellController(visible);

  if (!shouldRender) return null;

  return (
    <Modal visible={shouldRender} transparent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.container}>
        <Pressable
          testID="detail-page-backdrop"
          style={StyleSheet.absoluteFill}
          disabled={!isAnimating}
          onPress={onClose}
        >
          {isAnimating && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={styles.backdrop}
              pointerEvents="none"
            />
          )}
        </Pressable>

        {isAnimating && (
          <Animated.View
            entering={SlideInRight.duration(300).springify()}
            exiting={SlideOutRight.duration(250)}
            testID="detail-page-shell"
            style={[styles.page, { height: SCREEN_HEIGHT }]}
          >
            <DetailPageShellFrame
              title={title}
              onClose={onClose}
              headerLeft={headerLeft}
              headerRight={headerRight}
              headerTopPadding={insets.top + 20}
              scrollEnabled={scrollEnabled}
              contentContainerStyle={contentContainerStyle}
              contentBottomPadding={40 + insets.bottom}
              footerContent={footerContent}
            >
              {children}
            </DetailPageShellFrame>
          </Animated.View>
        )}
        <ConfirmDialogHost />
        <FeedbackHost />
      </GestureHandlerRootView>
    </Modal>
  );
}
```

- [ ] **Step 4: Run type check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/detail-page-shell/ app/src/components/DetailPageShell.tsx
git commit -m "Extend DetailPageShell with headerLeft, footerContent, warm bg"
```

---

### Task 2: Rewrite `useTextEntryDetailPageController.ts`

**Files:**
- Rewrite: `src/components/text-entry-detail-page/useTextEntryDetailPageController.ts`

- [ ] **Step 1: Write the failing test first**

Add to `src/components/__tests__/TextEntryDetailPage.test.tsx` (before the describe block, we'll fully rewrite the test file in Task 6 — for now just note the controller interface we need):

The controller must return:
```typescript
{
  // read-mode
  content: string,
  createdAt: string,
  editedAt: string | null,
  tags: string[],
  // edit-mode state
  isEditing: boolean,
  editContent: string,
  editTagsInput: string,
  editCurrentTagsList: string[],
  editSuggestions: string[],
  commonTags: string[],
  tagPanelExpanded: boolean,
  canSave: boolean,
  isSaving: boolean,
  // actions
  handleStartEdit: () => void,
  handleCancelEdit: () => void,
  handleSaveEdit: () => Promise<void>,
  setEditContent: (v: string) => void,
  setEditTagsInput: (v: string) => void,
  handleAddTag: (tag: string) => void,
  handleRemoveTag: (tag: string) => void,
  toggleTagPanel: () => void,
}
```

- [ ] **Step 2: Write the new controller**

```typescript
// src/components/text-entry-detail-page/useTextEntryDetailPageController.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Entry } from '@/src/types/entry';
import { suggestTags } from '@/src/services/tagSuggestionService';
import { showConfirmDialog } from '@/src/services/showConfirmDialog';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import { useCommonTagsStore } from '@/src/store/commonTagsStore';
import { formatEntryDateTime } from './textEntryDetailHelpers';

interface UseTextEntryDetailPageControllerOptions {
  entry: Entry | null;
  onSave: (id: string, content: string, tags: string[]) => void | Promise<void>;
}

export function useTextEntryDetailPageController({
  entry,
  onSave,
}: UseTextEntryDetailPageControllerOptions) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTagsInput, setEditTagsInput] = useState('');
  const [editSuggestions, setEditSuggestions] = useState<string[]>([]);
  const [tagPanelExpanded, setTagPanelExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { tags: commonTags, isLoaded: tagsLoaded, loadCommonTags } = useCommonTagsStore();

  useEffect(() => {
    if (!tagsLoaded) {
      void loadCommonTags();
    }
  }, [tagsLoaded, loadCommonTags]);

  // Reset edit state when entry changes (e.g. after save updates the prop)
  useEffect(() => {
    if (!isEditing) {
      setEditContent('');
      setEditTagsInput('');
      setEditSuggestions([]);
      setTagPanelExpanded(false);
    }
  }, [entry, isEditing]);

  // Debounced tag suggestions while editing
  useEffect(() => {
    if (!isEditing) return;
    const timer = setTimeout(() => {
      const existing = editTagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      setEditSuggestions(suggestTags(editContent, existing));
    }, 300);
    return () => clearTimeout(timer);
  }, [editContent, editTagsInput, isEditing]);

  const handleStartEdit = useCallback(() => {
    if (!entry) return;
    setEditContent(entry.content);
    setEditTagsInput(entry.tags?.join(', ') ?? '');
    setEditSuggestions([]);
    setTagPanelExpanded(false);
    setIsEditing(true);
  }, [entry]);

  const exitEditing = useCallback(() => {
    setIsEditing(false);
    setTagPanelExpanded(false);
  }, []);

  const handleCancelEdit = useCallback(() => {
    if (!entry) {
      exitEditing();
      return;
    }
    const initialTagsInput = entry.tags?.join(', ') ?? '';
    const isDirty = editContent !== entry.content || editTagsInput !== initialTagsInput;
    if (!isDirty) {
      exitEditing();
      return;
    }
    showConfirmDialog({
      title: '放弃修改？',
      message: '未保存的修改将会丢失。',
      actions: [
        { label: '继续编辑', role: 'secondary', onPress: () => {} },
        { label: '放弃修改', role: 'danger', onPress: exitEditing },
      ],
    });
  }, [editContent, editTagsInput, entry, exitEditing]);

  const handleSaveEdit = useCallback(async () => {
    if (!entry || isSaving) return;
    const tags = editTagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    setIsSaving(true);
    try {
      await onSave(entry.id, editContent, tags);
      exitEditing();
    } catch {
      showErrorFeedback({
        title: '保存失败',
        message: '保存内容失败，请重试',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    } finally {
      setIsSaving(false);
    }
  }, [editContent, editTagsInput, entry, exitEditing, isSaving, onSave]);

  const handleAddTag = useCallback((tag: string) => {
    setEditTagsInput((value) => {
      const parts = value.split(',').map((t) => t.trim()).filter(Boolean);
      if (parts.includes(tag)) return value;
      return parts.length > 0 ? `${parts.join(', ')}, ${tag}` : tag;
    });
  }, []);

  const handleRemoveTag = useCallback((tag: string) => {
    setEditTagsInput((value) =>
      value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .filter((t) => t !== tag)
        .join(', '),
    );
  }, []);

  const toggleTagPanel = useCallback(() => setTagPanelExpanded((v) => !v), []);

  const editCurrentTagsList = useMemo(
    () => editTagsInput.split(',').map((t) => t.trim()).filter(Boolean),
    [editTagsInput],
  );

  const initialTagsInput = useMemo(() => entry?.tags?.join(', ') ?? '', [entry]);

  const canSave = useMemo(() => {
    if (!entry || isSaving) return false;
    return editContent !== entry.content || editTagsInput !== initialTagsInput;
  }, [editContent, editTagsInput, entry, initialTagsInput, isSaving]);

  if (!entry) return null;

  return {
    content: entry.content,
    createdAt: formatEntryDateTime(entry.timestamp),
    editedAt: entry.editedAt ? formatEntryDateTime(entry.editedAt) : null,
    tags: entry.tags ?? [],
    isEditing,
    editContent,
    editTagsInput,
    editCurrentTagsList,
    editSuggestions,
    commonTags,
    tagPanelExpanded,
    canSave,
    isSaving,
    handleStartEdit,
    handleCancelEdit,
    handleSaveEdit,
    setEditContent,
    setEditTagsInput,
    handleAddTag,
    handleRemoveTag,
    toggleTagPanel,
  };
}
```

- [ ] **Step 3: Run type check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors (old `onEdit` consumers will break — those get fixed in subsequent tasks).

- [ ] **Step 4: Commit**

```bash
git add app/src/components/text-entry-detail-page/useTextEntryDetailPageController.ts
git commit -m "Rewrite useTextEntryDetailPageController with inline edit state machine"
```

---

### Task 3: Update styles `TextEntryDetailPage.styles.ts`

**Files:**
- Modify: `src/components/text-entry-detail-page/TextEntryDetailPage.styles.ts`

- [ ] **Step 1: Add edit-mode styles**

Replace the entire file:

```typescript
// src/components/text-entry-detail-page/TextEntryDetailPage.styles.ts
import { StyleSheet } from 'react-native';

export const textEntryDetailPageStyles = StyleSheet.create({
  contentContainer: {
    paddingTop: 20,
    gap: 16,
  },
  // Read mode — content card
  heroBlock: {
    backgroundColor: '#FFFCF7',
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.12)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  contentText: {
    fontSize: 17,
    lineHeight: 30,
    color: '#2F241E',
    letterSpacing: 0.2,
  },
  // Edit mode — content card (matches TextEditor's contentCard)
  editContentCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  editContentInput: {
    padding: 16,
    fontSize: 16,
    color: '#2F241E',
    minHeight: 200,
    lineHeight: 26,
  },
  // Shared meta
  metaSection: {
    gap: 4,
    paddingBottom: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#B0A498',
    letterSpacing: 0.3,
  },
  // Read mode — tags
  tagsSection: {
    gap: 8,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F7F2EA',
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.12)',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7A6758',
  },
  // Bottom bar (fixed, outside ScrollView)
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 115, 85, 0.08)',
    backgroundColor: '#FAF8F5',
  },
  editButton: {
    backgroundColor: '#6A89CC',
    borderRadius: 22,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editBarRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0EDEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6F6257',
  },
  saveButton: {
    flex: 2,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6A89CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D1D1',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButtonTextDisabled: {
    color: '#A3A3A3',
  },
  // Header elements (for edit mode)
  headerCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8A7C70',
  },
  headerSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6A89CC',
  },
  headerSaveTextDisabled: {
    color: '#C0B8B0',
  },
});
```

- [ ] **Step 2: Type check**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/src/components/text-entry-detail-page/TextEntryDetailPage.styles.ts
git commit -m "Update TextEntryDetailPage styles for inline edit mode"
```

---

### Task 4: Rewrite `TextEntryDetailContent.tsx`

**Files:**
- Rewrite: `src/components/text-entry-detail-page/TextEntryDetailContent.tsx`

- [ ] **Step 1: Write the new file**

```tsx
// src/components/text-entry-detail-page/TextEntryDetailContent.tsx
import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { textEntryDetailPageStyles as styles } from './TextEntryDetailPage.styles';
import { TagArea } from '@/src/components/text-editor/TagArea';

interface TextEntryDetailContentProps {
  isEditing: boolean;
  // read-mode
  content: string;
  createdAt: string;
  editedAt: string | null;
  tags: string[];
  // edit-mode
  editContent: string;
  editTagsInput: string;
  editCurrentTagsList: string[];
  editSuggestions: string[];
  commonTags: string[];
  tagPanelExpanded: boolean;
  onChangeEditContent: (v: string) => void;
  onChangeTagsInput: (v: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onToggleTagPanel: () => void;
}

export function TextEntryDetailContent({
  isEditing,
  content,
  createdAt,
  editedAt,
  tags,
  editContent,
  editTagsInput,
  editCurrentTagsList,
  editSuggestions,
  commonTags,
  tagPanelExpanded,
  onChangeEditContent,
  onChangeTagsInput,
  onAddTag,
  onRemoveTag,
  onToggleTagPanel,
}: TextEntryDetailContentProps) {
  if (isEditing) {
    return (
      <View testID="text-entry-detail-root">
        <View testID="text-entry-detail-hero" style={styles.editContentCard}>
          <TextInput
            testID="text-entry-detail-edit-input"
            style={styles.editContentInput}
            value={editContent}
            onChangeText={onChangeEditContent}
            placeholder="写点什么..."
            placeholderTextColor="#C0B8B0"
            multiline
            textAlignVertical="top"
            autoFocus
          />
        </View>
        <TagArea
          commonTags={commonTags}
          currentTagsList={editCurrentTagsList}
          suggestions={editSuggestions}
          tagsInput={editTagsInput}
          tagPanelExpanded={tagPanelExpanded}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onToggleTagPanel={onToggleTagPanel}
          onChangeTagsInput={onChangeTagsInput}
        />
        <View style={styles.metaSection}>
          <Text style={styles.metaText}>{createdAt} 创建</Text>
        </View>
      </View>
    );
  }

  return (
    <View testID="text-entry-detail-root">
      <View testID="text-entry-detail-hero" style={styles.heroBlock}>
        <Text style={styles.contentText}>{content}</Text>
      </View>

      {tags.length > 0 && (
        <View testID="text-entry-detail-tags" style={styles.tagsSection}>
          <View style={styles.tagsWrap}>
            {tags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.metaSection}>
        <Text style={styles.metaText}>{createdAt} 创建</Text>
        {editedAt ? <Text style={styles.metaText}>最近编辑：{editedAt}</Text> : null}
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Type check**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/src/components/text-entry-detail-page/TextEntryDetailContent.tsx
git commit -m "Rewrite TextEntryDetailContent with inline read/edit switching"
```

---

### Task 5: Rewrite `TextEntryDetailPage.tsx`

**Files:**
- Rewrite: `src/components/TextEntryDetailPage.tsx`

- [ ] **Step 1: Write the new shell component**

```tsx
// src/components/TextEntryDetailPage.tsx
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Entry } from '@/src/types/entry';
import { DetailPageShell } from './DetailPageShell';
import { TextEntryDetailContent } from './text-entry-detail-page/TextEntryDetailContent';
import { textEntryDetailPageStyles as styles } from './text-entry-detail-page/TextEntryDetailPage.styles';
import { useTextEntryDetailPageController } from './text-entry-detail-page/useTextEntryDetailPageController';

interface TextEntryDetailPageProps {
  visible: boolean;
  entry: Entry | null;
  onClose: () => void;
  onSave: (id: string, content: string, tags: string[]) => void | Promise<void>;
}

export function TextEntryDetailPage({
  visible,
  entry,
  onClose,
  onSave,
}: TextEntryDetailPageProps) {
  const detail = useTextEntryDetailPageController({ entry, onSave });

  if (!visible || !detail) return null;

  const headerLeft = detail.isEditing ? (
    <Pressable
      testID="text-entry-detail-cancel-button"
      onPress={detail.handleCancelEdit}
      disabled={detail.isSaving}
    >
      <Text style={styles.headerCancelText}>取消</Text>
    </Pressable>
  ) : undefined;

  const headerRight = detail.isEditing ? (
    <Pressable
      testID="text-entry-detail-save-header-button"
      onPress={detail.handleSaveEdit}
      disabled={!detail.canSave || detail.isSaving}
    >
      <Text
        style={[
          styles.headerSaveText,
          (!detail.canSave || detail.isSaving) && styles.headerSaveTextDisabled,
        ]}
      >
        保存
      </Text>
    </Pressable>
  ) : undefined;

  const footerContent = detail.isEditing ? (
    <View style={styles.bottomBar}>
      <View style={styles.editBarRow}>
        <Pressable
          style={styles.cancelButton}
          onPress={detail.handleCancelEdit}
          disabled={detail.isSaving}
        >
          <Text style={styles.cancelButtonText}>取消</Text>
        </Pressable>
        <Pressable
          testID="text-entry-detail-save-button"
          style={[styles.saveButton, !detail.canSave && styles.saveButtonDisabled]}
          onPress={detail.handleSaveEdit}
          disabled={!detail.canSave || detail.isSaving}
        >
          <Text
            style={[
              styles.saveButtonText,
              !detail.canSave && styles.saveButtonTextDisabled,
            ]}
          >
            保存修改
          </Text>
        </Pressable>
      </View>
    </View>
  ) : (
    <View style={styles.bottomBar}>
      <Pressable
        testID="text-entry-detail-edit-button"
        style={styles.editButton}
        onPress={detail.handleStartEdit}
      >
        <Ionicons name="pencil" size={15} color="#FFFFFF" />
        <Text style={styles.editButtonText}>编辑</Text>
      </Pressable>
    </View>
  );

  return (
    <DetailPageShell
      visible={visible}
      title={detail.isEditing ? '编辑' : '文字记录'}
      onClose={detail.isEditing ? detail.handleCancelEdit : onClose}
      headerLeft={headerLeft}
      headerRight={headerRight}
      contentContainerStyle={styles.contentContainer}
      footerContent={footerContent}
    >
      <TextEntryDetailContent
        isEditing={detail.isEditing}
        content={detail.content}
        createdAt={detail.createdAt}
        editedAt={detail.editedAt}
        tags={detail.tags}
        editContent={detail.editContent}
        editTagsInput={detail.editTagsInput}
        editCurrentTagsList={detail.editCurrentTagsList}
        editSuggestions={detail.editSuggestions}
        commonTags={detail.commonTags}
        tagPanelExpanded={detail.tagPanelExpanded}
        onChangeEditContent={detail.setEditContent}
        onChangeTagsInput={detail.setEditTagsInput}
        onAddTag={detail.handleAddTag}
        onRemoveTag={detail.handleRemoveTag}
        onToggleTagPanel={detail.toggleTagPanel}
      />
    </DetailPageShell>
  );
}
```

- [ ] **Step 2: Type check**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/src/components/TextEntryDetailPage.tsx
git commit -m "Rewrite TextEntryDetailPage with inline edit mode"
```

---

### Task 6: Rewrite tests `TextEntryDetailPage.test.tsx`

**Files:**
- Rewrite: `src/components/__tests__/TextEntryDetailPage.test.tsx`

- [ ] **Step 1: Write the new test file**

```tsx
// src/components/__tests__/TextEntryDetailPage.test.tsx
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { Entry } from '@/src/types/entry';
import { TextEntryDetailPage } from '../TextEntryDetailPage';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

jest.mock('@/src/services/tagSuggestionService', () => ({
  suggestTags: jest.fn(() => []),
}));

jest.mock('@/src/services/showConfirmDialog', () => ({
  showConfirmDialog: jest.fn(),
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: jest.fn(),
}));

jest.mock('@/src/store/commonTagsStore', () => ({
  useCommonTagsStore: () => ({
    tags: ['工作', '学习', '心情'],
    isLoaded: true,
    loadCommonTags: jest.fn(),
  }),
}));

jest.mock('../DetailPageShell', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    DetailPageShell: ({
      visible,
      title,
      headerLeft,
      headerRight,
      children,
      footerContent,
    }: {
      visible: boolean;
      title: string;
      headerLeft?: React.ReactNode;
      headerRight?: React.ReactNode;
      children: React.ReactNode;
      footerContent?: React.ReactNode;
    }) => {
      if (!visible) return null;
      return (
        <View>
          <Text>{title}</Text>
          {headerLeft ? <View testID="mock-header-left">{headerLeft}</View> : null}
          {headerRight ? <View testID="mock-header-right">{headerRight}</View> : null}
          <View>{children}</View>
          {footerContent ? <View testID="mock-footer">{footerContent}</View> : null}
        </View>
      );
    },
  };
});

describe('TextEntryDetailPage', () => {
  const entry: Entry = {
    id: 'entry-text-1',
    type: 'text',
    content: '一段用于详情页的文本内容',
    timestamp: new Date('2026-03-23T08:30:00+08:00').getTime(),
    editedAt: new Date('2026-03-23T09:45:00+08:00').getTime(),
    tags: ['旅行', '春天'],
    syncStatus: 'synced',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => { jest.runOnlyPendingTimers(); });
    jest.useRealTimers();
  });

  it('returns null when hidden or entry is null', () => {
    const hidden = render(
      <TextEntryDetailPage visible={false} entry={entry} onClose={jest.fn()} onSave={jest.fn()} />
    );
    const empty = render(
      <TextEntryDetailPage visible entry={null} onClose={jest.fn()} onSave={jest.fn()} />
    );
    expect(hidden.queryByTestId('text-entry-detail-root')).toBeNull();
    expect(empty.queryByTestId('text-entry-detail-root')).toBeNull();
  });

  it('renders read-mode with content, tags, and meta', () => {
    const screen = render(
      <TextEntryDetailPage visible entry={entry} onClose={jest.fn()} onSave={jest.fn()} />
    );
    expect(screen.getByTestId('text-entry-detail-root')).toBeTruthy();
    expect(screen.getByTestId('text-entry-detail-hero')).toBeTruthy();
    expect(screen.getByText(entry.content)).toBeTruthy();
    expect(screen.getByTestId('text-entry-detail-tags')).toBeTruthy();
    expect(screen.getByText('#旅行')).toBeTruthy();
    expect(screen.getByText('#春天')).toBeTruthy();
    // title shown by shell
    expect(screen.getByText('文字记录')).toBeTruthy();
  });

  it('hides tags section when entry has no tags', () => {
    const screen = render(
      <TextEntryDetailPage
        visible
        entry={{ ...entry, tags: [] }}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    );
    expect(screen.queryByTestId('text-entry-detail-tags')).toBeNull();
  });

  it('pressing edit button enters editing mode', () => {
    const screen = render(
      <TextEntryDetailPage visible entry={entry} onClose={jest.fn()} onSave={jest.fn()} />
    );
    fireEvent.press(screen.getByTestId('text-entry-detail-edit-button'));
    expect(screen.getByTestId('text-entry-detail-edit-input')).toBeTruthy();
    expect(screen.getByTestId('text-entry-detail-edit-input').props.value).toBe(entry.content);
    // title switches
    expect(screen.getByText('编辑')).toBeTruthy();
    // save button appears
    expect(screen.getByTestId('text-entry-detail-save-button')).toBeTruthy();
  });

  it('cancel without changes exits editing without confirmation', () => {
    const { showConfirmDialog } = require('@/src/services/showConfirmDialog');
    const screen = render(
      <TextEntryDetailPage visible entry={entry} onClose={jest.fn()} onSave={jest.fn()} />
    );
    fireEvent.press(screen.getByTestId('text-entry-detail-edit-button'));
    fireEvent.press(screen.getByTestId('text-entry-detail-cancel-button'));
    expect(showConfirmDialog).not.toHaveBeenCalled();
    expect(screen.getByText('文字记录')).toBeTruthy();
    expect(screen.queryByTestId('text-entry-detail-edit-input')).toBeNull();
  });

  it('cancel with changes shows confirm dialog', () => {
    const { showConfirmDialog } = require('@/src/services/showConfirmDialog');
    const screen = render(
      <TextEntryDetailPage visible entry={entry} onClose={jest.fn()} onSave={jest.fn()} />
    );
    fireEvent.press(screen.getByTestId('text-entry-detail-edit-button'));
    fireEvent.changeText(screen.getByTestId('text-entry-detail-edit-input'), '修改后的内容');
    fireEvent.press(screen.getByTestId('text-entry-detail-cancel-button'));
    expect(showConfirmDialog).toHaveBeenCalledWith(
      expect.objectContaining({ title: '放弃修改？' })
    );
  });

  it('save button calls onSave with current content and tags', async () => {
    const onSave = jest.fn().mockResolvedValueOnce(undefined);
    const screen = render(
      <TextEntryDetailPage visible entry={entry} onClose={jest.fn()} onSave={onSave} />
    );
    fireEvent.press(screen.getByTestId('text-entry-detail-edit-button'));
    fireEvent.changeText(screen.getByTestId('text-entry-detail-edit-input'), '修改后的内容');
    await act(async () => {
      fireEvent.press(screen.getByTestId('text-entry-detail-save-button'));
    });
    expect(onSave).toHaveBeenCalledWith(entry.id, '修改后的内容', entry.tags);
    // returns to read mode after save
    expect(screen.queryByTestId('text-entry-detail-edit-input')).toBeNull();
  });

  it('shows error feedback and stays in edit mode when save fails', async () => {
    const { showErrorFeedback } = require('@/src/services/showErrorFeedback');
    const onSave = jest.fn().mockRejectedValueOnce(new Error('network error'));
    const screen = render(
      <TextEntryDetailPage visible entry={entry} onClose={jest.fn()} onSave={onSave} />
    );
    fireEvent.press(screen.getByTestId('text-entry-detail-edit-button'));
    fireEvent.changeText(screen.getByTestId('text-entry-detail-edit-input'), '修改后的内容');
    await act(async () => {
      fireEvent.press(screen.getByTestId('text-entry-detail-save-button'));
    });
    expect(showErrorFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ title: '保存失败' })
    );
    // stays in edit mode
    expect(screen.getByTestId('text-entry-detail-edit-input')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd app && npx jest src/components/__tests__/TextEntryDetailPage.test.tsx --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/__tests__/TextEntryDetailPage.test.tsx
git commit -m "Rewrite TextEntryDetailPage tests for inline edit mode"
```

---

### Task 7: Remove `handleDetailEdit` from timeline state machine

**Files:**
- Modify: `src/components/timeline-v2/useTimelineEntryDetailState.ts`
- Modify: `src/components/timeline-v2/useTimelineController.ts`
- Modify: `src/components/Timeline.v2.tsx`
- Modify: `src/components/timeline-v2/TimelineDialogs.tsx`

- [ ] **Step 1: Simplify `useTimelineEntryDetailState.ts`**

Remove `handleDetailEdit`, `pendingEditingEntryRef`, and `detailToEditorTimerRef`:

```typescript
// src/components/timeline-v2/useTimelineEntryDetailState.ts
import { useCallback, useState } from 'react';
import type { Entry } from '@/src/types/entry';

export function useTimelineEntryDetailState() {
  const [viewingEntry, setViewingEntry] = useState<Entry | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  const handleViewEntry = useCallback((entry: Entry) => {
    if (entry.type !== 'text') return;
    setViewingEntry(entry);
  }, []);

  const handleEditEntry = useCallback((entry: Entry) => {
    setEditingEntry(entry);
  }, []);

  const closeViewingEntry = useCallback(() => {
    setViewingEntry(null);
  }, []);

  const closeEditingEntry = useCallback(() => {
    setEditingEntry(null);
  }, []);

  return {
    viewingEntry,
    editingEntry,
    handleViewEntry,
    handleEditEntry,
    closeViewingEntry,
    closeEditingEntry,
  };
}
```

- [ ] **Step 2: Remove `handleDetailEdit` from `useTimelineController.ts` return**

Find and remove the destructuring of `handleDetailEdit` and its export:

```typescript
// In useTimelineController.ts, change:
const {
  viewingEntry,
  editingEntry,
  handleViewEntry,
  handleEditEntry,
  closeViewingEntry,
  closeEditingEntry,
  // remove: handleDetailEdit,
} = useTimelineEntryDetailState();

// And in the return object, remove:
// handleDetailEdit,
```

- [ ] **Step 3: Update `TimelineDialogs.tsx` — add `onSave`, remove `onDetailEdit`**

```tsx
// src/components/timeline-v2/TimelineDialogs.tsx
import React from 'react';
import type { Entry } from '@/src/types/entry';
import { EntryEditor } from '@/src/components/EntryEditor';
import { TextEntryDetailPage } from '@/src/components/TextEntryDetailPage';

interface TimelineDialogsProps {
  viewingEntry: Entry | null;
  editingEntry: Entry | null;
  onCloseViewing: () => void;
  onSaveTextDetail: (id: string, content: string, tags: string[]) => void | Promise<void>;
  onSaveEdit: (id: string, content: string, tags: string[]) => void;
  onCloseEditing: () => void;
}

export function TimelineDialogs({
  viewingEntry,
  editingEntry,
  onCloseViewing,
  onSaveTextDetail,
  onSaveEdit,
  onCloseEditing,
}: TimelineDialogsProps) {
  return (
    <>
      <TextEntryDetailPage
        visible={viewingEntry !== null}
        entry={viewingEntry}
        onClose={onCloseViewing}
        onSave={onSaveTextDetail}
      />

      <EntryEditor
        visible={editingEntry !== null}
        entry={editingEntry}
        onSave={onSaveEdit}
        onClose={onCloseEditing}
      />
    </>
  );
}
```

- [ ] **Step 4: Update `Timeline.v2.tsx` — wire `onSaveTextDetail`**

Find the `<TimelineDialogs>` usage (around line 202) and update props:

```tsx
// Remove: onDetailEdit={handleDetailEdit}
// Change: onSaveEdit={handleSaveEdit}
// Add: onSaveTextDetail={handleSaveEdit}
<TimelineDialogs
  viewingEntry={viewingEntry}
  editingEntry={editingEntry}
  onCloseViewing={closeViewingEntry}
  onSaveTextDetail={handleSaveEdit}
  onSaveEdit={handleSaveEdit}
  onCloseEditing={closeEditingEntry}
/>
```

Also remove `handleDetailEdit` from the destructure of `useTimelineController()`.

- [ ] **Step 5: Run type check and tests**

```bash
cd app && npx tsc --noEmit
cd app && npx jest src/components/__tests__/TextEntryDetailPage.test.tsx --no-coverage
```

Expected: Type check passes, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/src/components/timeline-v2/ app/src/components/Timeline.v2.tsx
git commit -m "Remove handleDetailEdit — text entry editing now inline in detail page"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run full type check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Run all related tests**

```bash
cd app && npx jest src/components/__tests__/TextEntryDetailPage.test.tsx src/components/__tests__/TextEditor.test.tsx --no-coverage
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Text entry detail+edit redesign complete: inline mode switching, TagArea reuse"
```
