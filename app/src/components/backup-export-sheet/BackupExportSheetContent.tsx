import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { backupExportSheetStyles as styles } from './BackupExportSheet.styles';

interface BackupExportSheetContentProps {
  fileName: string;
  onSaveToFiles: () => void;
  onClose: () => void;
}

export function BackupExportSheetContent({
  fileName,
  onSaveToFiles,
  onClose,
}: BackupExportSheetContentProps) {
  const { bottom } = useSafeAreaInsets();

  return (
    <View testID="backup-export-sheet" style={styles.container}>
      <Pressable
        testID="backup-export-overlay"
        style={StyleSheet.absoluteFill}
        onPress={onClose}
      >
        <View style={styles.backdrop} />
      </Pressable>

      <View style={styles.sheetWrap}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>导出备份</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {fileName}
          </Text>

          <TouchableOpacity
            testID="backup-export-save"
            style={styles.actionButton}
            onPress={onSaveToFiles}
          >
            <Text style={styles.actionText}>保存到文件</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="backup-export-cancel"
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>

          <View style={{ height: bottom }} />
        </View>
      </View>
    </View>
  );
}
