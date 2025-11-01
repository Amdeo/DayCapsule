import React from 'react';
import {View, StyleSheet, TouchableOpacity} from 'react-native';
import {Text, useTheme} from 'react-native-paper';

export type Mood = 'happy' | 'neutral' | 'sad' | 'excited' | 'tired' | null;

interface MoodOption {
  value: Mood;
  emoji: string;
  label: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  {value: 'happy', emoji: '😊', label: '开心'},
  {value: 'excited', emoji: '🤩', label: '兴奋'},
  {value: 'neutral', emoji: '😐', label: '平静'},
  {value: 'tired', emoji: '😴', label: '疲惫'},
  {value: 'sad', emoji: '😢', label: '难过'},
];

interface MoodSelectorProps {
  selectedMood: Mood;
  onMoodChange: (mood: Mood) => void;
}

export const MoodSelector: React.FC<MoodSelectorProps> = ({selectedMood, onMoodChange}) => {
  const theme = useTheme();

  return (
    <View style={styles.container} testID="mood-selector">
      <Text variant="labelMedium" style={[styles.label, {color: theme.colors.onSurfaceVariant}]}>
        心情
      </Text>
      <View style={styles.moodsContainer}>
        {MOOD_OPTIONS.map(mood => {
          const isSelected = selectedMood === mood.value;
          return (
            <TouchableOpacity
              key={mood.value}
              style={[
                styles.moodButton,
                {
                  backgroundColor: isSelected
                    ? theme.colors.primaryContainer
                    : theme.colors.surfaceVariant,
                  borderColor: isSelected ? theme.colors.primary : 'transparent',
                },
              ]}
              onPress={() => onMoodChange(isSelected ? null : mood.value)}
              activeOpacity={0.7}
              testID={`mood-${mood.value}`}>
              <Text style={styles.emoji}>{mood.emoji}</Text>
              <Text
                variant="labelSmall"
                style={[
                  styles.moodLabel,
                  {
                    color: isSelected
                      ? theme.colors.onPrimaryContainer
                      : theme.colors.onSurfaceVariant,
                  },
                ]}
                testID={isSelected ? `mood-${mood.value}-selected` : undefined}>
                {mood.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  label: {
    marginBottom: 8,
    marginLeft: 4,
  },
  moodsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 2,
  },
  emoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 11,
  },
});
