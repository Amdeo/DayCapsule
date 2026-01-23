import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BottomToolbarProps {
  onPress: (type: 'text' | 'photo' | 'voice') => void;
}

const TOOLBAR_BUTTONS = [
  { type: 'text' as const, icon: 'text' as const },
  { type: 'photo' as const, icon: 'camera' as const },
  { type: 'voice' as const, icon: 'mic' as const },
];

export function BottomToolbar({ onPress }: BottomToolbarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        {TOOLBAR_BUTTONS.map(({ type, icon }) => (
          <TouchableOpacity
            key={type}
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

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    gap: 24,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
