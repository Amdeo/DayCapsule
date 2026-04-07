import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';
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

function expectNoFloatingShadow(style: unknown) {
  const flatStyle = StyleSheet.flatten(style as any) ?? {};

  expect(flatStyle.elevation ?? 0).toBe(0);
  expect(flatStyle.shadowOpacity ?? 0).toBe(0);
  expect(flatStyle.shadowRadius ?? 0).toBe(0);
  expect(flatStyle.shadowOffset ?? { width: 0, height: 0 }).toEqual({ width: 0, height: 0 });
  expect(flatStyle.shadowColor ?? 'transparent').toBe('transparent');
}

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

  it('locks the flat shell baseline for the menu button and search box', () => {
    const { getByTestId } = render(<SearchBar />);
    const menuButton = getByTestId('searchbar-menu-button');
    const searchBox = getByTestId('searchbar-search-box');

    expect(getByTestId('searchbar-menu-button-pressable')).toBeTruthy();
    expect(menuButton).toHaveStyle({
      width: 48,
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#E8DED1',
      backgroundColor: '#F3EEE7',
    });
    expectNoFloatingShadow(menuButton.props.style);
    expect(searchBox).toHaveStyle({
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#ECE3D8',
      backgroundColor: '#F8F5F0',
    });
    expectNoFloatingShadow(searchBox.props.style);
  });

  it('locks the flat shell baseline for the view-mode toggle when enabled', () => {
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
    const viewModeToggle = getByTestId('searchbar-view-mode-toggle');

    expect(viewModeToggle).toHaveStyle({
      width: 48,
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#E8DED1',
      backgroundColor: '#F3EEE7',
    });
    expectNoFloatingShadow(viewModeToggle.props.style);
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
