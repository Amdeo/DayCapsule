import React from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EntryActionSheetScene } from './entry-action-sheet/EntryActionSheetScene';
import {
  ENTRY_ACTION_SHEET_EXIT_DURATION,
  type EntryType,
} from './entry-action-sheet/entryActionSheetConfig';
import { useEntryActionSheetController } from './entry-action-sheet/useEntryActionSheetController';

export { ENTRY_ACTION_SHEET_EXIT_DURATION } from './entry-action-sheet/entryActionSheetConfig';

interface EntryActionSheetProps {
  visible: boolean;
  entryType: EntryType;
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
  onClose: () => void;
}

export function EntryActionSheet({
  visible,
  entryType,
  onEdit,
  onDelete,
  onClose,
}: EntryActionSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const {
    mode,
    setMode,
    shouldRender,
    typeColor,
    panHandlers,
    backdropStyle,
    sheetStyle,
  } = useEntryActionSheetController({
    visible,
    entryType,
    screenHeight,
    onClose,
  });

  return (
    <EntryActionSheetScene
      shouldRender={shouldRender}
      mode={mode}
      typeColor={typeColor}
      bottomInset={insets.bottom}
      panHandlers={panHandlers}
      backdropStyle={backdropStyle}
      sheetStyle={sheetStyle}
      onClose={onClose}
      onEdit={onEdit}
      onDeleteRequest={() => setMode('confirm')}
      onConfirmDelete={async () => {
        try {
          await onDelete();
          onClose();
        } catch {
          // Keep the confirm state open so the caller can surface feedback and allow retry.
        }
      }}
      onCancelDelete={() => setMode('menu')}
    />
  );
}
