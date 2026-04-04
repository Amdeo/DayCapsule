import { useCallback, useEffect, useState } from 'react';
import {
  useCommonTagsStore,
  DEFAULT_PRESET_TAGS,
} from '@/src/store/commonTagsStore';
import { showConfirmDialog } from '@/src/services/showConfirmDialog';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import { MAX_TAGS } from './tagManagementConfig';

interface UseTagManagementControllerOptions {
  visible: boolean;
}

export function useTagManagementController({
  visible,
}: UseTagManagementControllerOptions) {
  const {
    tags,
    isLoaded,
    loadCommonTags,
    addCommonTag,
    removeCommonTag,
    resetToDefaults,
    reorderCommonTags,
  } = useCommonTagsStore();
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (visible && !isLoaded) {
      loadCommonTags();
    }
  }, [visible, isLoaded, loadCommonTags]);

  const handleAdd = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      return;
    }

    if (tags.length >= MAX_TAGS) {
      showErrorFeedback({
        title: '已达上限',
        message: `最多 ${MAX_TAGS} 个预制标签`,
        actions: [{ label: '知道了', role: 'primary' }],
      });
      return;
    }

    await addCommonTag(trimmed);
    setInputValue('');
  }, [addCommonTag, inputValue, tags.length]);

  const handleDelete = useCallback(
    (tag: string) => {
      showConfirmDialog({
        title: '删除标签',
        message: `确认删除「${tag}」吗？`,
        actions: [
          { label: '取消', role: 'secondary' },
          { label: '删除', role: 'danger', onPress: () => removeCommonTag(tag) },
        ],
      });
    },
    [removeCommonTag],
  );

  const handleReset = useCallback(() => {
    showConfirmDialog({
      title: '恢复初始预制标签',
      message: `将恢复为 ${DEFAULT_PRESET_TAGS.length} 个初始预制标签，当前修改将丢失。`,
      actions: [
        { label: '取消', role: 'secondary' },
        { label: '恢复', role: 'danger', onPress: () => resetToDefaults() },
      ],
    });
  }, [resetToDefaults]);

  const handleDragEnd = useCallback(
    async ({ from, to }: { from: number; to: number }) => {
      if (from !== to) {
        await reorderCommonTags(from, to);
      }
    },
    [reorderCommonTags],
  );

  const atLimit = tags.length >= MAX_TAGS;

  return {
    tags,
    inputValue,
    setInputValue,
    atLimit,
    handleAdd,
    handleDelete,
    handleReset,
    handleDragEnd,
  };
}
