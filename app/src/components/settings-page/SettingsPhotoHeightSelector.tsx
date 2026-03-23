import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PHOTO_HEIGHT_VALUES,
  type PhotoHeightPreset,
} from '@/src/store/settingsStore';
import {
  PHOTO_HEIGHT_LABELS,
  PHOTO_HEIGHT_OPTIONS,
  PHOTO_HEIGHT_PREVIEW_HEIGHTS,
} from './settingsPageOptions';
import { photoHeightSelectorStyles as styles } from './SettingsPage.styles';

interface SettingsPhotoHeightSelectorProps {
  value: PhotoHeightPreset;
  onChange: (preset: PhotoHeightPreset) => void;
}

export function SettingsPhotoHeightSelector({
  value,
  onChange,
}: SettingsPhotoHeightSelectorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Ionicons name="image-outline" size={20} color="#77C9D4" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>照片显示高度</Text>
          <Text style={styles.subtitle}>限制时间轴中照片卡片的最大高度</Text>
        </View>
      </View>
      <View style={styles.optionsRow}>
        {PHOTO_HEIGHT_OPTIONS.map((option) => {
          const isSelected = value === option;
          return (
            <Pressable
              key={option}
              style={[styles.optionCard, isSelected && styles.optionCardSelected]}
              onPress={() => onChange(option)}
            >
              <View
                style={[
                  styles.previewBlock,
                  { height: PHOTO_HEIGHT_PREVIEW_HEIGHTS[option] },
                  isSelected && styles.previewBlockSelected,
                ]}
              />
              <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                {PHOTO_HEIGHT_LABELS[option]}
              </Text>
              <Text style={[styles.optionValue, isSelected && styles.optionValueSelected]}>
                {PHOTO_HEIGHT_VALUES[option]}dp
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
