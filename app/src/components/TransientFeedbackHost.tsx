import React, { useEffect } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransientFeedbackStore } from '@/src/store/transientFeedbackStore';

const HIDE_DELAY_MS = 1400;

export function TransientFeedbackHost() {
  const insets = useSafeAreaInsets();
  const currentMessage = useTransientFeedbackStore((state) => state.currentMessage);
  const sequence = useTransientFeedbackStore((state) => state.sequence);
  const dismiss = useTransientFeedbackStore((state) => state.dismiss);

  useEffect(() => {
    if (!currentMessage) {
      return;
    }

    AccessibilityInfo.announceForAccessibility(currentMessage);

    const timeout = setTimeout(() => {
      dismiss(sequence);
    }, HIDE_DELAY_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [currentMessage, dismiss, sequence]);

  if (!currentMessage) {
    return null;
  }

  return (
    <View
      className="absolute left-4 right-4 items-center"
      pointerEvents="none"
      testID="transient-feedback-host"
      style={{
        bottom: Math.max(insets.bottom, 16) + 20,
      }}
    >
      <View className="rounded-[14px] bg-neutral-900/90 px-[14px] py-[10px]">
        <Text className="text-sm font-semibold text-white">{currentMessage}</Text>
      </View>
    </View>
  );
}
