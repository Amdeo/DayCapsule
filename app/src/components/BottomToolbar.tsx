import React from 'react';
import { View, TouchableOpacity } from 'react-native';
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
          <TouchableOpacity
            key={type}
            testID={`bottom-toolbar-button-${type}`}
            style={styles.button}
            onPress={() => onPress(type)}
            activeOpacity={0.7}
          >
            <Ionicons name={icon} size={24} color="#333" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
