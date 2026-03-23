import React from 'react';
import { Modal } from 'react-native';
import { BackupExportSheetContent } from './backup-export-sheet/BackupExportSheetContent';

interface BackupExportSheetProps {
  visible: boolean;
  fileName: string;
  onSaveToFiles: () => void;
  onClose: () => void;
}

export function BackupExportSheet({
  visible,
  fileName,
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
        onSaveToFiles={onSaveToFiles}
        onClose={onClose}
      />
    </Modal>
  );
}
