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
