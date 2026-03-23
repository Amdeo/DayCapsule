import React from 'react';
import { Text, View } from 'react-native';

interface TimelineSectionHeaderProps {
  title: string;
}

export const TimelineSectionHeader = React.memo(function TimelineSectionHeader({
  title,
}: TimelineSectionHeaderProps) {
  const timelineLeft = 40;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 64,
        height: 48,
        backgroundColor: '#FAF8F5',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: timelineLeft,
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
          left: timelineLeft - 7,
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
          left: timelineLeft,
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
