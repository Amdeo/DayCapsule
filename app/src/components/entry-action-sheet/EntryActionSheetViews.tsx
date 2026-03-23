import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { entryActionSheetStyles as styles } from './EntryActionSheet.styles';

interface EntryActionSheetMenuProps {
  onEdit: () => void;
  onDeleteRequest: () => void;
  onClose: () => void;
}

interface EntryActionSheetConfirmProps {
  onConfirmDelete: () => void;
  onCancel: () => void;
}

export function EntryActionSheetMenu({
  onEdit,
  onDeleteRequest,
  onClose,
}: EntryActionSheetMenuProps) {
  return (
    <>
      <View testID="action-sheet-option-group" style={styles.optionGroup}>
        <TouchableOpacity
          testID="action-sheet-edit"
          style={styles.optionRow}
          onPress={onEdit}
        >
          <Ionicons name="pencil-outline" size={20} color="#8E8E93" />
          <Text style={styles.optionText}>编辑</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          testID="action-sheet-delete"
          style={styles.optionRow}
          onPress={onDeleteRequest}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          <Text style={styles.deleteText}>删除</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        testID="action-sheet-cancel"
        style={styles.cancelButton}
        onPress={onClose}
      >
        <Text style={styles.cancelText}>取消</Text>
      </TouchableOpacity>
    </>
  );
}

export function EntryActionSheetConfirm({
  onConfirmDelete,
  onCancel,
}: EntryActionSheetConfirmProps) {
  return (
    <View style={styles.confirmGroup}>
      <Text style={styles.confirmTitle}>确认删除这条记录？</Text>
      <Text style={styles.confirmSubtitle}>此操作无法撤销</Text>

      <TouchableOpacity
        testID="action-sheet-confirm-delete"
        style={styles.confirmDeleteButton}
        onPress={onConfirmDelete}
      >
        <Text style={styles.confirmDeleteText}>删除</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="action-sheet-confirm-cancel"
        style={styles.confirmCancelButton}
        onPress={onCancel}
      >
        <Text style={styles.cancelText}>取消</Text>
      </TouchableOpacity>
    </View>
  );
}
