import React from 'react';
import { render } from '@testing-library/react-native';
import { Sidebar } from '../Sidebar';

jest.mock('../SettingsPage', () => ({
  SettingsPage: () => null,
}));

jest.mock('../AboutPage', () => ({
  AboutPage: () => null,
}));

jest.mock('../StatsPage', () => ({
  StatsPage: () => null,
}));

jest.mock('../TagsPage', () => ({
  TagsPage: () => null,
}));

jest.mock('../BackupPage', () => ({
  BackupPage: () => null,
}));

jest.mock('../HelpPage', () => ({
  HelpPage: () => null,
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('../../../__mocks__/react-native-reanimated.js');
  Reanimated.default.call = () => {};
  return Reanimated;
});

describe('Sidebar shell', () => {
  it('renders the sidebar shell, menu items and safe-area footer', () => {
    const { getByTestId, getByText } = render(
      <Sidebar
        drawerProgress={{ value: 1 }}
        onClose={jest.fn()}
        showSettings={false}
        setShowSettings={jest.fn()}
        showAbout={false}
        setShowAbout={jest.fn()}
        showStats={false}
        setShowStats={jest.fn()}
        showTags={false}
        setShowTags={jest.fn()}
        showBackup={false}
        setShowBackup={jest.fn()}
        showHelp={false}
        setShowHelp={jest.fn()}
      />
    );

    expect(getByTestId('sidebar-shell')).toBeTruthy();
    expect(getByText('统计')).toBeTruthy();
    expect(getByTestId('sidebar-footer')).toHaveStyle({ paddingBottom: 16 });
  });
});
