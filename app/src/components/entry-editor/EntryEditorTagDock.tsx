import React from 'react';
import {
  Text,
  TextInput,
  Pressable,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { entryEditorStyles as styles } from './EntryEditor.styles';

interface EntryEditorTagDockProps {
  commonTags: string[];
  currentTagsList: string[];
  tagsInput: string;
  suggestions: string[];
  onChangeTagsInput: (value: string) => void;
  onAddSuggestion: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

export function EntryEditorTagDock({
  commonTags,
  currentTagsList,
  tagsInput,
  suggestions,
  onChangeTagsInput,
  onAddSuggestion,
  onRemoveTag,
}: EntryEditorTagDockProps) {
  return (
    <View testID="entry-editor-tag-dock" style={styles.tagDock}>
      <View style={styles.tagDockHeader}>
        <Text style={styles.tagDockTitle}>标签</Text>
        {currentTagsList.length > 0 ? (
          <Text style={styles.tagDockCount}>{currentTagsList.length} 个已选</Text>
        ) : null}
      </View>

      {commonTags.length > 0 ? (
        <View style={styles.commonTagsRow}>
          {commonTags.map((tag) => {
            const selected = currentTagsList.includes(tag);
            return (
              <Pressable
                key={tag}
                style={[styles.commonChip, selected && styles.commonChipSelected]}
                onPress={() => (selected ? onRemoveTag(tag) : onAddSuggestion(tag))}
              >
                <Text
                  style={[
                    styles.commonChipText,
                    selected && styles.commonChipTextSelected,
                  ]}
                >
                  {tag}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <TextInput
        testID="entry-editor-tags-input"
        style={styles.tagsInput}
        value={tagsInput}
        onChangeText={onChangeTagsInput}
        placeholder="添加标签，用逗号分隔"
        placeholderTextColor="#B6AAA0"
      />

      {currentTagsList.length > 0 ? (
        <View style={styles.tagsPreview}>
          {currentTagsList.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagChipText}>#{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {suggestions.length > 0 ? (
        <View style={styles.suggestionsRow}>
          {suggestions.map((tag) => (
            <Pressable
              key={tag}
              style={styles.suggestionChip}
              onPress={() => onAddSuggestion(tag)}
            >
              <Ionicons name="add" size={13} color="#8F7AC8" />
              <Text style={styles.suggestionChipText}>{tag}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
