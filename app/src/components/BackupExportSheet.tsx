import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();

  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
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

            <View style={{ height: insets.bottom }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: '#F7F7F7',
  },
  actionText: {
    color: '#1A1A1A',
    fontSize: 17,
    fontWeight: '500',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    marginTop: 12,
  },
  cancelText: {
    color: '#8E8E93',
    fontSize: 17,
    fontWeight: '500',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: '#CFCFCF',
    borderRadius: 999,
    height: 5,
    marginBottom: 16,
    width: 40,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sheetWrap: {
    justifyContent: 'flex-end',
  },
  subtitle: {
    color: '#8E8E93',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  title: {
    color: '#1A1A1A',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
});
