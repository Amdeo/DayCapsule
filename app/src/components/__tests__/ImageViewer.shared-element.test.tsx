import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ImageViewer } from '../ImageViewer';

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('expo-media-library', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  saveToLibraryAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  const createGesture = () => ({
    numberOfTaps() {
      return this;
    },
    requireExternalGestureToFail() {
      return this;
    },
    onEnd() {
      return this;
    },
    onStart() {
      return this;
    },
    onUpdate() {
      return this;
    },
    onBegin() {
      return this;
    },
    onFinalize() {
      return this;
    },
    minDuration() {
      return this;
    },
  });

  return {
    Gesture: {
      Tap: createGesture,
      LongPress: createGesture,
      Pinch: createGesture,
      Pan: createGesture,
      Race: (...gestures: unknown[]) => gestures,
      Simultaneous: (...gestures: unknown[]) => gestures,
    },
    GestureDetector: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    GestureHandlerRootView: ({ children, style }: { children: React.ReactNode; style?: unknown }) => (
      <View style={style}>{children}</View>
    ),
  };
});

describe('ImageViewer shared element', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders image viewer shell when visible', () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <ImageViewer
          visible
          imageUri="file:///image.jpg"
          onClose={jest.fn()}
        />
      );
    });

    expect(() => tree!.root.findByProps({ testID: 'image-viewer-root' })).not.toThrow();
  });

  it('renders the viewer shell when originLayout is provided', () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <ImageViewer
          visible
          imageUri="file:///image.jpg"
          onClose={jest.fn()}
          originLayout={{ x: 12, y: 34, width: 120, height: 160 }}
        />
      );
    });

    expect(() => tree!.root.findByProps({ testID: 'image-viewer-root' })).not.toThrow();
  });
});
