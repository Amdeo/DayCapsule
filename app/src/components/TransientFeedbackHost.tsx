import React, { useEffect } from 'react';
import { AccessibilityInfo, Dimensions, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransientFeedbackStore } from '@/src/store/transientFeedbackStore';

const HIDE_DELAY_MS = 1400;
const HORIZONTAL_MARGIN = 16;
const VERTICAL_GAP = 12;
const TOAST_WIDTH = 120;
const TOAST_HEIGHT = 44;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function TransientFeedbackHost() {
  const insets = useSafeAreaInsets();
  const window = Dimensions.get('window');
  const currentMessage = useTransientFeedbackStore((state) => state.currentMessage);
  const anchorRect = useTransientFeedbackStore((state) => state.anchorRect);
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

  const anchoredLeft = anchorRect
    ? clamp(
        anchorRect.x + anchorRect.width / 2 - TOAST_WIDTH / 2,
        HORIZONTAL_MARGIN,
        window.width - HORIZONTAL_MARGIN - TOAST_WIDTH,
      )
    : undefined;

  const anchoredTop =
    anchorRect && anchorRect.y - VERTICAL_GAP - TOAST_HEIGHT >= insets.top + HORIZONTAL_MARGIN
      ? anchorRect.y - VERTICAL_GAP - TOAST_HEIGHT
      : anchorRect
        ? anchorRect.y + anchorRect.height + VERTICAL_GAP
        : undefined;

  return (
    <View
      className="absolute items-center"
      pointerEvents="none"
      testID="transient-feedback-host"
      style={
        anchorRect
          ? {
              left: anchoredLeft,
              top: anchoredTop,
              width: TOAST_WIDTH,
            }
          : {
              bottom: Math.max(insets.bottom, HORIZONTAL_MARGIN) + 20,
              left: HORIZONTAL_MARGIN,
              right: HORIZONTAL_MARGIN,
            }
      }
    >
      <View className="rounded-[14px] bg-neutral-900/90 px-[14px] py-[10px]">
        <Text className="text-sm font-semibold text-white">{currentMessage}</Text>
      </View>
    </View>
  );
}
