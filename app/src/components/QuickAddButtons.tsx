import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface QuickAddButtonsProps {
  onPress: (type: 'text' | 'photo' | 'voice') => void;
}

const QUICK_ADD_OPTIONS = [
  { type: 'text' as const, icon: 'text' as const, label: '文字', color: '#A491D3' },
  { type: 'photo' as const, icon: 'camera' as const, label: '照片', color: '#77C9D4' },
  { type: 'voice' as const, icon: 'mic' as const, label: '语音', color: '#F5A623' },
];

export function QuickAddButtons({ onPress }: QuickAddButtonsProps) {
  return (
    <View style={styles.container}>
      {QUICK_ADD_OPTIONS.map(({ type, icon, label, color }) => (
        <TouchableOpacity
          key={type}
          style={styles.button}
          onPress={() => onPress(type)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: color }]}>
            <Ionicons name={icon} size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.label}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A4A4A',
  },
});
