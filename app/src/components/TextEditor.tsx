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
        className="flex-1 justify-end"
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable className="absolute top-0 left-0 right-0 bottom-0 bg-black/50" onPress={handleCancel} />

        <View testID="text-editor-sheet" style={styles.editor}>
          <View className="items-center pt-3 pb-1">
            <View className="w-9 h-1 bg-[#D1D1D1] rounded-sm" />
          </View>

          <View className="flex-row items-center justify-between px-5 pt-1 pb-2.5">
            <Text className="text-[15px] font-semibold text-[#3F332A]">新记录</Text>
            <Pressable onPress={handleCancel} className="w-[30px] h-[30px] items-center justify-center rounded-[15px] bg-[#F0EDEA]">
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
