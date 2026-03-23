import React from 'react';
import { Pressable, Text } from 'react-native';
import { textEntryDetailPageStyles as styles } from './TextEntryDetailPage.styles';

interface TextEntryDetailEditButtonProps {
  onPress: () => void;
}

export function TextEntryDetailEditButton({
  onPress,
}: TextEntryDetailEditButtonProps) {
  return (
    <Pressable
      testID="text-entry-detail-edit-button"
      onPress={onPress}
      style={styles.editButton}
    >
      <Text style={styles.editButtonText}>编辑</Text>
    </Pressable>
  );
}
