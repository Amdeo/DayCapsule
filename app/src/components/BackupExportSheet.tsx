import React from 'react';
import { Modal } from 'react-native';
import { BackupExportSheetContent } from './backup-export-sheet/BackupExportSheetContent';

interface BackupExportSheetProps {
  visible: boolean;
  fileName: string;
  primaryActionLabel: string;
  onSaveToFiles: () => void;
  onClose: () => void;
}

export function BackupExportSheet({
  visible,
  fileName,
  primaryActionLabel,
  onSaveToFiles,
  onClose,
}: BackupExportSheetProps) {
  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <BackupExportSheetContent
        fileName={fileName}
        primaryActionLabel={primaryActionLabel}
        onSaveToFiles={onSaveToFiles}
        onClose={onClose}
      />
    </Modal>
  );
}
