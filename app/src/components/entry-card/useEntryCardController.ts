import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { type GestureResponderEvent, UIManager } from 'react-native';
import type { TransientFeedbackAnchorRect } from '@/src/store/transientFeedbackStore';
import type { Entry } from '@/src/types/entry';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';
import { showTransientFeedback } from '@/src/services/showTransientFeedback';
import { logger } from '@/src/utils/logger';
import { isEntryMediaPendingHydration } from '@/src/utils/mediaAvailability';
import { useEntryCardActionSheetState } from './useEntryCardActionSheetState';

const COPY_FEEDBACK_MEASURE_TIMEOUT_MS = 150;

async function measureAnchorRectFromPressEvent(
  event?: GestureResponderEvent,
): Promise<TransientFeedbackAnchorRect | null> {
  const nativeTarget = event?.nativeEvent?.target;
  const target = typeof nativeTarget === 'number' ? nativeTarget : Number(nativeTarget);

  if (!Number.isFinite(target) || target <= 0 || typeof UIManager.measureInWindow !== 'function') {
    return null;
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (anchorRect: TransientFeedbackAnchorRect | null) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeoutId);
      resolve(anchorRect);
    };

    const timeoutId = setTimeout(() => {
      finish(null);
    }, COPY_FEEDBACK_MEASURE_TIMEOUT_MS);

    try {
      UIManager.measureInWindow(target, (x, y, width, height) => {
        if (width <= 0 || height <= 0) {
          finish(null);
          return;
        }

        finish({ x, y, width, height });
      });
    } catch (error) {
      logger.warn('测量文本卡片位置失败，回退为默认复制提示', error);
      finish(null);
    }
  });
}

interface UseEntryCardControllerOptions {
  entry: Entry;
  onDelete: (id: string) => void | Promise<void>;
  onView?: (entry: Entry) => void;
  onEdit?: (entry: Entry) => void;
  onStopRecording?: (id: string) => void;
  isActionSheetActive?: boolean;
  onActionSheetOpen?: (entryId: string) => void;
  isPlayingAudio: boolean;
  onPlayAudio: () => void | Promise<void>;
}

export function useEntryCardController({
  entry,
  onDelete,
  onView,
  onEdit,
  onStopRecording,
  isActionSheetActive,
  onActionSheetOpen,
  isPlayingAudio,
  onPlayAudio,
}: UseEntryCardControllerOptions) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const stopRequestInFlightRef = useRef(false);
  const stopRecordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const needsExpansion = useMemo(
    () => entry.content.length > 150 || (entry.tags != null && entry.tags.length > 3),
    [entry.content, entry.tags],
  );

  const {
    swipeableRef,
    showActionSheet,
    handleSwipeTrigger,
    closeActionSheetAndResetCard,
  } = useEntryCardActionSheetState({
    entryId: entry.id,
    isActionSheetActive,
    onActionSheetOpen,
  });

  useEffect(() => {
    return () => {
      if (stopRecordingTimeoutRef.current) {
        clearTimeout(stopRecordingTimeoutRef.current);
      }
    };
  }, []);

  const handleLongPress = useCallback(async (event?: GestureResponderEvent) => {
    if (entry.type === 'text') {
      try {
        await Clipboard.setStringAsync(entry.content);
        const anchorRect = await measureAnchorRectFromPressEvent(event);

        if (anchorRect) {
          showTransientFeedback('已复制', { anchorRect });
        } else {
          showTransientFeedback('已复制');
        }
      } catch (error) {
        logger.error('Failed to copy entry content:', error);
        showErrorFeedback({
          title: '复制失败',
          message: '复制文本失败，请重试',
          actions: [{ label: '知道了', role: 'primary' }],
        });
      }
      return;
    }

    setIsExpanded(true);
  }, [entry]);

  const handleImagePress = useCallback((index: number) => {
    logger.log('图片被点击，打开图片查看器，index:', index);
    setSelectedImageIndex(index);
    setShowImageViewer(true);
  }, []);

  const handleCardPress = useCallback(() => {
    logger.log('卡片被点击，entry.id:', entry.id, 'type:', entry.type);

    if (entry.recordingStatus === 'recording' || entry.recordingStatus === 'stopping') {
      logger.log('录音中，忽略点击');
      return;
    }

    switch (entry.type) {
      case 'text':
        logger.log('文本记录，触发查看');
        onView?.(entry);
        break;
      case 'photo':
        if (isEntryMediaPendingHydration(entry)) {
          logger.log('图片媒体尚未准备好，忽略点击');
          break;
        }
        logger.log('图片记录，打开图片查看器');
        setShowImageViewer(true);
        break;
      case 'voice':
        if (entry.localReadyState === 'processing') {
          logger.log('语音媒体本地处理中，忽略播放');
          break;
        }
        if (isEntryMediaPendingHydration(entry)) {
          logger.log('语音媒体尚未准备好，忽略播放');
          break;
        }
        if (entry.media && entry.media.length > 0 && !isPlayingAudio) {
          logger.log('语音记录，触发播放');
          void onPlayAudio();
        }
        break;
      default:
        break;
    }
  }, [entry, isPlayingAudio, onPlayAudio, onView]);

  const runStopRecording = useCallback(
    async (entryId: string, isStopping: boolean) => {
      if (isStopping || stopRequestInFlightRef.current) {
        return;
      }

      stopRequestInFlightRef.current = true;
      setIsProcessing(true);
      try {
        await onStopRecording?.(entryId);
      } catch (error) {
        logger.error('Failed to stop recording:', error);
        showErrorFeedback({
          title: '停止失败',
          message: '结束录音失败，请重试',
          actions: [{ label: '知道了', role: 'primary' }],
        });
      } finally {
        stopRecordingTimeoutRef.current = setTimeout(() => {
          stopRequestInFlightRef.current = false;
          setIsProcessing(false);
        }, 300);
      }
    },
    [onStopRecording],
  );

  const handleActionSheetEdit = useCallback(() => {
    onEdit?.(entry);
    closeActionSheetAndResetCard();
  }, [closeActionSheetAndResetCard, entry, onEdit]);

  const handleActionSheetDelete = useCallback(async () => {
    await onDelete(entry.id);
    closeActionSheetAndResetCard();
  }, [closeActionSheetAndResetCard, entry.id, onDelete]);

  const closeImageViewer = useCallback(() => {
    setShowImageViewer(false);
  }, []);

  return {
    swipeableRef,
    isExpanded,
    isPressed,
    isProcessing,
    showImageViewer,
    selectedImageIndex,
    showActionSheet,
    needsExpansion,
    setIsPressed,
    handleLongPress,
    handleSwipeTrigger,
    handleImagePress,
    handleCardPress,
    runStopRecording,
    handleActionSheetEdit,
    handleActionSheetDelete,
    closeActionSheetAndResetCard,
    closeImageViewer,
  };
}
