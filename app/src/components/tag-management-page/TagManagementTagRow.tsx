import React from 'react';
import {
  type GestureResponderHandlers,
  TouchableOpacity,
  View,
  Text,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tagManagementPageStyles as styles } from './TagManagementPage.styles';
import { ROW_HEIGHT } from './tagManagementConfig';

interface TagManagementTagRowProps {
  tag: string;
  index: number;
  shiftedTop: number;
  isActive: boolean;
  dragTranslationY: Animated.Value;
  panHandlers: GestureResponderHandlers;
  onDelete: (tag: string) => void;
}

export function TagManagementTagRow({
  tag,
  index,
  shiftedTop,
  isActive,
  dragTranslationY,
  panHandlers,
  onDelete,
}: TagManagementTagRowProps) {
  const rowStyle = isActive
    ? [
        styles.positionedRow,
        styles.activeRow,
        { top: index * ROW_HEIGHT, transform: [{ translateY: dragTranslationY }] },
      ]
    : [styles.positionedRow, { top: shiftedTop }];

  return (
    <Animated.View key={tag} style={rowStyle}>
      <View style={[styles.tagRow, isActive && styles.tagRowActive]}>
        <View style={styles.tagLeft}>
          <View
            style={styles.dragHandle}
            testID={`preset-tag-drag-handle-${index}`}
            {...panHandlers}
          >
            <Ionicons name="reorder-three-outline" size={18} color="#9AA4B2" />
          </View>
          <Text style={styles.tagName}>#{tag}</Text>
        </View>
        <TouchableOpacity
          testID={`preset-tag-delete-${index}`}
          onPress={() => onDelete(tag)}
          hitSlop={8}
        >
          <Ionicons name="close-circle" size={20} color="#E57373" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
