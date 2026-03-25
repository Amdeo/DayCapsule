import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Entry } from '../types/entry';
import { EntryEditorContent } from './entry-editor/EntryEditorContent';
import { EntryEditorTagDock } from './entry-editor/EntryEditorTagDock';
import { entryEditorStyles as styles } from './entry-editor/EntryEditor.styles';
import { useEntryEditorController } from './entry-editor/useEntryEditorController';

interface EntryEditorProps {
  visible: boolean;
  entry: Entry | null;
  onSave: (id: string, content: string, tags: string[]) => void | Promise<void>;
  onClose: () => void;
}

export function EntryEditor({ visible, entry, onSave, onClose }: EntryEditorProps) {
  const {
    content,
    tagsInput,
    suggestions,
    commonTags,
    currentTagsList,
    typeMeta,
    canSave,
    setContent,
    setTagsInput,
    handleAddSuggestion,
    handleRemoveTag,
    handleSave,
    handleRequestClose,
  } = useEntryEditorController({
    visible,
    entry,
    onSave,
    onClose,
  });

  if (!visible || !entry) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleRequestClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={handleRequestClose} />

        <View style={styles.editorPage}>
          <View testID="entry-editor-header" style={styles.headerBar}>
            <Pressable
              testID="entry-editor-back-button"
              onPress={handleRequestClose}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>返回</Text>
            </Pressable>
            <Text style={styles.headerTitle}>编辑记录</Text>
            <Pressable
              testID="entry-editor-save-button"
              accessibilityState={{ disabled: !canSave }}
              disabled={!canSave}
              onPress={handleSave}
              style={styles.headerButton}
            >
              <Text style={styles.headerSaveText}>保存</Text>
            </Pressable>
          </View>

          <EntryEditorContent
            entry={entry}
            typeMeta={typeMeta!}
            content={content}
            onChangeContent={setContent}
          />
          <EntryEditorTagDock
            commonTags={commonTags}
            currentTagsList={currentTagsList}
            tagsInput={tagsInput}
            suggestions={suggestions}
            onChangeTagsInput={setTagsInput}
            onAddSuggestion={handleAddSuggestion}
            onRemoveTag={handleRemoveTag}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
