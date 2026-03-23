import { useCallback, useEffect, useMemo, useState } from 'react';
import { suggestTags } from '@/src/services/tagSuggestionService';
import { useCommonTagsStore } from '@/src/store/commonTagsStore';

interface UseTextEditorControllerOptions {
  onSave: (content: string, tags: string[]) => void;
  onCancel: () => void;
}

export function useTextEditorController({
  onSave,
  onCancel,
}: UseTextEditorControllerOptions) {
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { tags: commonTags, isLoaded: tagsLoaded, loadCommonTags } = useCommonTagsStore();

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

  useEffect(() => {
    if (!tagsLoaded) {
      void loadCommonTags();
    }
  }, [tagsLoaded, loadCommonTags]);

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

  const resetEditor = useCallback(() => {
    setContent('');
    setTagsInput('');
    setSuggestions([]);
  }, []);

  const handleSave = useCallback(() => {
    if (!content.trim()) {
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    onSave(content, tags);
    resetEditor();
  }, [content, onSave, resetEditor, tagsInput]);

  const handleCancel = useCallback(() => {
    resetEditor();
    onCancel();
  }, [onCancel, resetEditor]);

  const currentTagsList = useMemo(
    () =>
      tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    [tagsInput],
  );

  const canSave = Boolean(content.trim());

  return {
    content,
    tagsInput,
    suggestions,
    commonTags,
    currentTagsList,
    canSave,
    setContent,
    setTagsInput,
    handleAddSuggestion,
    handleRemoveTag,
    handleSave,
    handleCancel,
  };
}
