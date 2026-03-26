import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Image, Modal } from 'react-native';

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

  // Generic chainable gesture stub: any property access or call returns itself.
  // This keeps lifecycle tests decoupled from the gesture DSL's specific method names.
  const createChainable = () => {
    const fn = () => proxy;
    const proxy: any = new Proxy(fn, {
      get: () => proxy,
      apply: () => proxy,
    });
    return proxy;
  };

  const Gesture = new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        if (prop === 'Race' || prop === 'Simultaneous') {
          return (..._gestures: any[]) => createChainable();
        }
        return () => createChainable();
      },
    },
  );

  return {
    Gesture,
    GestureDetector: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    GestureHandlerRootView: (
      { children, ...rest }: { children: React.ReactNode; testID?: string; style?: any },
    ) => <View {...rest}>{children}</View>,
  };
});

const findOpenPhaseImageByUri = (
  tree: renderer.ReactTestRenderer,
  expectedUri: string,
) => {
  const images = tree.root.findAllByType(Image);
  const candidates = images.filter(
    (image) => image.props?.source?.uri === expectedUri,
  );
  expect(candidates).toHaveLength(1);
  return candidates[0];
};

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
    expect(findOpenPhaseImageByUri(tree, 'file:///image-a.jpg').props.source).toEqual({
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

    expect(findOpenPhaseImageByUri(tree, 'file:///image-b.jpg').props.source).toEqual({
      uri: 'file:///image-b.jpg',
    });
  });
});
