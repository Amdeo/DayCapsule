import React from 'react';
import { ErrorFeedbackModal } from '@/src/components/ErrorFeedbackModal';
import { useErrorFeedbackStore } from '@/src/store/errorFeedbackStore';
import { logger } from '@/src/utils/logger';

export function FeedbackHost() {
  const current = useErrorFeedbackStore((state) => state.current);
  const dismiss = useErrorFeedbackStore((state) => state.dismiss);

  if (!current) {
    return null;
  }

  return (
    <ErrorFeedbackModal
      visible
      request={{
        ...current,
        actions: current.actions.map((action) => ({
          ...action,
          onPress: async () => {
            dismiss();
            try {
              await action.onPress?.();
            } catch (error) {
              logger.error('[FeedbackHost] feedback action failed:', error);
            }
          },
        })),
      }}
      onDismiss={dismiss}
    />
  );
}
