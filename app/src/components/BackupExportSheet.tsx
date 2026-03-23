import React from 'react';
import {
  Modal,
  Pressable,
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
      <View className="flex-1 justify-end">
        <Pressable
          testID="backup-export-overlay"
          className="absolute inset-0"
          onPress={onClose}
        >
          <View className="absolute inset-0 bg-black/40" />
        </Pressable>

        <View className="justify-end">
          <View
            className="rounded-t-[24px] bg-white px-4 pb-0 pt-3"
            testID="backup-export-sheet"
          >
            <View className="mb-4 h-[5px] w-10 self-center rounded-full bg-[#CFCFCF]" />
            <Text className="mb-1 text-center text-lg font-semibold text-[#1A1A1A]">导出备份</Text>
            <Text className="mb-3 text-center text-[13px] text-[#8E8E93]" numberOfLines={1}>
              {fileName}
            </Text>

            <TouchableOpacity
              testID="backup-export-save"
              className="mt-2 h-[52px] items-center justify-center rounded-2xl bg-[#F7F7F7]"
              onPress={onSaveToFiles}
            >
              <Text className="text-[17px] font-medium text-[#1A1A1A]">保存到文件</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="backup-export-cancel"
              className="mt-3 h-[52px] items-center justify-center rounded-2xl bg-white"
              onPress={onClose}
            >
              <Text className="text-[17px] font-medium text-[#8E8E93]">取消</Text>
            </TouchableOpacity>

            <View style={{ height: insets.bottom }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
