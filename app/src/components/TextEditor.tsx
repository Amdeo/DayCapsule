import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextEditorBody } from './text-editor/TextEditorBody';
import { TextEditorFooter } from './text-editor/TextEditorFooter';
import { textEditorStyles as styles } from './text-editor/TextEditor.styles';
import { useTextEditorController } from './text-editor/useTextEditorController';

interface TextEditorProps {
  visible: boolean;
  onSave: (content: string, tags: string[]) => void | Promise<void>;
  onCancel: () => void;
}

export function TextEditor({ visible, onSave, onCancel }: TextEditorProps) {
  const {
    content,
    tagsInput,
    suggestions,
    commonTags,
    currentTagsList,
    canSave,
    tagPanelExpanded,
    setContent,
    setTagsInput,
    handleAddSuggestion,
    handleRemoveTag,
    handleSave,
    handleCancel,
    toggleTagPanel,
  } = useTextEditorController({
    onSave,
    onCancel,
  });

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={handleCancel} />

        <View testID="text-editor-sheet" style={styles.editor}>
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          <View style={styles.header}>
            <Text style={styles.headerTitle}>新记录</Text>
            <Pressable onPress={handleCancel} style={styles.closeButton}>
              <Ionicons name="close" size={16} color="#6F6257" />
            </Pressable>
          </View>

          <TextEditorBody
            content={content}
            tagsInput={tagsInput}
            commonTags={commonTags}
            currentTagsList={currentTagsList}
            suggestions={suggestions}
            tagPanelExpanded={tagPanelExpanded}
            onChangeContent={setContent}
            onChangeTagsInput={setTagsInput}
            onAddTag={handleAddSuggestion}
            onRemoveTag={handleRemoveTag}
            onToggleTagPanel={toggleTagPanel}
          />
          <TextEditorFooter
            canSave={canSave}
            onCancel={handleCancel}
            onSave={handleSave}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
