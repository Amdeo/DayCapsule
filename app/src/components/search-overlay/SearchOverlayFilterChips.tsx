import React from 'react';
import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchOverlayStyles as styles } from './SearchOverlay.styles';
import type {
  SearchDateOption,
  SearchDateRange,
  SearchFilterType,
  SearchTypeFilter,
} from './searchOverlayOptions';

interface SearchOverlayTypeChipProps {
  option: SearchTypeFilter;
  active: boolean;
  onPress: (value: SearchFilterType) => void;
}

interface SearchOverlayDateChipProps {
  option: SearchDateOption;
  active: boolean;
  onPress: (value: SearchDateRange) => void;
}

interface SearchOverlayTagChipProps {
  tag: string;
  selected: boolean;
  common?: boolean;
  onPress: () => void;
}

function SelectedTagCheckmark() {
  return (
    <Ionicons
      name="checkmark"
      size={13}
      color="#FFFFFF"
      style={styles.tagChipCheckmark}
    />
  );
}

export function SearchOverlayTypeChip({
  option,
  active,
  onPress,
}: SearchOverlayTypeChipProps) {
  return (
    <Pressable
      style={[styles.typeChip, active && { backgroundColor: option.color }]}
      onPress={() => onPress(option.key)}
    >
      <Ionicons
        name={option.icon}
        size={15}
        color={active ? '#FFFFFF' : option.color}
      />
      <Text style={[styles.typeChipText, active && styles.activeText]}>
        {option.label}
      </Text>
    </Pressable>
  );
}

export function SearchOverlayDateChip({
  option,
  active,
  onPress,
}: SearchOverlayDateChipProps) {
  return (
    <Pressable
      style={[styles.dateChip, active && styles.dateChipActive]}
      onPress={() => onPress(option.key)}
    >
      <Text style={[styles.dateChipText, active && styles.activeText]}>
        {option.label}
      </Text>
    </Pressable>
  );
}

export function SearchOverlayTagChip({
  tag,
  selected,
  common,
  onPress,
}: SearchOverlayTagChipProps) {
  return (
    <Pressable
      style={[
        styles.tagChip,
        common && styles.tagChipCommon,
        selected && styles.tagChipActive,
      ]}
      onPress={onPress}
    >
      {selected ? <SelectedTagCheckmark /> : null}
      <Text
        style={[
          styles.tagChipText,
          common && styles.tagChipCommonText,
          selected && styles.activeText,
        ]}
      >
        #{tag}
      </Text>
    </Pressable>
  );
}
