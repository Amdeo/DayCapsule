import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Sidebar } from '../Sidebar';

const mockSettingsPage = jest.fn(() => null);
const mockStatsPage = jest.fn(() => null);
const mockBackupPage = jest.fn(() => null);

jest.mock('../SettingsPage', () => ({
  SettingsPage: (props: unknown) => mockSettingsPage(props),
}));

jest.mock('../StatsPage', () => ({
  StatsPage: (props: unknown) => mockStatsPage(props),
}));

jest.mock('../BackupPage', () => ({
  BackupPage: (props: unknown) => mockBackupPage(props),
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
  const [showStats, setShowStats] = React.useState(false);
  const [showBackup, setShowBackup] = React.useState(false);

  return (
    <Sidebar
      drawerProgress={{ value: 1 }}
      onClose={jest.fn()}
      showSettings={showSettings}
      setShowSettings={setShowSettings}
      showStats={showStats}
      setShowStats={setShowStats}
      showBackup={showBackup}
      setShowBackup={setShowBackup}
    />
  );
}

function renderSidebar() {
  return render(<SidebarHarness />);
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
        showStats={false}
        setShowStats={jest.fn()}
        showBackup={false}
        setShowBackup={jest.fn()}
      />
    );

    expect(getByTestId('sidebar-shell')).toBeTruthy();
    expect(getByTestId('sidebar-menu-stats')).toBeTruthy();
    expect(getByTestId('sidebar-menu-backup')).toBeTruthy();
    expect(getByTestId('sidebar-menu-settings')).toBeTruthy();
    expect(getByText('统计')).toBeTruthy();
    expect(getByText('查看记录、照片、语音概览')).toBeTruthy();
    expect(getByText('管理本地备份与云端同步')).toBeTruthy();
    expect(getByText('调整账号、显示和存储偏好')).toBeTruthy();
    expect(getByText('DayCapsule v1.0.0')).toBeTruthy();
    expect(getByTestId('sidebar-footer')).toHaveStyle({ paddingBottom: 16 });
  });

  it('does not mount hidden detail pages before a menu item is opened', () => {
    render(<SidebarHarness />);

    expect(mockSettingsPage).not.toHaveBeenCalled();
    expect(mockStatsPage).not.toHaveBeenCalled();
    expect(mockBackupPage).not.toHaveBeenCalled();
  });

  it('calls onClose when the header close button is pressed', () => {
    const onClose = jest.fn();
    const screen = render(
      <Sidebar
        drawerProgress={{ value: 1 }}
        onClose={onClose}
        showSettings={false}
        setShowSettings={jest.fn()}
        showStats={false}
        setShowStats={jest.fn()}
        showBackup={false}
        setShowBackup={jest.fn()}
      />
    );

    fireEvent.press(screen.getByText('close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('only mounts the requested detail page when opening the stats menu item', () => {
    const screen = render(<SidebarHarness />);

    fireEvent.press(screen.getByText('统计'));

    expect(mockStatsPage).toHaveBeenCalledTimes(1);
    expect(mockSettingsPage).not.toHaveBeenCalled();
    expect(mockBackupPage).not.toHaveBeenCalled();
  });

  it('renders only stats, backup and settings entries in the sidebar menu', () => {
    const screen = renderSidebar();

    expect(screen.getByTestId('sidebar-menu-stats')).toBeTruthy();
    expect(screen.getByTestId('sidebar-menu-backup')).toBeTruthy();
    expect(screen.getByTestId('sidebar-menu-settings')).toBeTruthy();

    expect(screen.queryByTestId('sidebar-menu-tags')).toBeNull();
    expect(screen.queryByTestId('sidebar-menu-help')).toBeNull();
    expect(screen.queryByTestId('sidebar-menu-about')).toBeNull();
  });

  it.each([
    ['sidebar-menu-settings', mockSettingsPage],
    ['sidebar-menu-stats', mockStatsPage],
    ['sidebar-menu-backup', mockBackupPage],
  ] as const)(
    'only mounts the mapped detail page when opening %s',
    (testId, expectedPageMock) => {
      const screen = renderSidebar();

      fireEvent.press(screen.getByTestId(testId));

      expect(expectedPageMock).toHaveBeenCalledTimes(1);
      expect(mockSettingsPage).toHaveBeenCalledTimes(expectedPageMock === mockSettingsPage ? 1 : 0);
      expect(mockStatsPage).toHaveBeenCalledTimes(expectedPageMock === mockStatsPage ? 1 : 0);
      expect(mockBackupPage).toHaveBeenCalledTimes(expectedPageMock === mockBackupPage ? 1 : 0);
    }
  );

  it('switches to the newly selected page when selecting another menu entry', () => {
    const screen = renderSidebar();

    fireEvent.press(screen.getByTestId('sidebar-menu-settings'));
    expect(mockSettingsPage).toHaveBeenCalledTimes(1);
    expect(mockBackupPage).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('sidebar-menu-backup'));

    expect(mockBackupPage).toHaveBeenCalledTimes(1);
    expect(mockSettingsPage).toHaveBeenCalledTimes(1);
  });
});
