import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Dimensions, StyleSheet, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { DetailPageShell } from '../DetailPageShell';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 12, bottom: 8, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

describe('DetailPageShell', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders nothing when hidden and unmounts after the exit delay', () => {
    const screen = render(
      <DetailPageShell visible={false} title="帮助" onClose={jest.fn()}>
        <Text>body</Text>
      </DetailPageShell>
    );

    expect(screen.queryByTestId('detail-page-shell')).toBeNull();
  });

  it('renders title, children, and scroll container when visible', () => {
    const { getByText, getByTestId } = render(
      <DetailPageShell visible title="备份与同步" onClose={jest.fn()}>
        <Text>shell child</Text>
      </DetailPageShell>
    );

    expect(getByText('备份与同步')).toBeTruthy();
    expect(getByText('shell child')).toBeTruthy();
    expect(getByTestId('detail-page-scroll')).toBeTruthy();
  });

  it('renders the shell header and headerRight slot when provided', () => {
    const { getByTestId, getByText } = render(
      <DetailPageShell
        visible
        title="关于"
        onClose={jest.fn()}
        headerRight={<Text>操作</Text>}
      >
        <Text>body</Text>
      </DetailPageShell>
    );

    expect(getByTestId('detail-page-shell')).toBeTruthy();
    expect(getByTestId('detail-page-header')).toBeTruthy();
    expect(getByTestId('detail-page-header-right')).toBeTruthy();
    expect(getByText('操作')).toBeTruthy();
  });

  it('calls onClose from backdrop and back button', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <DetailPageShell visible title="帮助" onClose={onClose}>
        <Text>body</Text>
      </DetailPageShell>
    );

    fireEvent.press(getByTestId('detail-page-back-button'));
    fireEvent.press(getByTestId('detail-page-backdrop'));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('keeps rendering the static content container when scroll is disabled', () => {
    const { getByTestId } = render(
      <DetailPageShell visible title="帮助" onClose={jest.fn()} scrollEnabled={false}>
        <Text>body</Text>
      </DetailPageShell>
    );

    expect(getByTestId('detail-page-content')).toBeTruthy();
  });

  it('uses screen height for the page instead of anchoring it to bottom', () => {
    const screenHeight = Dimensions.get('screen').height;
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <DetailPageShell visible title="帮助" onClose={jest.fn()}>
          <Text>body</Text>
        </DetailPageShell>
      );
    });

    const page = tree!.root.findByProps({ testID: 'detail-page-shell' });
    const pageStyle = StyleSheet.flatten(page.props.style);

    expect(pageStyle.height).toBe(screenHeight);
    expect(pageStyle.bottom).toBeUndefined();
  });

  it('unmounts immediately when hidden so closed detail pages do not block underlying touches', () => {
    const screen = render(
      <DetailPageShell visible title="帮助" onClose={jest.fn()}>
        <Text>body</Text>
      </DetailPageShell>
    );

    screen.rerender(
      <DetailPageShell visible={false} title="帮助" onClose={jest.fn()}>
        <Text>body</Text>
      </DetailPageShell>
    );

    expect(screen.queryByTestId('detail-page-shell')).toBeNull();
    expect(screen.queryByTestId('detail-page-backdrop')).toBeNull();
  });

  it('removes the backdrop immediately when hidden', () => {
    const onClose = jest.fn();
    const screen = render(
      <DetailPageShell visible title="帮助" onClose={onClose}>
        <Text>body</Text>
      </DetailPageShell>
    );

    screen.rerender(
      <DetailPageShell visible={false} title="帮助" onClose={onClose}>
        <Text>body</Text>
      </DetailPageShell>
    );

    expect(screen.queryByTestId('detail-page-backdrop')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });
});
