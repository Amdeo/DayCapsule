import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ImageViewer } from '../../ImageViewer';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  const createGesture = () => {
    const builder: Record<string, () => any> = {
      numberOfTaps: () => builder,
      minDuration: () => builder,
      requireExternalGestureToFail: () => builder,
      onEnd: () => builder,
      onStart: () => builder,
      onBegin: () => builder,
      onUpdate: () => builder,
      onFinalize: () => builder,
    };
    return builder;
  };

  const Gesture = {
    Tap: () => createGesture(),
    LongPress: () => createGesture(),
    Pinch: () => createGesture(),
    Pan: () => createGesture(),
    Race: () => createGesture(),
    Simultaneous: () => createGesture(),
  };

  return {
    Gesture,
    GestureDetector: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

describe('ImageViewer lifecycle', () => {
  it('does not render the viewer shell when visible is false', () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <ImageViewer
          visible={false}
          imageUri='file:///hidden-image.jpg'
          onClose={jest.fn()}
        />
      );
    });

    expect(() => tree.root.findByProps({ testID: 'image-viewer-root' })).toThrow();
  });
});
