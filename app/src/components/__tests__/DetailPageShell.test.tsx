import React from 'react';
import { Text } from 'react-native';
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
});
