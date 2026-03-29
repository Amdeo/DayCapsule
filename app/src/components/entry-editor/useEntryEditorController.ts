import { Alert } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Entry } from '@/src/types/entry';
import { suggestTags } from '@/src/services/tagSuggestionService';
import { useCommonTagsStore } from '@/src/store/commonTagsStore';
import { getEntryTypeMeta } from './entryEditorAppearance';

interface UseEntryEditorControllerOptions {
  visible: boolean;
  entry: Entry | null;
  onSave: (id: string, content: string, tags: string[]) => void | Promise<void>;
  onClose: () => void;
}

export function useEntryEditorController({
  visible,
  entry,
  onSave,
  onClose,
}: UseEntryEditorControllerOptions) {
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { tags: commonTags, isLoaded: tagsLoaded, loadCommonTags } = useCommonTagsStore();

  useEffect(() => {
    if (!tagsLoaded) {
      void loadCommonTags();
    }
  }, [tagsLoaded, loadCommonTags]);

  useEffect(() => {
    if (visible && entry) {
      setContent(entry.content);
      setTagsInput(entry.tags?.join(', ') || '');
      setSuggestions([]);
      setIsSaving(false);
    }
  }, [visible, entry]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const existing = tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      setSuggestions(suggestTags(content, existing));
    }, 300);

    return () => clearTimeout(timer);
  }, [content, tagsInput]);

  const handleAddSuggestion = useCallback((tag: string) => {
    setTagsInput((value) => {
      const parts = value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      if (parts.includes(tag)) {
        return value;
      }

      return parts.length > 0 ? `${parts.join(', ')}, ${tag}` : tag;
    });
  }, []);

  const handleRemoveTag = useCallback((tag: string) => {
    setTagsInput((value) => {
      const parts = value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      return parts.filter((item) => item !== tag).join(', ');
    });
  }, []);

  const currentTagsList = useMemo(
    () =>
      tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    [tagsInput],
  );

  const initialTagsInput = useMemo(
    () => entry?.tags?.join(', ') || '',
    [entry],
  );

  const isDirty = useMemo(() => {
    if (!entry) {
      return false;
    }

    return content !== entry.content || tagsInput !== initialTagsInput;
  }, [content, entry, initialTagsInput, tagsInput]);

  const canSave = Boolean(entry) && isDirty && !isSaving;

  const typeMeta = entry ? getEntryTypeMeta(entry.type) : null;

  const handleSave = useCallback(async () => {
    if (!entry || !canSave) {
      return;
    }

    setIsSaving(true);
    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    try {
      await onSave(entry.id, content, tags);
      onClose();
    } catch {
      Alert.alert('保存失败', '保存内容失败，请重试');
    } finally {
      setIsSaving(false);
    }
  }, [canSave, content, entry, onClose, onSave, tagsInput]);

  const handleRequestClose = useCallback(() => {
    if (isSaving) {
      return;
    }

    if (!isDirty) {
      onClose();
      return;
    }

    Alert.alert('放弃修改？', '未保存的修改将会丢失。', [
      { text: '继续编辑', style: 'cancel', onPress: () => {} },
      {
        text: '放弃修改',
        style: 'destructive',
        onPress: onClose,
      },
    ]);
  }, [isDirty, isSaving, onClose]);

  return {
    content,
    tagsInput,
    suggestions,
    commonTags,
    currentTagsList,
    typeMeta,
    canSave,
    isSaving,
    setContent,
    setTagsInput,
    handleAddSuggestion,
    handleRemoveTag,
    handleSave,
    handleRequestClose,
  };
}
