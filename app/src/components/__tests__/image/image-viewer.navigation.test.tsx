import React from 'react';
import { Modal } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import renderer, { act } from 'react-test-renderer';
import { ImageViewer } from '../../ImageViewer';

const mockHandleRequestClose = jest.fn();
const mockCloseActionSheet = jest.fn();
const mockHandleSaveToAlbum = jest.fn();
const mockHandleShare = jest.fn();
let mockShowActionSheet = true;

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
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

jest.mock('../../image-viewer/useImageViewerController', () => ({
  useImageViewerController: () => ({
    phase: 'open',
    showActionSheet: mockShowActionSheet,
    backdropAnimatedStyle: {},
    heroAnimatedStyle: {},
    imageAnimatedStyle: {},
    composedGesture: {},
    handleRequestClose: mockHandleRequestClose,
    closeActionSheet: mockCloseActionSheet,
    handleSaveToAlbum: mockHandleSaveToAlbum,
    handleShare: mockHandleShare,
  }),
}));

describe('ImageViewer navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShowActionSheet = true;
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
    modal.props.onRequestClose();

    expect(mockHandleRequestClose).toHaveBeenCalledTimes(1);
  });

  it('wires action sheet actions for save, share and cancel', () => {
    const screen = render(
      <ImageViewer
        visible
        imageUri="file:///image.jpg"
        onClose={jest.fn()}
      />
    );

    fireEvent.press(screen.getByText('保存到相册'));
    fireEvent.press(screen.getByText('分享'));
    fireEvent.press(screen.getByText('取消'));

    expect(mockHandleSaveToAlbum).toHaveBeenCalledTimes(1);
    expect(mockHandleShare).toHaveBeenCalledTimes(1);
    expect(mockCloseActionSheet).toHaveBeenCalledTimes(1);
  });

  it('shows the action sheet when debugShowActionSheet is true even if the controller hides it', () => {
    mockShowActionSheet = false;

    const screen = render(
      <ImageViewer
        visible
        imageUri="file:///image.jpg"
        onClose={jest.fn()}
        debugShowActionSheet
      />
    );

    expect(screen.getByText('保存到相册')).toBeTruthy();
    expect(screen.getByText('分享')).toBeTruthy();
    expect(screen.getByText('取消')).toBeTruthy();
  });
});
