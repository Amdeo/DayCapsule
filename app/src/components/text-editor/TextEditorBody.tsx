import React from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { textEditorStyles as styles } from './TextEditor.styles';

interface TextEditorBodyProps {
  content: string;
  tagsInput: string;
  commonTags: string[];
  currentTagsList: string[];
  suggestions: string[];
  onChangeContent: (value: string) => void;
  onChangeTagsInput: (value: string) => void;
  onAddSuggestion: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

export function TextEditorBody({
  content,
  tagsInput,
  commonTags,
  currentTagsList,
  suggestions,
  onChangeContent,
  onChangeTagsInput,
  onAddSuggestion,
  onRemoveTag,
}: TextEditorBodyProps) {
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.typeTag}>
        <Ionicons name="document-text" size={16} color="#6A89CC" />
        <Text style={styles.typeText}>文本</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>内容</Text>
        <TextInput
          testID="text-editor-content-input"
          style={styles.textInput}
          value={content}
          onChangeText={onChangeContent}
          placeholder="输入内容..."
          placeholderTextColor="#A3A3A3"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          autoFocus
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>标签</Text>
        {commonTags.length > 0 ? (
          <View style={styles.commonTagsRow}>
            {commonTags.map((tag) => {
              const selected = currentTagsList.includes(tag);
              return (
                <TouchableOpacity
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
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
        <TextInput
          testID="text-editor-tags-input"
          style={styles.input}
          value={tagsInput}
          onChangeText={onChangeTagsInput}
          placeholder="用逗号分隔多个标签，如：生活, 工作"
          placeholderTextColor="#A3A3A3"
        />
        {tagsInput.length > 0 ? (
          <View style={styles.tagsPreview}>
            {tagsInput
              .split(',')
              .map((tag) => tag.trim())
              .filter((tag) => tag.length > 0)
              .map((tag, index) => (
                <View key={`${tag}-${index}`} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
          </View>
        ) : null}
        {suggestions.length > 0 ? (
          <View style={styles.suggestionsRow}>
            <Text style={styles.suggestionsLabel}>建议：</Text>
            {suggestions.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={styles.suggestionChip}
                onPress={() => onAddSuggestion(tag)}
              >
                <Ionicons name="add" size={13} color="#6A89CC" />
                <Text style={styles.suggestionChipText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
