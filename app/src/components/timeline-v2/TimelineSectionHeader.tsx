import React from 'react';
import { Text, View } from 'react-native';
import {
  TIMELINE_CONTENT_PADDING_LEFT,
  TIMELINE_DOT_LEFT,
  TIMELINE_LEFT,
} from '@/src/components/timelineGeometry';

interface TimelineSectionHeaderProps {
  title: string;
  showTimelineDecorations?: boolean;
}

const cardContainerStyle = {
  paddingLeft: 16,
  paddingRight: 24,
  paddingTop: 16,
  paddingBottom: 4,
  backgroundColor: '#FAF8F5',
} as const;

const cardTitleStyle = {
  fontSize: 14,
  fontWeight: '600' as const,
  color: '#8B7355',
  letterSpacing: 0.5,
} as const;

export const TimelineSectionHeader = React.memo(function TimelineSectionHeader({
  title,
  showTimelineDecorations = true,
}: TimelineSectionHeaderProps) {
  if (!showTimelineDecorations) {
    return (
      <View style={cardContainerStyle}>
        <Text style={cardTitleStyle}>{title}</Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: TIMELINE_CONTENT_PADDING_LEFT,
        height: 48,
        backgroundColor: '#FAF8F5',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: TIMELINE_LEFT,
          top: 0,
          width: 2,
          height: 24,
          backgroundColor: '#E5E5E5',
          zIndex: 1,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: TIMELINE_DOT_LEFT,
          top: 16,
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: '#6A89CC',
          shadowColor: '#6A89CC',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.3,
          shadowRadius: 2,
          elevation: 2,
          zIndex: 10,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: TIMELINE_LEFT,
          top: 24,
          width: 2,
          height: 24,
          backgroundColor: '#E5E5E5',
          zIndex: 1,
        }}
      />
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#4A4A4A' }}>
        {title}
      </Text>
    </View>
  );
});
