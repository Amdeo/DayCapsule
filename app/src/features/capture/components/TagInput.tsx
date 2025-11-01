import React, {useState} from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {TextInput, Chip, Text, useTheme} from 'react-native-paper';

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onTagsChange,
  suggestions = [],
  placeholder = '添加标签...',
  maxTags = 10,
}) => {
  const theme = useTheme();
  const [inputValue, setInputValue] = useState('');

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) {
      return;
    }

    if (tags.length >= maxTags) {
      return;
    }

    if (!tags.includes(trimmedTag)) {
      onTagsChange([...tags, trimmedTag]);
    }

    setInputValue('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmitEditing = () => {
    if (inputValue.trim()) {
      handleAddTag(inputValue);
    }
  };

  const filteredSuggestions = suggestions.filter(
    suggestion =>
      !tags.includes(suggestion) && suggestion.toLowerCase().includes(inputValue.toLowerCase()),
  );

  return (
    <View style={styles.container} testID="tag-input-container">
      <TextInput
        mode="outlined"
        label="标签"
        placeholder={placeholder}
        value={inputValue}
        onChangeText={setInputValue}
        onSubmitEditing={handleSubmitEditing}
        returnKeyType="done"
        style={styles.input}
        testID="tag-input"
        right={
          <TextInput.Affix
            text={`${tags.length}/${maxTags}`}
            textStyle={{color: theme.colors.onSurfaceVariant}}
          />
        }
      />

      {/* 已添加的标签 */}
      {tags.length > 0 && (
        <View style={styles.tagsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tags.map(tag => (
              <Chip
                key={tag}
                mode="flat"
                onClose={() => handleRemoveTag(tag)}
                style={styles.tag}
                textStyle={styles.tagText}
                testID={`tag-delete-${tag}`}>
                {tag}
              </Chip>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 标签建议 */}
      {filteredSuggestions.length > 0 && inputValue.length > 0 && (
        <View style={styles.suggestionsContainer} testID="tag-suggestions">
          <Text
            variant="labelSmall"
            style={[styles.suggestionsLabel, {color: theme.colors.onSurfaceVariant}]}>
            建议标签
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filteredSuggestions.slice(0, 5).map(suggestion => (
              <Chip
                key={suggestion}
                mode="outlined"
                onPress={() => handleAddTag(suggestion)}
                style={styles.suggestionChip}
                testID={`tag-suggestion-${suggestion}`}>
                {suggestion}
              </Chip>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 添加标签按钮 */}
      {inputValue.trim().length > 0 && (
        <Chip
          mode="outlined"
          onPress={() => handleAddTag(inputValue)}
          style={styles.addButton}
          testID="tag-add-button">
          添加标签
        </Chip>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  input: {
    backgroundColor: 'transparent',
  },
  tagsContainer: {
    marginTop: 8,
  },
  tag: {
    marginRight: 8,
  },
  tagText: {
    fontSize: 14,
  },
  suggestionsContainer: {
    marginTop: 12,
  },
  suggestionsLabel: {
    marginBottom: 8,
    marginLeft: 4,
  },
  suggestionChip: {
    marginRight: 8,
  },
  addButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
});
