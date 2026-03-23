import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TOOLBAR_BUTTONS } from './bottom-toolbar/buttons';

interface BottomToolbarProps {
  onPress: (type: 'text' | 'photo' | 'voice') => void;
}

export function BottomToolbar({ onPress }: BottomToolbarProps) {
  return (
    <View
      testID="bottom-toolbar-root"
      className="absolute bottom-[30px] left-0 right-0 items-center justify-center"
    >
      <View className="flex-row items-center gap-6 rounded-full bg-white px-5 py-3 shadow-lg shadow-black/10">
        {TOOLBAR_BUTTONS.map(({ type, icon }) => (
          <TouchableOpacity
            key={type}
            testID={`bottom-toolbar-button-${type}`}
            className="h-12 w-12 items-center justify-center rounded-full bg-[#F5F5F5]"
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
