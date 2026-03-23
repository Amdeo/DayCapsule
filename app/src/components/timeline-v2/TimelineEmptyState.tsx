import React from 'react';
import { Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

export function TimelineEmptyState() {
  return (
    <Animated.View
      entering={FadeIn.duration(300).delay(200)}
      testID="timeline-empty-state"
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        paddingHorizontal: 24,
      }}
    >
      <Animated.View entering={FadeIn.delay(400).springify()}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>📭</Text>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(600)}>
        <Text style={{ fontSize: 16, color: '#A3A3A3', textAlign: 'center' }}>
          还没有记忆
        </Text>
        <Text style={{ fontSize: 14, color: '#D1D1D1', textAlign: 'center', marginTop: 8 }}>
          点击右下角 + 按钮开始记录
        </Text>
      </Animated.View>
    </Animated.View>
  );
}
