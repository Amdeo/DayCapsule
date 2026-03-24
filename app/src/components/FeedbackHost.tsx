import React from 'react';
import { AppDialogModal } from '@/src/components/AppDialogModal';
import { useAppDialogStore } from '@/src/store/appDialogStore';

export function FeedbackHost() {
  const current = useAppDialogStore((state) => state.current);
  const dismiss = useAppDialogStore((state) => state.dismiss);

  if (!current) {
    return null;
  }

  return (
    <AppDialogModal
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
