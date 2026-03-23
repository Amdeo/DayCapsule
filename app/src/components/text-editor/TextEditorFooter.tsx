import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { textEditorStyles as styles } from './TextEditor.styles';

interface TextEditorFooterProps {
  canSave: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export function TextEditorFooter({
  canSave,
  onCancel,
  onSave,
}: TextEditorFooterProps) {
  return (
    <View style={styles.footer}>
      <Pressable
        style={[styles.button, styles.cancelButton]}
        onPress={onCancel}
      >
        <Text style={styles.cancelButtonText}>取消</Text>
      </Pressable>
      <Pressable
        testID="text-editor-save-button"
        style={[
          styles.button,
          styles.saveButton,
          !canSave && styles.saveButtonDisabled,
        ]}
        onPress={onSave}
        disabled={!canSave}
      >
        <Text
          style={[
            styles.saveButtonText,
            !canSave && styles.saveButtonTextDisabled,
          ]}
        >
          保存
        </Text>
      </Pressable>
    </View>
  );
}
