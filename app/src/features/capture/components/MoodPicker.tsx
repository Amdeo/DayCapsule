import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MD3Theme } from 'react-native-paper/lib/typescript/types';

interface MoodPickerProps {
  selectedMood?: string;
  onMoodChange: (mood: string) => void;
  testID?: string; // Add testID prop
}

const MOODS = [
  { id: 'happy', emoji: '😊', label: '开心' },
  { id: 'excited', emoji: '🤩', label: '兴奋' },
  { id: 'neutral', emoji: '😐', label: '平淡' },
  { id: 'sad', emoji: '😔', label: '难过' },
  { id: 'angry', emoji: '😠', label: '生气' },
];

const MoodPicker: React.FC<MoodPickerProps> = ({ selectedMood, onMoodChange, testID }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      {MOODS.map(mood => {
        const isSelected = selectedMood === mood.id;
        return (
          <TouchableOpacity
            key={mood.id}
            onPress={() => onMoodChange(mood.id)}
            style={[
              styles.moodItem,
              isSelected && styles.selectedItem,
            ]}
            testID={`${testID}-${mood.id}`} // Apply testID
          >
            <Text style={styles.emoji}>{mood.emoji}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const getStyles = (theme: MD3Theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  moodItem: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedItem: {
    backgroundColor: theme.colors.secondaryContainer,
    borderColor: theme.colors.primary,
  },
  emoji: {
    fontSize: 32,
  },
});

export default MoodPicker;
