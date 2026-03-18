import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { PanResponder, Text } from 'react-native';
import * as Reanimated from 'react-native-reanimated';

import { FABMenu } from '../FABMenu';

jest.mock('@/src/store/settingsStore', () => ({
  useSettingsStore: () => ({
    lastAddType: 'text',
    setLastAddType: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('@/src/services/photoService', () => ({
  PhotoService: {
    takePhoto: jest.fn(),
    pickPhotoFromLibrary: jest.fn(),
  },
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

    const responderView = tree!.root.findAll(
      (node) =>
        typeof node.props.onResponderGrant === 'function' &&
        typeof node.props.onResponderRelease === 'function' &&
        Array.isArray(node.props.style) &&
        node.props.style.some((style: { width?: number; height?: number }) => style?.width === 56 && style?.height === 56)
    )[0];

    act(() => {
      responderView.props.onResponderGrant();
      responderView.props.onResponderRelease({}, { dx: 0, dy: 0 });
    });

    expect(onRevealRequest).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();

    panResponderCreateSpy.mockRestore();
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
});
