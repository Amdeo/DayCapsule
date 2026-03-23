import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { filterBarStyles as styles } from './Timeline.v2.styles';

interface TimelineActiveFiltersBarProps {
  searchQuery: string;
  filterType: string;
  filterDateRange: string;
  selectedTags: string[];
  resultCount: number;
  onClearQuery: () => void;
  onClearType: () => void;
  onClearDate: () => void;
  onClearTag: (tag: string) => void;
  onClearAll: () => void;
  onOpenSearch: () => void;
}

const DATE_LABEL: Record<string, string> = {
  today: '今天',
  week: '本周',
  month: '本月',
};

const TYPE_LABEL: Record<string, string> = {
  text: '文字',
  photo: '照片',
  voice: '语音',
};

export function TimelineActiveFiltersBar({
  searchQuery,
  filterType,
  filterDateRange,
  selectedTags,
  resultCount,
  onClearQuery,
  onClearType,
  onClearDate,
  onClearTag,
  onClearAll,
  onOpenSearch,
}: TimelineActiveFiltersBarProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={styles.container}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <TouchableOpacity style={styles.resultBadge} onPress={onOpenSearch}>
          <Ionicons name="search" size={13} color="#6A89CC" />
          <Text style={styles.resultText}>{resultCount} 条</Text>
        </TouchableOpacity>

        {searchQuery.trim() ? (
          <View style={styles.chip}>
            <Text style={styles.chipText} numberOfLines={1}>
              "{searchQuery}"
            </Text>
            <TouchableOpacity onPress={onClearQuery} hitSlop={6}>
              <Ionicons name="close" size={13} color="#6A89CC" />
            </TouchableOpacity>
          </View>
        ) : null}

        {filterType !== 'all' ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{TYPE_LABEL[filterType] ?? filterType}</Text>
            <TouchableOpacity onPress={onClearType} hitSlop={6}>
              <Ionicons name="close" size={13} color="#6A89CC" />
            </TouchableOpacity>
          </View>
        ) : null}

        {filterDateRange !== 'all' ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>
              {DATE_LABEL[filterDateRange] ?? filterDateRange}
            </Text>
            <TouchableOpacity onPress={onClearDate} hitSlop={6}>
              <Ionicons name="close" size={13} color="#6A89CC" />
            </TouchableOpacity>
          </View>
        ) : null}

        {selectedTags.map((tag) => (
          <View key={tag} style={styles.chip}>
            <Text style={styles.chipText}>#{tag}</Text>
            <TouchableOpacity onPress={() => onClearTag(tag)} hitSlop={6}>
              <Ionicons name="close" size={13} color="#6A89CC" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.clearAll} onPress={onClearAll}>
        <Ionicons name="close-circle" size={18} color="#A3A3A3" />
      </TouchableOpacity>
    </Animated.View>
  );
}
