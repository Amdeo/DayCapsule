import React from 'react';
import { Text, View } from 'react-native';

interface TimelineSectionHeaderProps {
  title: string;
  timestamp: number;
}

const TIMELINE_SECTION_HEADER_HEIGHT = 48;

const TIMELINE_SECTION_HEADER_STYLE = {
  height: TIMELINE_SECTION_HEADER_HEIGHT,
};

export function TimelineSectionHeader({
  title,
  timestamp,
}: TimelineSectionHeaderProps) {
  return (
    <View
      testID="timeline-section-header"
      className="relative h-12 flex-row items-center bg-home-background pl-16"
      style={TIMELINE_SECTION_HEADER_STYLE}
      accessibilityHint={String(timestamp)}
    >
      <View className="absolute left-10 top-0 z-10 h-6 w-0.5 bg-timeline-line" />
      <View className="absolute left-[33px] top-4 z-20 h-4 w-4 rounded-full bg-timeline-dot shadow-sm" />
      <View className="absolute left-10 top-6 z-10 h-6 w-0.5 bg-timeline-line" />
      <Text className="text-lg font-semibold text-copy-primary">{title}</Text>
    </View>
  );
}
