import React from 'react';
import renderer, { act } from 'react-test-renderer';

// Mock useSafeAreaInsets，模拟 Android 状态栏高度 28dp
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 28, bottom: 0, left: 0, right: 0 }),
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

const { SearchBar } = require('../SearchBar');

describe('SearchBar 安全区适配', () => {
  beforeAll(() => {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent !== 'function') {
      Object.defineProperty(window, 'dispatchEvent', {
        configurable: true,
        value: jest.fn(),
      });
    }
  });

  it('容器的 paddingTop 应等于 insets.top（28dp）', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SearchBar />);
    });
    const json = tree!.toJSON() as any;
    const containerStyle = Array.isArray(json.props.style)
      ? Object.assign({}, ...json.props.style)
      : json.props.style;
    expect(containerStyle.paddingTop).toBe(28);
  });

  it('容器的 paddingTop 不应是硬编码的 60', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SearchBar />);
    });
    const json = tree!.toJSON() as any;
    const containerStyle = Array.isArray(json.props.style)
      ? Object.assign({}, ...json.props.style)
      : json.props.style;
    expect(containerStyle.paddingTop).not.toBe(60);
  });
});
