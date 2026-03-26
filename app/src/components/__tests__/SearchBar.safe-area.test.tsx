import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

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

  it('renders rightActions without affecting safe area padding', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SearchBar rightActions={<Text>sync</Text>} />);
    });
    const json = tree!.toJSON() as any;
    const containerStyle = Array.isArray(json.props.style)
      ? Object.assign({}, ...json.props.style)
      : json.props.style;
    expect(containerStyle.paddingTop).toBe(28);
    expect(JSON.stringify(json)).toContain('sync');
  });

  it('keeps the menu button and search shell dimensions after nativewind migration', () => {
    const { getByTestId } = render(<SearchBar />);

    expect(getByTestId('searchbar-menu-button-pressable')).toBeTruthy();
    expect(getByTestId('searchbar-menu-button')).toHaveStyle({
      width: 48,
      height: 48,
      borderRadius: 24,
    });
    expect(getByTestId('searchbar-search-box')).toHaveStyle({
      height: 48,
    });
  });

  it('renders stable search entry and view mode toggle anchors when actions are enabled', () => {
    const onSearchFocus = jest.fn();
    const onViewModePress = jest.fn();
    const { getByTestId } = render(
      <SearchBar
        onSearchFocus={onSearchFocus}
        onViewModePress={onViewModePress}
        showViewModeActive
      />
    );

    expect(getByTestId('searchbar-search-box')).toBeTruthy();
    expect(getByTestId('searchbar-view-mode-toggle')).toBeTruthy();
  });

  it('fires menu, search and view-mode callbacks from the stable anchors', () => {
    const onMenuPress = jest.fn();
    const onSearchFocus = jest.fn();
    const onViewModePress = jest.fn();
    const { getByTestId } = render(
      <SearchBar
        onMenuPress={onMenuPress}
        onSearchFocus={onSearchFocus}
        onViewModePress={onViewModePress}
      />
    );

    fireEvent.press(getByTestId('searchbar-menu-button-pressable'));
    fireEvent.press(getByTestId('searchbar-search-box'));
    fireEvent.press(getByTestId('searchbar-view-mode-toggle'));

    expect(onMenuPress).toHaveBeenCalledTimes(1);
    expect(onSearchFocus).toHaveBeenCalledTimes(1);
    expect(onViewModePress).toHaveBeenCalledTimes(1);
  });

  it('does not render the view-mode toggle when no handler is provided', () => {
    const { queryByTestId } = render(<SearchBar />);

    expect(queryByTestId('searchbar-view-mode-toggle')).toBeNull();
  });
});
