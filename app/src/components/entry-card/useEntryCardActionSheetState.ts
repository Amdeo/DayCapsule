import { useCallback, useEffect, useRef, useState } from 'react';
import type { Swipeable } from 'react-native-gesture-handler';
import { logger } from '@/src/utils/logger';
import { ENTRY_ACTION_SHEET_EXIT_DURATION } from '@/src/components/entry-action-sheet/entryActionSheetConfig';

const ACTION_SHEET_OPEN_DELAY = 100;

type CardInteractionState = 'idle' | 'pendingSheet' | 'sheetOpen' | 'closing';

interface UseEntryCardActionSheetStateOptions {
  entryId: string;
  isActionSheetActive?: boolean;
  onActionSheetOpen?: (entryId: string) => void;
}

export function useEntryCardActionSheetState({
  entryId,
  isActionSheetActive,
  onActionSheetOpen,
}: UseEntryCardActionSheetStateOptions) {
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [interactionState, setInteractionState] = useState<CardInteractionState>('idle');

  const swipeableRef = useRef<Swipeable>(null);
  const interactionStateRef = useRef<CardInteractionState>('idle');
  const openSheetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetCardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const setInteractionStateSafely = useCallback((nextState: CardInteractionState) => {
    interactionStateRef.current = nextState;
    setInteractionState(nextState);
  }, []);

  const closeActionSheetAndResetCard = useCallback(() => {
    clearOpenSheetTimeout();
    clearResetCardTimeout();
    logger.log(
      '[EntryCard] closing action sheet and resetting card',
      entryId,
      interactionState,
    );
    setInteractionStateSafely('closing');
    setShowActionSheet(false);
    resetCardTimeoutRef.current = setTimeout(() => {
      setInteractionStateSafely('idle');
      resetCardTimeoutRef.current = null;
    }, ENTRY_ACTION_SHEET_EXIT_DURATION);
  }, [clearOpenSheetTimeout, clearResetCardTimeout, entryId, interactionState, setInteractionStateSafely]);

  useEffect(() => {
    if (
      isActionSheetActive === false &&
      interactionState !== 'idle' &&
      interactionState !== 'closing'
    ) {
      logger.log(
        '[EntryCard] inactive while non-idle, closing current interaction',
        entryId,
        interactionState,
      );
      closeActionSheetAndResetCard();
    }
  }, [closeActionSheetAndResetCard, entryId, interactionState, isActionSheetActive]);

  useEffect(() => {
    return () => {
      clearOpenSheetTimeout();
      clearResetCardTimeout();
    };
  }, [clearOpenSheetTimeout, clearResetCardTimeout]);

  const handleSwipeTrigger = useCallback(
    (phase: 'willOpen' | 'open', direction?: 'left' | 'right') => {
      logger.log('[EntryCard] swipe trigger', {
        entryId,
        phase,
        direction,
        interactionState,
        showActionSheet,
      });

      if (direction && direction !== 'right') {
        logger.log('[EntryCard] ignore non-left swipe direction', entryId, direction);
        return;
      }

      if (interactionStateRef.current !== 'idle' || showActionSheet) {
        logger.log('[EntryCard] ignore duplicate swipe trigger', entryId, interactionState);
        return;
      }

      clearOpenSheetTimeout();
      clearResetCardTimeout();
      swipeableRef.current?.close();
      onActionSheetOpen?.(entryId);
      setInteractionStateSafely('pendingSheet');
      openSheetTimeoutRef.current = setTimeout(() => {
        logger.log('[EntryCard] opening action sheet after delay', entryId);
        setShowActionSheet(true);
        setInteractionStateSafely('sheetOpen');
        openSheetTimeoutRef.current = null;
      }, ACTION_SHEET_OPEN_DELAY);
    },
    [
      clearOpenSheetTimeout,
      clearResetCardTimeout,
      entryId,
      interactionState,
      onActionSheetOpen,
      setInteractionStateSafely,
      showActionSheet,
    ],
  );

  return {
    swipeableRef,
    showActionSheet,
    handleSwipeTrigger,
    closeActionSheetAndResetCard,
  };
}
