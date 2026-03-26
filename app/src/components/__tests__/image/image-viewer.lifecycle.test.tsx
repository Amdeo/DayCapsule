import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Image, Modal } from 'react-native';

jest.mock('../../image-viewer/useImageViewerController', () => ({
  useImageViewerController: jest.fn(),
}));

import { ImageViewer } from '../../ImageViewer';
import { useImageViewerController } from '../../image-viewer/useImageViewerController';

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

  return {
    GestureDetector: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    GestureHandlerRootView: (
      { children, ...rest }: { children: React.ReactNode; testID?: string; style?: any },
    ) => <View {...rest}>{children}</View>,
  };
});

type ImageViewerControllerState = ReturnType<typeof useImageViewerController>;
const useImageViewerControllerMock = useImageViewerController as jest.MockedFunction<
  typeof useImageViewerController
>;

const buildControllerState = (
  overrides?: Partial<ImageViewerControllerState>,
): ImageViewerControllerState => ({
  phase: 'idle',
  showActionSheet: false,
  backdropAnimatedStyle: {},
  heroAnimatedStyle: {},
  imageAnimatedStyle: {},
  composedGesture: {},
  handleRequestClose: jest.fn(),
  closeActionSheet: jest.fn(),
  handleSaveToAlbum: jest.fn(),
  handleShare: jest.fn(),
  ...overrides,
});

const resetControllerState = (overrides?: Partial<ImageViewerControllerState>) => {
  useImageViewerControllerMock.mockReturnValue(buildControllerState(overrides));
};

const findCurrentImage = (tree: renderer.ReactTestRenderer, expectedUri: string) => {
  const images = tree.root.findAllByType(Image);
  const candidates = images.filter((image) => image.props?.source?.uri === expectedUri);
  expect(candidates).toHaveLength(1);
  return candidates[0];
};

describe('ImageViewer lifecycle', () => {
  beforeEach(() => {
    resetControllerState();
  });

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

    const modal = tree.root.findByType(Modal);
    expect(modal.props.visible).toBe(false);
    expect(tree.root.findAllByProps({ testID: 'image-viewer-root' })).toHaveLength(0);
  });

  it('renders the viewer shell and current image when visible is true', () => {
    resetControllerState({ phase: 'open' });

    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <ImageViewer
          visible
          imageUri='file:///image-a.jpg'
          onClose={jest.fn()}
        />
      );
    });

    const modal = tree.root.findByType(Modal);
    const image = findCurrentImage(tree, 'file:///image-a.jpg');
    expect(modal.props.visible).toBe(true);
    expect(tree.root.findByProps({ testID: 'image-viewer-root' })).toBeTruthy();
    expect(image.props.source).toEqual({ uri: 'file:///image-a.jpg' });
  });

  it('updates the rendered image when imageUri changes on rerender', () => {
    resetControllerState({ phase: 'open' });

    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <ImageViewer
          visible
          imageUri='file:///image-a.jpg'
          onClose={jest.fn()}
        />
      );
    });

    act(() => {
      tree.update(
        <ImageViewer
          visible
          imageUri='file:///image-b.jpg'
          onClose={jest.fn()}
        />
      );
    });

    const updated = findCurrentImage(tree, 'file:///image-b.jpg');
    expect(updated.props.source).toEqual({ uri: 'file:///image-b.jpg' });
  });

  it('removes the viewer shell after close is requested and visible becomes false', () => {
    const onClose = jest.fn();
    resetControllerState({ phase: 'open', handleRequestClose: onClose });

    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <ImageViewer
          visible
          imageUri='file:///image-a.jpg'
          onClose={onClose}
        />
      );
    });

    const modal = tree.root.findByType(Modal);
    act(() => {
      modal.props.onRequestClose();
    });

    act(() => {
      tree.update(
        <ImageViewer
          visible={false}
          imageUri='file:///image-a.jpg'
          onClose={onClose}
        />
      );
    });

    const hiddenModal = tree.root.findByType(Modal);
    expect(hiddenModal.props.visible).toBe(false);
    expect(tree.root.findAllByProps({ testID: 'image-viewer-root' })).toHaveLength(0);
  });
});
