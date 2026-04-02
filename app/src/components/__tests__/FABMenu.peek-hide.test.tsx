import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { PanResponder, Text } from 'react-native';
import * as Reanimated from 'react-native-reanimated';
import { render } from '@testing-library/react-native';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';

import { FABMenu } from '../FABMenu';

const mockSetLastAddType = jest.fn().mockResolvedValue(undefined);
const mockTakePhoto = jest.fn();
const mockPickPhotoFromLibrary = jest.fn();
let mockLastAddType: 'text' | 'photo' | 'camera' | 'voice' | null = 'text';

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: () => ({
    lastAddType: mockLastAddType,
    setLastAddType: mockSetLastAddType,
  }),
}));

jest.mock('@/src/services/photoService', () => ({
  PhotoService: {
    takePhoto: (...args: unknown[]) => mockTakePhoto(...args),
    pickPhotoFromLibrary: (...args: unknown[]) => mockPickPhotoFromLibrary(...args),
  },
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

describe('FABMenu peek-hide', () => {
  beforeAll(() => {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent !== 'function') {
      Object.defineProperty(window, 'dispatchEvent', {
        configurable: true,
        value: jest.fn(),
      });
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockLastAddType = 'text';
    mockTakePhoto.mockResolvedValue(null);
    mockPickPhotoFromLibrary.mockResolvedValue([]);
  });

  function findMainResponderView(tree: renderer.ReactTestRenderer) {
    return tree.root.findAll(
      (node) =>
        typeof node.props.onResponderGrant === 'function' &&
        typeof node.props.onResponderRelease === 'function' &&
        Array.isArray(node.props.style) &&
        node.props.style.some((style: { width?: number; height?: number }) => style?.width === 56 && style?.height === 56)
    )[0];
  }

  it('animates the FAB container down to the peek position when hidden', () => {
    const onSelect = jest.fn();
    const withTimingSpy = jest.spyOn(Reanimated, 'withTiming');
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <FABMenu onSelect={onSelect} shouldHide />
      );
    });

    expect(tree).toBeDefined();
    expect(withTimingSpy).toHaveBeenCalledWith(
      78,
      expect.objectContaining({ duration: 200 })
    );
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('requests reveal on tap when hidden instead of triggering the remembered action', () => {
    const onSelect = jest.fn();
    const onRevealRequest = jest.fn();
    const panResponderCreateSpy = jest
      .spyOn(PanResponder, 'create')
      .mockImplementation((config) => ({
        panHandlers: {
          onResponderGrant: config.onPanResponderGrant,
          onResponderMove: config.onPanResponderMove,
          onResponderRelease: config.onPanResponderRelease,
          onResponderTerminate: config.onPanResponderTerminate,
        },
      }) as any);

    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <FABMenu onSelect={onSelect} shouldHide onRevealRequest={onRevealRequest} />
      );
    });

    const responderView = findMainResponderView(tree!);

    act(() => {
      responderView.props.onResponderGrant();
      responderView.props.onResponderRelease({}, { dx: 0, dy: 0 });
    });

    expect(onRevealRequest).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();

    panResponderCreateSpy.mockRestore();
  });

  it('shows the onboarding tip bubble when there is no remembered add type', () => {
    mockLastAddType = null;

    const { getByText } = render(<FABMenu onSelect={jest.fn()} />);

    expect(getByText('长按选择记录类型')).toBeTruthy();
  });

  it('triggers the remembered text action on tap when visible', async () => {
    const onSelect = jest.fn();
    const panResponderCreateSpy = jest
      .spyOn(PanResponder, 'create')
      .mockImplementation((config) => ({
        panHandlers: {
          onResponderGrant: config.onPanResponderGrant,
          onResponderMove: config.onPanResponderMove,
          onResponderRelease: config.onPanResponderRelease,
          onResponderTerminate: config.onPanResponderTerminate,
        },
      }) as any);

    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<FABMenu onSelect={onSelect} />);
    });

    const responderView = findMainResponderView(tree!);

    await act(async () => {
      responderView.props.onResponderGrant();
      responderView.props.onResponderRelease({}, { dx: 0, dy: 0 });
    });

    expect(mockSetLastAddType).toHaveBeenCalledWith('text');
    expect(onSelect).toHaveBeenCalledWith('text');

    panResponderCreateSpy.mockRestore();
  });

  it('triggers the remembered photo action on tap when visible', async () => {
    mockLastAddType = 'photo';
    mockPickPhotoFromLibrary.mockResolvedValueOnce([{ uri: 'file:///photo-1.jpg' }]);
    const onSelect = jest.fn();
    const panResponderCreateSpy = jest
      .spyOn(PanResponder, 'create')
      .mockImplementation((config) => ({
        panHandlers: {
          onResponderGrant: config.onPanResponderGrant,
          onResponderMove: config.onPanResponderMove,
          onResponderRelease: config.onPanResponderRelease,
          onResponderTerminate: config.onPanResponderTerminate,
        },
      }) as any);

    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<FABMenu onSelect={onSelect} />);
    });

    const responderView = findMainResponderView(tree!);

    await act(async () => {
      responderView.props.onResponderGrant();
      responderView.props.onResponderRelease({}, { dx: 0, dy: 0 });
    });

    expect(mockSetLastAddType).toHaveBeenCalledWith('photo');
    expect(mockPickPhotoFromLibrary).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('photo', [{ uri: 'file:///photo-1.jpg' }]);

    panResponderCreateSpy.mockRestore();
  });

  it('shows branded feedback when the remembered camera action fails', async () => {
    mockLastAddType = 'camera';
    mockTakePhoto.mockRejectedValueOnce(new Error('相机错误，请检查相机权限'));
    const onSelect = jest.fn();
    const panResponderCreateSpy = jest
      .spyOn(PanResponder, 'create')
      .mockImplementation((config) => ({
        panHandlers: {
          onResponderGrant: config.onPanResponderGrant,
          onResponderMove: config.onPanResponderMove,
          onResponderRelease: config.onPanResponderRelease,
          onResponderTerminate: config.onPanResponderTerminate,
        },
      }) as any);

    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<FABMenu onSelect={onSelect} />);
    });

    const responderView = findMainResponderView(tree!);

    await act(async () => {
      responderView.props.onResponderGrant();
      responderView.props.onResponderRelease({}, { dx: 0, dy: 0 });
    });

    expect(showErrorFeedback).toHaveBeenCalledWith({
      title: '拍照失败',
      message: '相机错误，请检查相机权限',
      actions: [{ label: '知道了', role: 'primary' }],
    });
    expect(onSelect).not.toHaveBeenCalled();

    panResponderCreateSpy.mockRestore();
  });

  it('shows branded feedback when the remembered photo action fails', async () => {
    mockLastAddType = 'photo';
    mockPickPhotoFromLibrary.mockRejectedValueOnce(new Error('无效的文件格式'));
    const onSelect = jest.fn();
    const panResponderCreateSpy = jest
      .spyOn(PanResponder, 'create')
      .mockImplementation((config) => ({
        panHandlers: {
          onResponderGrant: config.onPanResponderGrant,
          onResponderMove: config.onPanResponderMove,
          onResponderRelease: config.onPanResponderRelease,
          onResponderTerminate: config.onPanResponderTerminate,
        },
      }) as any);

    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<FABMenu onSelect={onSelect} />);
    });

    const responderView = findMainResponderView(tree!);

    await act(async () => {
      responderView.props.onResponderGrant();
      responderView.props.onResponderRelease({}, { dx: 0, dy: 0 });
    });

    expect(showErrorFeedback).toHaveBeenCalledWith({
      title: '选取失败',
      message: '无效的文件格式',
      actions: [{ label: '知道了', role: 'primary' }],
    });
    expect(onSelect).not.toHaveBeenCalled();

    panResponderCreateSpy.mockRestore();
  });

  it('shows the same branded camera failure feedback when the fan menu camera option fails', async () => {
    jest.useFakeTimers();
    mockTakePhoto.mockRejectedValueOnce(new Error('相机错误，请检查相机权限'));
    const onSelect = jest.fn();
    const panResponderCreateSpy = jest
      .spyOn(PanResponder, 'create')
      .mockImplementation((config) => ({
        panHandlers: {
          onResponderGrant: config.onPanResponderGrant,
          onResponderMove: config.onPanResponderMove,
          onResponderRelease: config.onPanResponderRelease,
          onResponderTerminate: config.onPanResponderTerminate,
        },
      }) as any);

    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<FABMenu onSelect={onSelect} />);
    });

    const responderView = findMainResponderView(tree!);

    await act(async () => {
      responderView.props.onResponderGrant();
      jest.advanceTimersByTime(300);
      responderView.props.onResponderRelease({}, { dx: 30, dy: -90 });
      jest.advanceTimersByTime(250);
    });

    expect(showErrorFeedback).toHaveBeenCalledWith({
      title: '拍照失败',
      message: '相机错误，请检查相机权限',
      actions: [{ label: '知道了', role: 'primary' }],
    });
    expect(onSelect).not.toHaveBeenCalled();

    panResponderCreateSpy.mockRestore();
    jest.useRealTimers();
  });

  it('shows the same branded photo failure feedback when the fan menu photo option fails', async () => {
    jest.useFakeTimers();
    mockPickPhotoFromLibrary.mockRejectedValueOnce(new Error('无效的文件格式'));
    const onSelect = jest.fn();
    const panResponderCreateSpy = jest
      .spyOn(PanResponder, 'create')
      .mockImplementation((config) => ({
        panHandlers: {
          onResponderGrant: config.onPanResponderGrant,
          onResponderMove: config.onPanResponderMove,
          onResponderRelease: config.onPanResponderRelease,
          onResponderTerminate: config.onPanResponderTerminate,
        },
      }) as any);

    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<FABMenu onSelect={onSelect} />);
    });

    const responderView = findMainResponderView(tree!);

    await act(async () => {
      responderView.props.onResponderGrant();
      jest.advanceTimersByTime(300);
      responderView.props.onResponderRelease({}, { dx: -20, dy: -90 });
      jest.advanceTimersByTime(250);
    });

    expect(showErrorFeedback).toHaveBeenCalledWith({
      title: '选取失败',
      message: '无效的文件格式',
      actions: [{ label: '知道了', role: 'primary' }],
    });
    expect(onSelect).not.toHaveBeenCalled();

    panResponderCreateSpy.mockRestore();
    jest.useRealTimers();
  });

  it('does not render a label text below the main FAB button when a type is selected', () => {
    const onSelect = jest.fn();
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<FABMenu onSelect={onSelect} />);
    });

    const allTexts = tree!.root
      .findAllByType(Text)
      .map((n: any) => n.props.children);

    const textCount = allTexts.filter((t: unknown) => t === '文字').length;
    expect(textCount).toBe(1);
  });

  it('uses withTiming (not withSpring) to reveal the FAB when shouldHide becomes false', () => {
    const onSelect = jest.fn();
    const withTimingSpy = jest.spyOn(Reanimated, 'withTiming');
    const withSpringSpy = jest.spyOn(Reanimated, 'withSpring');

    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<FABMenu onSelect={onSelect} shouldHide />);
    });

    withTimingSpy.mockClear();
    withSpringSpy.mockClear();

    act(() => {
      tree!.update(<FABMenu onSelect={onSelect} shouldHide={false} />);
    });

    expect(withTimingSpy).toHaveBeenCalledWith(0, expect.objectContaining({ duration: 200 }));
    expect(withSpringSpy).not.toHaveBeenCalled();

    withTimingSpy.mockRestore();
    withSpringSpy.mockRestore();
  });

  it('keeps the main FAB shell at 56x56 after migration', () => {
    const { getByTestId } = render(<FABMenu onSelect={jest.fn()} />);

    expect(getByTestId('fab-main-button')).toHaveStyle({
      width: 56,
      height: 56,
      borderRadius: 28,
    });
  });
});
