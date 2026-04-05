import React from 'react';
import { Text, TextInput, Pressable, View, ScrollView } from 'react-native';
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

interface TagManagementResetCardProps {
  onReset: () => void;
}

function TagManagementResetCard({ onReset }: TagManagementResetCardProps) {
  return (
    <Pressable
      testID="tag-management-reset-button"
      style={[styles.resetCard, styles.resetRow]}
      onPress={onReset}
    >
      <Ionicons name="refresh" size={17} color="#007AFF" />
      <Text style={styles.resetText}>恢复初始预制标签</Text>
    </Pressable>
  );
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
    <View testID="tag-management-root" style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>
          当前预制标签 · 长按拖拽可排序
        </Text>

        <View style={styles.card}>
          <TagManagementTagList
            tags={tags}
            onDelete={onDelete}
            onDragEnd={onDragEnd}
          />
        </View>

        <Text style={styles.hint}>
          {tags.length} / {MAX_TAGS} 个
        </Text>

        <TagManagementResetCard onReset={onReset} />
      </ScrollView>

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
  );
}
