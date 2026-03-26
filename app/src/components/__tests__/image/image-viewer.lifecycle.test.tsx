import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Modal } from 'react-native';

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

  const makeChainableGesture = () => {
    const chain: any = {};
    const returnSelf = () => chain;

    // Tap
    chain.numberOfTaps = returnSelf;
    chain.requireExternalGestureToFail = returnSelf;
    chain.onEnd = returnSelf;

    // LongPress
    chain.minDuration = returnSelf;
    chain.onStart = returnSelf;

    // Pinch
    chain.onUpdate = returnSelf;
    chain.onEnd = returnSelf;

    // Pan
    chain.onBegin = returnSelf;
    chain.onUpdate = returnSelf;
    chain.onEnd = returnSelf;
    chain.onFinalize = returnSelf;

    return chain;
  };

  const Gesture = {
    Tap: () => makeChainableGesture(),
    LongPress: () => makeChainableGesture(),
    Pinch: () => makeChainableGesture(),
    Pan: () => makeChainableGesture(),
    Race: (..._gestures: any[]) => ({}),
    Simultaneous: (..._gestures: any[]) => ({}),
  };

  return {
    Gesture,
    GestureDetector: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    GestureHandlerRootView: (
      { children, ...rest }: { children: React.ReactNode; testID?: string; style?: any },
    ) => <View {...rest}>{children}</View>,
  };
});

describe('ImageViewer lifecycle', () => {
  it('does not render the viewer shell when visible is false', async () => {
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(
        <ImageViewer
          visible={false}
          imageUri='file:///hidden-image.jpg'
          onClose={jest.fn()}
        />
      );
    });

    const modal = tree.root.findByType(Modal);
    expect(modal.props.visible).toBe(false);
    expect(tree.root.findAllByProps({ testID: 'image-viewer-root' })).toHaveLength(0);
  });

  it('renders the viewer shell and current image when visible is true', async () => {
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(
        <ImageViewer
          visible
          imageUri='file:///image-a.jpg'
          onClose={jest.fn()}
        />
      );
    });

    const modal = tree.root.findByType(Modal);
    expect(modal.props.visible).toBe(true);
    expect(tree.root.findByProps({ testID: 'image-viewer-root' })).toBeTruthy();
    expect(tree.root.findByProps({ testID: 'image-viewer-image' }).props.source).toEqual({
      uri: 'file:///image-a.jpg',
    });
  });

  it('updates the rendered image when imageUri changes on rerender', async () => {
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(
        <ImageViewer
          visible
          imageUri='file:///image-a.jpg'
          onClose={jest.fn()}
        />
      );
    });

    await act(async () => {
      tree.update(
        <ImageViewer
          visible
          imageUri='file:///image-b.jpg'
          onClose={jest.fn()}
        />
      );
    });

    expect(tree.root.findByProps({ testID: 'image-viewer-image' }).props.source).toEqual({
      uri: 'file:///image-b.jpg',
    });
  });
});
