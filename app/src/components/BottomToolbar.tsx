import React from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TOOLBAR_BUTTONS } from './bottom-toolbar/buttons';
import { bottomToolbarStyles as styles } from './bottom-toolbar/styles';

interface BottomToolbarProps {
  onPress: (type: 'text' | 'photo' | 'voice') => void;
}

export function BottomToolbar({ onPress }: BottomToolbarProps) {
  return (
    <View testID="bottom-toolbar-root" style={styles.container}>
      <View style={styles.toolbar}>
        {TOOLBAR_BUTTONS.map(({ type, icon }) => (
          <Pressable
            key={type}
            testID={`bottom-toolbar-button-${type}`}
            style={styles.button}
            onPress={() => onPress(type)}
          >
            <Ionicons name={icon} size={24} color="#333" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
