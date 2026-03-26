import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Image, Modal } from 'react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const Reanimated = require('react-native-reanimated/mock');

  // Reanimated 自带 mock 的 useSharedValue 在重渲染时不会保持引用稳定，导致
  // useImageViewerController 的 isMountedRef 在 effect cleanup 中被错误置为 false，
  // 从而让关闭回调链路无法在 Jest 中闭环。这里用基于 useRef 的实现保证稳定性。
  const useSharedValue = (init: any) => {
    const ref = React.useRef<any>(null);
    if (ref.current == null) {
      ref.current = { value: init };
    }
    return ref.current;
  };

  Reanimated.default.call = () => {};
  return { ...Reanimated, useSharedValue };
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

// 重要：确保被测模块在环境 mock 之后加载，避免 controller 走到未 mock 的 reanimated 行为。
const { ImageViewer } = require('../../ImageViewer');

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

  it('removes the viewer shell after close is requested and visible becomes false', async () => {
    const onClose = jest.fn();
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(
        <ImageViewer
          visible
          imageUri='file:///image-a.jpg'
          onClose={onClose}
        />
      );
    });

    // 确保真实 controller 已进入 open 主路径，再触发关闭请求。
    findOpenPhaseImageByUri(tree, 'file:///image-a.jpg');

    await act(async () => {
      const modal = tree.root.findByType(Modal);
      modal.props.onRequestClose();
    });

    // 关闭请求触发后，open 分支主图应从树上移除（证明走到了真实 controller 的关闭路径）。
    expect(() => findOpenPhaseImageByUri(tree, 'file:///image-a.jpg')).toThrow();

    expect(onClose).toHaveBeenCalledTimes(1);

    await act(async () => {
      tree.update(
        <ImageViewer
          visible={false}
          imageUri='file:///image-a.jpg'
          onClose={onClose}
        />
      );
    });

    const modalAfterClose = tree.root.findByType(Modal);
    expect(modalAfterClose.props.visible).toBe(false);
    expect(tree.root.findAllByProps({ testID: 'image-viewer-root' })).toHaveLength(0);
  });
});
