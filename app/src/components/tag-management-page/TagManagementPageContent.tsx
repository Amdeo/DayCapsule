import React from 'react';
import { Text, TextInput, Pressable, View } from 'react-native';
import { NestableScrollContainer } from 'react-native-draggable-flatlist';
import type { DragEndParams } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import { tagManagementPageStyles as styles } from './TagManagementPage.styles';
import { MAX_TAGS } from './tagManagementConfig';
import { TagManagementTagList } from './TagManagementTagList';

interface TagManagementPageContentProps {
  tags: string[];
  inputValue: string;
  atLimit: boolean;
  onInputChange: (value: string) => void;
  onAdd: () => void;
  onDelete: (tag: string) => void;
  onReset: () => void;
  onDragEnd: (params: DragEndParams<string>) => void;
}

export function TagManagementPageContent({
  tags,
  inputValue,
  atLimit,
  onInputChange,
  onAdd,
  onDelete,
  onReset,
  onDragEnd,
}: TagManagementPageContentProps) {
  return (
    <NestableScrollContainer>
      <View testID="tag-management-root">
        <Pressable
          testID="tag-management-reset-button"
          style={styles.resetRow}
          onPress={onReset}
        >
          <Ionicons name="refresh" size={18} color="#6A89CC" />
          <Text style={styles.resetText}>恢复初始预制标签</Text>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>当前预制标签</Text>
          <Text style={styles.sectionSubtitle}>这组标签会出现在快速选择区域</Text>
        </View>
        <Text style={styles.hint}>
          {tags.length} / {MAX_TAGS} 个
        </Text>

        <View testID="tag-management-tags-container">
          <TagManagementTagList
            tags={tags}
            onDelete={onDelete}
            onDragEnd={onDragEnd}
          />
        </View>

        <View style={styles.addRow}>
          <TextInput
            testID="tag-management-add-input"
            style={[styles.addInput, atLimit && styles.addInputDisabled]}
            value={inputValue}
            onChangeText={onInputChange}
            placeholder={atLimit ? `最多 ${MAX_TAGS} 个预制标签` : '输入新预制标签'}
            placeholderTextColor="#A3A3A3"
            editable={!atLimit}
            returnKeyType="done"
            onSubmitEditing={onAdd}
          />
          <Pressable
            testID="tag-management-add-button"
            style={[styles.addButton, atLimit && styles.addButtonDisabled]}
            onPress={onAdd}
            disabled={atLimit}
          >
            <Text style={[styles.addButtonText, atLimit && styles.addButtonTextDisabled]}>添加</Text>
          </Pressable>
        </View>
      </View>
    </NestableScrollContainer>
  );
}
