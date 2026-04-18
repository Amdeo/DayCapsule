import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Dimensions, type LayoutChangeEvent, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransientFeedbackStore } from '@/src/store/transientFeedbackStore';

const HIDE_DELAY_MS = 1400;
const HORIZONTAL_MARGIN = 16;
const VERTICAL_GAP = 12;

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
  const [toastLayout, setToastLayout] = useState<{ width: number; height: number } | null>(null);

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

  useEffect(() => {
    setToastLayout(null);
  }, [anchorRect, currentMessage, sequence]);

  if (!currentMessage) {
    return null;
  }

  const handleBubbleLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    const { width, height } = nativeEvent.layout;
    setToastLayout((previousLayout) =>
      previousLayout?.width === width && previousLayout?.height === height
        ? previousLayout
        : { width, height },
    );
  };

  const anchoredStyle =
    anchorRect && toastLayout
      ? {
          left: clamp(
            anchorRect.x + anchorRect.width / 2 - toastLayout.width / 2,
            HORIZONTAL_MARGIN,
            Math.max(HORIZONTAL_MARGIN, window.width - HORIZONTAL_MARGIN - toastLayout.width),
          ),
          top:
            anchorRect.y - VERTICAL_GAP - toastLayout.height >= insets.top + HORIZONTAL_MARGIN
              ? anchorRect.y - VERTICAL_GAP - toastLayout.height
              : anchorRect.y + anchorRect.height + VERTICAL_GAP,
        }
      : anchorRect
        ? {
            left: HORIZONTAL_MARGIN,
            opacity: 0,
            top: insets.top + HORIZONTAL_MARGIN,
          }
        : null;

  return (
    <View
      className="absolute items-center"
      pointerEvents="none"
      testID="transient-feedback-host"
      style={
        anchoredStyle
          ? anchoredStyle
          : {
              bottom: Math.max(insets.bottom, HORIZONTAL_MARGIN) + 20,
              left: HORIZONTAL_MARGIN,
              right: HORIZONTAL_MARGIN,
            }
      }
    >
      <View
        className="rounded-[14px] bg-neutral-900/90 px-[14px] py-[10px]"
        onLayout={handleBubbleLayout}
        testID="transient-feedback-bubble"
      >
        <Text className="text-sm font-semibold text-white">{currentMessage}</Text>
      </View>
    </View>
  );
}
