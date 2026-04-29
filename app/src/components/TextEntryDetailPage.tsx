import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Entry } from '@/src/types/entry';
import { useKeyboardHeight } from '@/src/hooks/useKeyboardHeight';
import { DetailPageShell } from './DetailPageShell';
import { TextEntryDetailContent } from './text-entry-detail-page/TextEntryDetailContent';
import { textEntryDetailPageStyles as styles } from './text-entry-detail-page/TextEntryDetailPage.styles';
import { useTextEntryDetailPageController } from './text-entry-detail-page/useTextEntryDetailPageController';

interface TextEntryDetailPageProps {
  visible: boolean;
  entry: Entry | null;
  onClose: () => void;
  onSave: (id: string, content: string, tags: string[]) => void | Promise<void>;
}

export function TextEntryDetailPage({
  visible,
  entry,
  onClose,
  onSave,
}: TextEntryDetailPageProps) {
  const detail = useTextEntryDetailPageController({ entry, onSave });
  const keyboardHeight = useKeyboardHeight();

  if (!visible || !detail) return null;

  const footerContent = detail.isEditing ? (
    <View style={styles.bottomBar}>
      <View style={styles.editBarRow}>
        <Pressable
          testID="text-entry-detail-cancel-button"
          style={styles.cancelButton}
          onPress={detail.handleCancelEdit}
          disabled={detail.isSaving}
        >
          <Text style={styles.cancelButtonText}>取消</Text>
        </Pressable>
        <Pressable
          testID="text-entry-detail-save-button"
          style={[styles.saveButton, !detail.canSave && styles.saveButtonDisabled]}
          onPress={detail.handleSaveEdit}
          disabled={!detail.canSave || detail.isSaving}
        >
          <Text
            style={[
              styles.saveButtonText,
              !detail.canSave && styles.saveButtonTextDisabled,
            ]}
          >
            保存修改
          </Text>
        </Pressable>
      </View>
    </View>
  ) : (
    <View style={styles.bottomBar}>
      <Pressable
        testID="text-entry-detail-edit-button"
        style={styles.editButton}
        onPress={detail.handleStartEdit}
      >
        <Ionicons name="pencil" size={15} color="#FFFFFF" />
        <Text style={styles.editButtonText}>编辑</Text>
      </Pressable>
    </View>
  );

  return (
    <DetailPageShell
      visible={visible}
      title={detail.isEditing ? '编辑' : '文字记录'}
      onClose={detail.isEditing ? detail.handleCancelEdit : onClose}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: keyboardHeight + 40 },
      ]}
      footerContent={footerContent}
    >
      <TextEntryDetailContent
        isEditing={detail.isEditing}
        content={detail.content}
        createdAt={detail.createdAt}
        editedAt={detail.editedAt}
        tags={detail.tags}
        editContent={detail.editContent}
        editTagsInput={detail.editTagsInput}
        editCurrentTagsList={detail.editCurrentTagsList}
        editSuggestions={detail.editSuggestions}
        commonTags={detail.commonTags}
        tagPanelExpanded={detail.tagPanelExpanded}
        onChangeEditContent={detail.setEditContent}
        onChangeTagsInput={detail.setEditTagsInput}
        onAddTag={detail.handleAddTag}
        onRemoveTag={detail.handleRemoveTag}
        onToggleTagPanel={detail.toggleTagPanel}
      />
    </DetailPageShell>
  );
}
