import type { ComponentProps } from 'react';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SettingsOption } from './settingsPageOptions';
import { segmentedSelectorStyles as styles } from './SettingsPage.styles';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface SettingsSegmentedSelectorProps<T extends string> {
  icon: IoniconName;
  title: string;
  subtitle: string;
  options: ReadonlyArray<SettingsOption<T>>;
  value: T;
  onChange: (value: T) => void;
}

export function SettingsSegmentedSelector<T extends string>({
  icon,
  title,
  subtitle,
  options,
  value,
  onChange,
}: SettingsSegmentedSelectorProps<T>) {
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Ionicons name={icon} size={20} color="#6A89CC" />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.segmentContainer}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            style={[styles.segment, value === option.value && styles.segmentActive]}
            onPress={() => onChange(option.value)}
          >
            <Text
              style={[
                styles.segmentText,
                value === option.value && styles.segmentTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
