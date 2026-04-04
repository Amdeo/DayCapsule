import React from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { textEditorStyles as styles } from './TextEditor.styles';
import { TagArea } from './TagArea';

interface TextEditorBodyProps {
  content: string;
  tagsInput: string;
  commonTags: string[];
  currentTagsList: string[];
  suggestions: string[];
  tagPanelExpanded: boolean;
  onChangeContent: (value: string) => void;
  onChangeTagsInput: (value: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onToggleTagPanel: () => void;
}

export function TextEditorBody({
  content,
  tagsInput,
  commonTags,
  currentTagsList,
  suggestions,
  tagPanelExpanded,
  onChangeContent,
  onChangeTagsInput,
  onAddTag,
  onRemoveTag,
  onToggleTagPanel,
}: TextEditorBodyProps) {
  return (
    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.contentPadding}>
        <View style={styles.contentCard}>
          <TextInput
            testID="text-editor-content-input"
            style={styles.contentInput}
            value={content}
            onChangeText={onChangeContent}
            placeholder="写点什么..."
            placeholderTextColor="#C0B8B0"
            multiline
            textAlignVertical="top"
            autoFocus
          />
        </View>
      </View>
      <TagArea
        commonTags={commonTags}
        currentTagsList={currentTagsList}
        suggestions={suggestions}
        tagsInput={tagsInput}
        tagPanelExpanded={tagPanelExpanded}
        onAddTag={onAddTag}
        onRemoveTag={onRemoveTag}
        onToggleTagPanel={onToggleTagPanel}
        onChangeTagsInput={onChangeTagsInput}
      />
    </ScrollView>
  );
}
