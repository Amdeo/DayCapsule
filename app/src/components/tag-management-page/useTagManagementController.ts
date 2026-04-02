import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';
import {
  useCommonTagsStore,
  DEFAULT_PRESET_TAGS,
} from '@/src/store/commonTagsStore';
import { showConfirmDialog } from '@/src/services/showConfirmDialog';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import {
  clamp,
  LONG_PRESS_MS,
  MAX_TAGS,
  ROW_HEIGHT,
} from './tagManagementConfig';

interface UseTagManagementControllerOptions {
  visible: boolean;
}

export interface DragState {
  tag: string;
  fromIndex: number;
  toIndex: number;
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
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragTranslationY = useRef(new Animated.Value(0)).current;
  const dragStateRef = useRef<DragState | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

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

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const startDrag = useCallback(
    (tag: string, index: number) => {
      dragTranslationY.setValue(0);
      setDragState({ tag, fromIndex: index, toIndex: index });
    },
    [dragTranslationY],
  );

  const updateDrag = useCallback(
    (translationY: number) => {
      const current = dragStateRef.current;
      if (!current) {
        return;
      }

      dragTranslationY.setValue(translationY);

      const nextIndex = clamp(
        current.fromIndex + Math.round(translationY / ROW_HEIGHT),
        0,
        Math.max(tags.length - 1, 0),
      );

      if (nextIndex !== current.toIndex) {
        setDragState({ ...current, toIndex: nextIndex });
      }
    },
    [dragTranslationY, tags.length],
  );

  const finishDrag = useCallback(async () => {
    const current = dragStateRef.current;
    clearLongPressTimer();

    if (!current) {
      return;
    }

    dragStateRef.current = null;
    setDragState(null);
    dragTranslationY.setValue(0);

    if (current.fromIndex !== current.toIndex) {
      await reorderCommonTags(current.fromIndex, current.toIndex);
    }
  }, [clearLongPressTimer, dragTranslationY, reorderCommonTags]);

  const createPanResponderConfig = useCallback(
    (tag: string, index: number) => ({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => dragStateRef.current?.tag === tag,
      onPanResponderGrant: () => {
        clearLongPressTimer();
        longPressTimerRef.current = setTimeout(() => startDrag(tag, index), LONG_PRESS_MS);
      },
      onPanResponderMove: (_event: unknown, gestureState: { dy: number }) => {
        if (dragStateRef.current?.tag !== tag) {
          return;
        }
        updateDrag(gestureState.dy);
      },
      onPanResponderRelease: () => {
        void finishDrag();
      },
      onPanResponderTerminate: () => {
        void finishDrag();
      },
    }),
    [clearLongPressTimer, finishDrag, startDrag, updateDrag],
  );

  const atLimit = tags.length >= MAX_TAGS;
  const containerHeight = useMemo(() => tags.length * ROW_HEIGHT, [tags.length]);

  return {
    tags,
    inputValue,
    setInputValue,
    dragState,
    dragTranslationY,
    atLimit,
    containerHeight,
    handleAdd,
    handleDelete,
    handleReset,
    createPanResponderConfig,
  };
}
