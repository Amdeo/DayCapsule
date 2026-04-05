import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { ScaleDecorator } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import { tagManagementPageStyles as styles } from './TagManagementPage.styles';

interface TagManagementTagRowProps {
  tag: string;
  index: number;
  isActive: boolean;
  drag: () => void;
  onDelete: (tag: string) => void;
}

export function TagManagementTagRow({
  tag,
  index,
  isActive,
  drag,
  onDelete,
}: TagManagementTagRowProps) {
  return (
    <ScaleDecorator>
      <View style={[styles.tagRow, isActive && styles.tagRowActive]}>
        <View style={styles.tagLeft}>
          <Pressable
            style={styles.dragHandle}
            testID={`preset-tag-drag-handle-${index}`}
            onLongPress={drag}
            hitSlop={8}
          >
            <Ionicons name="reorder-three-outline" size={20} color="#C7C7CC" />
          </Pressable>
          <Text style={styles.tagName}>#{tag}</Text>
        </View>
        <Pressable
          testID={`preset-tag-delete-${index}`}
          onPress={() => onDelete(tag)}
          hitSlop={8}
        >
          <View style={styles.deleteButton}>
            <Text style={styles.deleteButtonText}>−</Text>
          </View>
        </Pressable>
      </View>
    </ScaleDecorator>
  );
}
