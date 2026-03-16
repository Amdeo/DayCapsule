import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Modal } from 'react-native';
import * as Reanimated from 'react-native-reanimated';

import { ImageViewer } from '../ImageViewer';

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

  it('uses spring hero opening animation when originLayout is provided', () => {
    const withSpringSpy = jest.spyOn(Reanimated, 'withSpring');

    act(() => {
      renderer.create(
        <ImageViewer
          visible
          imageUri="file:///image.jpg"
          onClose={jest.fn()}
          originLayout={{ x: 12, y: 34, width: 120, height: 160 }}
        />
      );
    });

    expect(withSpringSpy).toHaveBeenCalledWith(
      0,
      expect.objectContaining({ damping: 28, stiffness: 300 })
    );
    expect(withSpringSpy).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ damping: 28, stiffness: 300 })
    );
  });

  it('routes Android back close through modal onRequestClose', () => {
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

    const modal = tree!.root.findByType(Modal);
    expect(typeof modal.props.onRequestClose).toBe('function');
  });
});
