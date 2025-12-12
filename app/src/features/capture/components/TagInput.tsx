import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip, TextInput, useTheme } from 'react-native-paper';
import { MD3Theme } from 'react-native-paper/lib/typescript/types';

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  suggestions?: string[];
  maxTags?: number;
  placeholder?: string;
  testID?: string; // Add testID prop
}

const TagInput: React.FC<TagInputProps> = ({
  tags,
  onTagsChange,
  suggestions = [],
  maxTags,
  placeholder = '添加标签...',
  testID
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [text, setText] = useState('');

  const handleAddTag = () => {
    const trimmed = text.trim();
    if (trimmed.length > 0 && !tags.includes(trimmed) && (!maxTags || tags.length < maxTags)) {
      onTagsChange([...tags, trimmed]);
      setText('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <View style={styles.container}>
      <View style={styles.chipContainer}>
        {tags.map(tag => (
          <Chip
            key={tag}
            onClose={() => handleRemoveTag(tag)}
            style={styles.chip}
            textStyle={styles.chipText}
          >
            <Text>{tag}</Text>
          </Chip>
        ))}
      </View>
      <TextInput
        testID={testID} // Apply testID
        value={text}
        onChangeText={setText}
        onSubmitEditing={handleAddTag}
        placeholder={placeholder}
        mode="outlined"
        style={styles.input}
        right={<TextInput.Icon icon="plus" onPress={handleAddTag} testID={`${testID}-add-button`} />} // Add testID
      />
    </View>
  );
};

const getStyles = (theme: MD3Theme) => StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: theme.colors.secondaryContainer,
  },
  chipText: {
    color: theme.colors.onSecondaryContainer,
  },
  input: {
    backgroundColor: theme.colors.surface,
  },
});

export default TagInput;