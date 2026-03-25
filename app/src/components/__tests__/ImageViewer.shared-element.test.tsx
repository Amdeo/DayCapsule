import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Modal } from 'react-native';
import * as Reanimated from 'react-native-reanimated';

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

  it('renders action sheet shell when action sheet state is visible', () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <ImageViewer
          visible
          imageUri="file:///image.jpg"
          onClose={jest.fn()}
          debugShowActionSheet
        />
      );
    });

    expect(() => tree!.root.findByProps({ testID: 'image-viewer-action-sheet' })).not.toThrow();
  });

  it('opens image directly fullscreen without spring animation when originLayout is provided', () => {
    // Note: The opening animation was removed - images now open directly fullscreen
    // without spring/fly-in effects for better perceived performance
    const withTimingSpy = jest.spyOn(Reanimated, 'withTiming');

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

    // Opening now uses direct value assignment, not spring animation
    // Only closing fade uses withTiming
    expect(withTimingSpy).not.toHaveBeenCalledWith(
      1,
      expect.objectContaining({ duration: 250 })
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

  it('logs image uri when image viewer load fails', () => {
    const { logger } = require('@/src/utils/logger');
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <ImageViewer
          visible
          imageUri="http://101.43.120.134:8081/api/media/photo-1"
          onClose={jest.fn()}
        />
      );
    });

    const image = tree!.root.findAllByType('Image').at(-1);
    act(() => {
      image?.props.onError?.({ nativeEvent: { error: 'load failed' } });
    });

    expect(logger.warn).toHaveBeenCalledWith(
      '[ImageViewer] image load failed',
      expect.objectContaining({
        imageUri: 'http://101.43.120.134:8081/api/media/photo-1',
      }),
    );
  });
});
