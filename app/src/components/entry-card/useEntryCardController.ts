import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Swipeable } from 'react-native-gesture-handler';
import type { Entry } from '@/src/types/entry';
import { logger } from '@/src/utils/logger';
import { ENTRY_ACTION_SHEET_EXIT_DURATION } from '../entry-action-sheet/entryActionSheetConfig';

const ACTION_SHEET_OPEN_DELAY = 100;

type CardInteractionState = 'idle' | 'pendingSheet' | 'sheetOpen' | 'closing';

interface UseEntryCardControllerOptions {
  entry: Entry;
  onDelete: (id: string) => void;
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
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [interactionState, setInteractionState] = useState<CardInteractionState>('idle');

  const stopRequestInFlightRef = useRef(false);
  const swipeableRef = useRef<Swipeable>(null);
  const openSheetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetCardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopRecordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const needsExpansion = useMemo(
    () => entry.content.length > 150 || (entry.tags != null && entry.tags.length > 3),
    [entry.content, entry.tags],
  );

  const clearOpenSheetTimeout = useCallback(() => {
    if (openSheetTimeoutRef.current) {
      clearTimeout(openSheetTimeoutRef.current);
      openSheetTimeoutRef.current = null;
    }
  }, []);

  const clearResetCardTimeout = useCallback(() => {
    if (resetCardTimeoutRef.current) {
      clearTimeout(resetCardTimeoutRef.current);
      resetCardTimeoutRef.current = null;
    }
  }, []);

  const closeActionSheetAndResetCard = useCallback(() => {
    clearOpenSheetTimeout();
    clearResetCardTimeout();
    logger.log(
      '[EntryCard] closing action sheet and resetting card',
      entry.id,
      interactionState,
    );
    setInteractionState('closing');
    setShowActionSheet(false);
    resetCardTimeoutRef.current = setTimeout(() => {
      setInteractionState('idle');
      resetCardTimeoutRef.current = null;
    }, ENTRY_ACTION_SHEET_EXIT_DURATION);
  }, [clearOpenSheetTimeout, clearResetCardTimeout, entry.id, interactionState]);

  useEffect(() => {
    if (
      isActionSheetActive === false &&
      interactionState !== 'idle' &&
      interactionState !== 'closing'
    ) {
      logger.log(
        '[EntryCard] inactive while non-idle, closing current interaction',
        entry.id,
        interactionState,
      );
      closeActionSheetAndResetCard();
    }
  }, [closeActionSheetAndResetCard, entry.id, interactionState, isActionSheetActive]);

  useEffect(() => {
    return () => {
      clearOpenSheetTimeout();
      clearResetCardTimeout();
      if (stopRecordingTimeoutRef.current) {
        clearTimeout(stopRecordingTimeoutRef.current);
      }
    };
  }, [clearOpenSheetTimeout, clearResetCardTimeout]);

  const handleLongPress = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const handleSwipeTrigger = useCallback(
    (phase: 'willOpen' | 'open', direction?: 'left' | 'right') => {
      logger.log('[EntryCard] swipe trigger', {
        entryId: entry.id,
        phase,
        direction,
        interactionState,
        showActionSheet,
      });

      if (direction && direction !== 'right') {
        logger.log('[EntryCard] ignore non-left swipe direction', entry.id, direction);
        return;
      }

      if (interactionState !== 'idle' || showActionSheet) {
        logger.log('[EntryCard] ignore duplicate swipe trigger', entry.id, interactionState);
        return;
      }

      clearOpenSheetTimeout();
      clearResetCardTimeout();
      swipeableRef.current?.close();
      onActionSheetOpen?.(entry.id);
      setInteractionState('pendingSheet');
      openSheetTimeoutRef.current = setTimeout(() => {
        logger.log('[EntryCard] opening action sheet after delay', entry.id);
        setShowActionSheet(true);
        setInteractionState('sheetOpen');
        openSheetTimeoutRef.current = null;
      }, ACTION_SHEET_OPEN_DELAY);
    },
    [
      clearOpenSheetTimeout,
      clearResetCardTimeout,
      entry.id,
      interactionState,
      onActionSheetOpen,
      showActionSheet,
    ],
  );

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
        logger.log('图片记录，打开图片查看器');
        setShowImageViewer(true);
        break;
      case 'voice':
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

  const handleActionSheetDelete = useCallback(() => {
    onDelete(entry.id);
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
