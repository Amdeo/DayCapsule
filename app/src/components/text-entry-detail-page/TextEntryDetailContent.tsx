import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { textEntryDetailPageStyles as styles } from './TextEntryDetailPage.styles';
import { TagArea } from '@/src/components/text-editor/TagArea';
import { SelectableTextBody } from './SelectableTextBody';

interface TextEntryDetailContentProps {
  isEditing: boolean;
  // read-mode
  content: string;
  createdAt: string;
  editedAt: string | null;
  tags: string[];
  // edit-mode
  editContent: string;
  editTagsInput: string;
  editCurrentTagsList: string[];
  editSuggestions: string[];
  commonTags: string[];
  tagPanelExpanded: boolean;
  onChangeEditContent: (v: string) => void;
  onChangeTagsInput: (v: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onToggleTagPanel: () => void;
}

export function TextEntryDetailContent({
  isEditing,
  content,
  createdAt,
  editedAt,
  tags,
  editContent,
  editTagsInput,
  editCurrentTagsList,
  editSuggestions,
  commonTags,
  tagPanelExpanded,
  onChangeEditContent,
  onChangeTagsInput,
  onAddTag,
  onRemoveTag,
  onToggleTagPanel,
}: TextEntryDetailContentProps) {
  if (isEditing) {
    return (
      <View testID="text-entry-detail-root">
        <View testID="text-entry-detail-hero" style={styles.editContentCard}>
          <TextInput
            testID="text-entry-detail-edit-input"
            style={styles.editContentInput}
            value={editContent}
            onChangeText={onChangeEditContent}
            placeholder="写点什么..."
            placeholderTextColor="#C0B8B0"
            multiline
            textAlignVertical="top"
            autoFocus
          />
        </View>
        <TagArea
          commonTags={commonTags}
          currentTagsList={editCurrentTagsList}
          suggestions={editSuggestions}
          tagsInput={editTagsInput}
          tagPanelExpanded={tagPanelExpanded}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onToggleTagPanel={onToggleTagPanel}
          onChangeTagsInput={onChangeTagsInput}
        />
        <View style={styles.metaSection}>
          <Text style={styles.metaText}>{createdAt} 创建</Text>
        </View>
      </View>
    );
  }

  return (
    <View testID="text-entry-detail-root">
      <View testID="text-entry-detail-top-meta" style={styles.topMetaSection}>
        <Text testID="text-entry-detail-created-at" style={styles.metaText}>
          {createdAt} 创建
        </Text>
      </View>

      <View testID="text-entry-detail-hero" style={styles.heroBlock}>
        <SelectableTextBody
          content={content}
          testID="text-entry-detail-content"
          style={styles.contentText}
        />
      </View>

      {tags.length > 0 && (
        <View testID="text-entry-detail-tags" style={styles.tagsSection}>
          <View style={styles.tagsWrap}>
            {tags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {editedAt ? (
        <View testID="text-entry-detail-meta" style={styles.metaSection}>
          <Text style={styles.metaText}>最近编辑：{editedAt}</Text>
        </View>
      ) : null}
    </View>
  );
}
