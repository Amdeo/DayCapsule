import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CloudSyncStatusButton } from '../CloudSyncStatusButton';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

describe('CloudSyncStatusButton', () => {
  it('renders static cloud with green dot for synced state', () => {
    const screen = render(<CloudSyncStatusButton uiState="synced" onPress={jest.fn()} />);

    expect(screen.getByTestId('cloud-sync-dot-synced')).toBeTruthy();
  });

  it('renders static cloud with orange dot for pending state', () => {
    const screen = render(<CloudSyncStatusButton uiState="pending" onPress={jest.fn()} />);

    expect(screen.getByTestId('cloud-sync-dot-pending')).toBeTruthy();
  });

  it('renders static cloud with red dot for failed state', () => {
    const screen = render(<CloudSyncStatusButton uiState="failed" onPress={jest.fn()} />);

    expect(screen.getByTestId('cloud-sync-dot-failed')).toBeTruthy();
  });

  it('renders animated cloud shell for syncing state', () => {
    const screen = render(<CloudSyncStatusButton uiState="syncing" onPress={jest.fn()} />);

    expect(screen.getByTestId('cloud-sync-spinner')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const screen = render(<CloudSyncStatusButton uiState="synced" onPress={onPress} />);

    fireEvent.press(screen.getByTestId('cloud-sync-button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
