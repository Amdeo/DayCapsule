import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Sidebar } from '../Sidebar';

const mockSettingsPage = jest.fn(() => null);
const mockAboutPage = jest.fn(() => null);
const mockStatsPage = jest.fn(() => null);
const mockTagsPage = jest.fn(() => null);
const mockBackupPage = jest.fn(() => null);
const mockHelpPage = jest.fn(() => null);

jest.mock('../SettingsPage', () => ({
  SettingsPage: (props: unknown) => mockSettingsPage(props),
}));

jest.mock('../AboutPage', () => ({
  AboutPage: (props: unknown) => mockAboutPage(props),
}));

jest.mock('../StatsPage', () => ({
  StatsPage: (props: unknown) => mockStatsPage(props),
}));

jest.mock('../TagsPage', () => ({
  TagsPage: (props: unknown) => mockTagsPage(props),
}));

jest.mock('../BackupPage', () => ({
  BackupPage: (props: unknown) => mockBackupPage(props),
}));

jest.mock('../HelpPage', () => ({
  HelpPage: (props: unknown) => mockHelpPage(props),
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

function SidebarHarness() {
  const [showSettings, setShowSettings] = React.useState(false);
  const [showAbout, setShowAbout] = React.useState(false);
  const [showStats, setShowStats] = React.useState(false);
  const [showTags, setShowTags] = React.useState(false);
  const [showBackup, setShowBackup] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);

  return (
    <Sidebar
      drawerProgress={{ value: 1 }}
      onClose={jest.fn()}
      showSettings={showSettings}
      setShowSettings={setShowSettings}
      showAbout={showAbout}
      setShowAbout={setShowAbout}
      showStats={showStats}
      setShowStats={setShowStats}
      showTags={showTags}
      setShowTags={setShowTags}
      showBackup={showBackup}
      setShowBackup={setShowBackup}
      showHelp={showHelp}
      setShowHelp={setShowHelp}
    />
  );
}

describe('Sidebar shell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
    expect(getByText('DayCapsule v1.0.0')).toBeTruthy();
    expect(getByTestId('sidebar-footer')).toHaveStyle({ paddingBottom: 16 });
  });

  it('does not mount hidden detail pages before a menu item is opened', () => {
    render(<SidebarHarness />);

    expect(mockSettingsPage).not.toHaveBeenCalled();
    expect(mockAboutPage).not.toHaveBeenCalled();
    expect(mockStatsPage).not.toHaveBeenCalled();
    expect(mockTagsPage).not.toHaveBeenCalled();
    expect(mockBackupPage).not.toHaveBeenCalled();
    expect(mockHelpPage).not.toHaveBeenCalled();
  });

  it('only mounts the requested detail page when opening a menu item', () => {
    const screen = render(<SidebarHarness />);

    fireEvent.press(screen.getByText('统计'));

    expect(mockStatsPage).toHaveBeenCalledTimes(1);
    expect(mockSettingsPage).not.toHaveBeenCalled();
    expect(mockAboutPage).not.toHaveBeenCalled();
    expect(mockTagsPage).not.toHaveBeenCalled();
    expect(mockBackupPage).not.toHaveBeenCalled();
    expect(mockHelpPage).not.toHaveBeenCalled();
  });
});
