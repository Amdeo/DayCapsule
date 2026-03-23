import React from 'react';
import { Text, TextInput, TouchableOpacity, View, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tagManagementPageStyles as styles } from './TagManagementPage.styles';
import { MAX_TAGS } from './tagManagementConfig';
import { TagManagementTagList } from './TagManagementTagList';
import type { DragState } from './useTagManagementController';

interface TagManagementPageContentProps {
  tags: string[];
  inputValue: string;
  dragState: DragState | null;
  dragTranslationY: Animated.Value;
  atLimit: boolean;
  containerHeight: number;
  onInputChange: (value: string) => void;
  onAdd: () => void;
  onDelete: (tag: string) => void;
  onReset: () => void;
  createPanResponderConfig: (
    tag: string,
    index: number,
  ) => Record<string, unknown>;
}

export function TagManagementPageContent({
  tags,
  inputValue,
  dragState,
  dragTranslationY,
  atLimit,
  containerHeight,
  onInputChange,
  onAdd,
  onDelete,
  onReset,
  createPanResponderConfig,
}: TagManagementPageContentProps) {
  return (
    <>
      <TouchableOpacity style={styles.resetRow} onPress={onReset}>
        <Ionicons name="refresh" size={18} color="#6A89CC" />
        <Text style={styles.resetText}>恢复初始预制标签</Text>
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>当前预制标签</Text>
        <Text style={styles.sectionSubtitle}>这组标签会出现在快速选择区域</Text>
      </View>
      <Text style={styles.hint}>
        {tags.length} / {MAX_TAGS} 个
      </Text>

      <View style={[styles.tagsContainer, { height: containerHeight }]}>
        <TagManagementTagList
          tags={tags}
          dragState={dragState}
          dragTranslationY={dragTranslationY}
          onDelete={onDelete}
          createPanResponderConfig={createPanResponderConfig}
        />
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={[styles.addInput, atLimit && styles.addInputDisabled]}
          value={inputValue}
          onChangeText={onInputChange}
          placeholder={atLimit ? `最多 ${MAX_TAGS} 个预制标签` : '输入新预制标签'}
          placeholderTextColor="#A3A3A3"
          editable={!atLimit}
          returnKeyType="done"
          onSubmitEditing={onAdd}
        />
        <TouchableOpacity
          style={[styles.addButton, atLimit && styles.addButtonDisabled]}
          onPress={onAdd}
          disabled={atLimit}
        >
          <Text style={[styles.addButtonText, atLimit && styles.addButtonTextDisabled]}>添加</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
