import React from 'react';
import { View } from 'react-native';

export const Swipeable = jest.fn(({ children, renderRightActions }: any) => {
  return React.createElement(
    View,
    null,
    children,
    renderRightActions?.(
      { interpolate: () => 0 } as any,
      { interpolate: () => 0 } as any
    )
  );
});

// 添加 close 方法到原型
Object.defineProperty(Swipeable, 'prototype', {
  value: { close: jest.fn() },
  writable: false,
});

// Mock Gesture API for ImageViewer tests
const createGesture = () => ({
  numberOfTaps() { return this; },
  requireExternalGestureToFail() { return this; },
  onEnd() { return this; },
  onStart() { return this; },
  onUpdate() { return this; },
  onBegin() { return this; },
  onFinalize() { return this; },
  minDuration() { return this; },
});

export const Gesture = {
  Tap: createGesture,
  LongPress: createGesture,
  Pinch: createGesture,
  Pan: createGesture,
  Race: (...gestures: unknown[]) => gestures,
  Simultaneous: (...gestures: unknown[]) => gestures,
};

export const GestureDetector = ({ children }: { children: React.ReactNode }) =>
  React.createElement(View, null, children);

export const GestureHandlerRootView = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.ComponentProps<typeof View>['style'];
}) =>
  React.createElement(View, { style }, children);
