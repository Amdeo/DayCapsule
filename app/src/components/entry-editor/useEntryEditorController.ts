import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Entry } from '@/src/types/entry';
import { suggestTags } from '@/src/services/tagSuggestionService';
import { useCommonTagsStore } from '@/src/store/commonTagsStore';
import { getEntryTypeMeta } from './entryEditorAppearance';

interface UseEntryEditorControllerOptions {
  visible: boolean;
  entry: Entry | null;
  onSave: (id: string, content: string, tags: string[]) => void;
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

  const typeMeta = entry ? getEntryTypeMeta(entry.type) : null;

  const handleSave = useCallback(() => {
    if (!entry) {
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    onSave(entry.id, content, tags);
    onClose();
  }, [content, entry, onClose, onSave, tagsInput]);

  return {
    content,
    tagsInput,
    suggestions,
    commonTags,
    currentTagsList,
    typeMeta,
    setContent,
    setTagsInput,
    handleAddSuggestion,
    handleRemoveTag,
    handleSave,
  };
}
