import React from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TimelineScrollTopButtonProps {
  visible: boolean;
  opacity: Animated.Value;
  scale: Animated.Value;
  onPress: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
}

export function TimelineScrollTopButton({
  visible,
  opacity,
  scale,
  onPress,
  onPressIn,
  onPressOut,
}: TimelineScrollTopButtonProps) {
  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 80,
        right: 20,
        zIndex: 999,
        opacity,
        transform: [{ scale }],
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.8}
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Ionicons name="arrow-up" size={24} color="#6A89CC" />
      </TouchableOpacity>
    </Animated.View>
  );
}
