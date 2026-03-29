import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ImageViewerActionSheet } from '../../image-viewer/ImageViewerActionSheet';

describe('ImageViewerActionSheet', () => {
  const baseProps = {
    visible: true,
    bottomInset: 12,
    onClose: jest.fn(),
    onSaveToAlbum: jest.fn(),
    onShare: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when the action sheet is hidden', () => {
    const screen = render(<ImageViewerActionSheet {...baseProps} visible={false} />);

    expect(screen.queryByTestId('image-viewer-action-sheet')).toBeNull();
  });

  it('renders save, share and cancel actions when visible', () => {
    const screen = render(<ImageViewerActionSheet {...baseProps} />);

    expect(screen.getByTestId('image-viewer-action-sheet')).toBeTruthy();
    expect(screen.getByText('保存到相册')).toBeTruthy();
    expect(screen.getByText('分享')).toBeTruthy();
    expect(screen.getByText('取消')).toBeTruthy();
  });

  it('routes each action button to the corresponding callback', () => {
    const screen = render(<ImageViewerActionSheet {...baseProps} />);

    fireEvent.press(screen.getByText('保存到相册'));
    fireEvent.press(screen.getByText('分享'));
    fireEvent.press(screen.getByText('取消'));

    expect(baseProps.onSaveToAlbum).toHaveBeenCalledTimes(1);
    expect(baseProps.onShare).toHaveBeenCalledTimes(1);
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('routes overlay dismiss press to onClose', () => {
    const screen = render(<ImageViewerActionSheet {...baseProps} />);

    fireEvent.press(screen.getByTestId('image-viewer-action-sheet-overlay'));

    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });
});
