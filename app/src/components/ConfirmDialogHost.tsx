import React from 'react';
import { ConfirmDialogModal } from '@/src/components/ConfirmDialogModal';
import { useConfirmDialogStore } from '@/src/store/confirmDialogStore';
import { logger } from '@/src/utils/logger';

export function ConfirmDialogHost() {
  const current = useConfirmDialogStore((state) => state.current);
  const dismiss = useConfirmDialogStore((state) => state.dismiss);

  if (!current) {
    return null;
  }

  return (
    <ConfirmDialogModal
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
              logger.error('[ConfirmDialogHost] dialog action failed:', error);
            }
          },
        })),
      }}
      onDismiss={dismiss}
    />
  );
}
