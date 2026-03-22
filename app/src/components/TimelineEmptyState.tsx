import React from 'react';
import { Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

export function TimelineEmptyState() {
  return (
    <Animated.View
      testID="timeline-empty-state"
      entering={FadeIn.duration(300).delay(200)}
      className="flex-1 items-center justify-center px-6 py-20"
    >
      <Animated.View entering={FadeIn.delay(400).springify()}>
        <Text className="mb-4 text-5xl">📭</Text>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(600)} className="items-center">
        <Text className="text-base text-copy-muted">还没有记忆</Text>
        <Text className="mt-2 text-sm text-copy-subtle">点击右下角 + 按钮开始记录</Text>
      </Animated.View>
    </Animated.View>
  );
}
