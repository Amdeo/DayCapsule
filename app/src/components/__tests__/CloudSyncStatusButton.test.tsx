import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { CloudSyncStatusButton } from '../CloudSyncStatusButton';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, testID }: { name?: string; testID?: string }) => (
      <Text testID={testID}>{name ?? 'icon'}</Text>
    ),
  };
});

function expectNoFloatingShadow(style: unknown) {
  const flatStyle = StyleSheet.flatten(style as any) ?? {};

  expect(flatStyle.elevation ?? 0).toBe(0);
  expect(flatStyle.shadowOpacity ?? 0).toBe(0);
  expect(flatStyle.shadowRadius ?? 0).toBe(0);
  expect(flatStyle.shadowOffset ?? { width: 0, height: 0 }).toEqual({ width: 0, height: 0 });
  expect(flatStyle.shadowColor ?? 'transparent').toBe('transparent');
}

describe('CloudSyncStatusButton', () => {
  it('locks the flat shell baseline for the cloud sync button', () => {
    const screen = render(<CloudSyncStatusButton uiState="synced" onPress={jest.fn()} />);
    const button = screen.getByTestId('cloud-sync-button');

    expect(button).toHaveStyle({
      width: 48,
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#E8DED1',
      backgroundColor: '#F3EEE7',
    });
    expectNoFloatingShadow(button.props.style);
  });

  it('renders synced icon state without spinner', () => {
    const screen = render(<CloudSyncStatusButton uiState="synced" onPress={jest.fn()} />);

    expect(screen.getByTestId('cloud-sync-shell')).toBeTruthy();
    expect(screen.getByTestId('cloud-sync-icon-synced')).toBeTruthy();
    expect(screen.getByText('cloud-done-outline')).toBeTruthy();
    expect(screen.queryByTestId('cloud-sync-spinner')).toBeNull();
    expect(screen.queryByTestId('cloud-sync-dot-synced')).toBeNull();
  });

  it('renders pending icon state without legacy dot markers', () => {
    const screen = render(<CloudSyncStatusButton uiState="pending" onPress={jest.fn()} />);

    expect(screen.getByTestId('cloud-sync-icon-pending')).toBeTruthy();
    expect(screen.getByText('cloud-upload-outline')).toBeTruthy();
    expect(screen.queryByTestId('cloud-sync-dot-pending')).toBeNull();
    expect(screen.queryByTestId('cloud-sync-dot-synced')).toBeNull();
  });

  it('renders failed icon state without legacy dot markers', () => {
    const screen = render(<CloudSyncStatusButton uiState="failed" onPress={jest.fn()} />);

    expect(screen.getByTestId('cloud-sync-icon-failed')).toBeTruthy();
    expect(screen.getByText('cloud-offline-outline')).toBeTruthy();
    expect(screen.queryByTestId('cloud-sync-dot-failed')).toBeNull();
    expect(screen.queryByTestId('cloud-sync-dot-pending')).toBeNull();
  });

  it('renders animated cloud shell for syncing state', () => {
    const screen = render(<CloudSyncStatusButton uiState="syncing" onPress={jest.fn()} />);

    expect(screen.getByTestId('cloud-sync-shell')).toBeTruthy();
    expect(screen.getByTestId('cloud-sync-spinner')).toBeTruthy();
    expect(screen.getByText('cloud-outline')).toBeTruthy();
    expect(screen.queryAllByTestId(/cloud-sync-dot-/)).toHaveLength(0);
    expect(screen.queryByTestId('cloud-sync-dot-synced')).toBeNull();
    expect(screen.queryByTestId('cloud-sync-dot-pending')).toBeNull();
    expect(screen.queryByTestId('cloud-sync-dot-failed')).toBeNull();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const screen = render(<CloudSyncStatusButton uiState="synced" onPress={onPress} />);

    fireEvent.press(screen.getByTestId('cloud-sync-button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes the cloud sync action as an accessible button', () => {
    const screen = render(<CloudSyncStatusButton uiState="pending" onPress={jest.fn()} />);

    expect(screen.getByTestId('cloud-sync-button').props.accessibilityRole).toBe('button');
  });
});
