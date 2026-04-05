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

function parseTagsInput(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatTagsInput(tags?: string[]) {
  return tags?.join(', ') ?? '';
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
      const existing = parseTagsInput(editTagsInput);
      setEditSuggestions(suggestTags(editContent, existing));
    }, 300);
    return () => clearTimeout(timer);
  }, [editContent, editTagsInput, isEditing]);

  const handleStartEdit = useCallback(() => {
    if (!entry) return;
    setEditContent(entry.content);
    setEditTagsInput(formatTagsInput(entry.tags));
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
    const initialTagsInput = formatTagsInput(entry.tags);
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
    const tags = parseTagsInput(editTagsInput);
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
      const parts = parseTagsInput(value);
      if (parts.includes(tag)) return value;
      return parts.length > 0 ? `${parts.join(', ')}, ${tag}` : tag;
    });
  }, []);

  const handleRemoveTag = useCallback((tag: string) => {
    setEditTagsInput((value) =>
      parseTagsInput(value)
        .filter((currentTag) => currentTag !== tag)
        .join(', '),
    );
  }, []);

  const toggleTagPanel = useCallback(() => setTagPanelExpanded((v) => !v), []);

  const editCurrentTagsList = useMemo(
    () => parseTagsInput(editTagsInput),
    [editTagsInput],
  );

  const initialTagsInput = useMemo(() => formatTagsInput(entry?.tags), [entry]);

  const canSave = useMemo(() => {
    if (!isEditing || !entry || isSaving) return false;
    return editContent !== entry.content || editTagsInput !== initialTagsInput;
  }, [editContent, editTagsInput, entry, initialTagsInput, isEditing, isSaving]);

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
