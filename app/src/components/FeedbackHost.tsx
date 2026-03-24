import React from 'react';
import { ErrorFeedbackModal } from '@/src/components/ErrorFeedbackModal';
import { useErrorFeedbackStore } from '@/src/store/errorFeedbackStore';

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
            await action.onPress?.();
          },
        })),
      }}
      onDismiss={dismiss}
    />
  );
}
