import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tagsPageStyles as styles } from './TagsPage.styles';
import { TagStatItem } from './useTagsPageController';

interface TagsPageContentProps {
  isEmpty: boolean;
  tagStats: TagStatItem[];
  onClose: () => void;
}

export function TagsPageContent({
  isEmpty,
  tagStats,
  onClose,
}: TagsPageContentProps) {
  if (isEmpty) {
    return (
      <View testID="tags-page-root" style={styles.empty}>
        <Text style={styles.emptyIcon}>🏷️</Text>
        <Text testID="tags-page-empty" style={styles.emptyText}>还没有标签</Text>
        <Text style={styles.emptyHint}>在添加文字记录时可以添加标签</Text>
      </View>
    );
  }

  return (
    <View testID="tags-page-root">
      <Text style={styles.hint}>共 {tagStats.length} 个标签</Text>
      {tagStats.map(({ tag, count }) => (
        <TouchableOpacity
          key={tag}
          testID="tags-page-row"
          style={styles.tagRow}
          activeOpacity={0.7}
          onPress={onClose}
        >
          <View style={styles.tagLeft}>
            <View style={styles.tagDot} />
            <Text style={styles.tagName}>#{tag}</Text>
          </View>
          <View style={styles.tagRight}>
            <Text style={styles.tagCount}>{count} 条</Text>
            <Ionicons name="chevron-forward" size={16} color="#D1D1D1" />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}
