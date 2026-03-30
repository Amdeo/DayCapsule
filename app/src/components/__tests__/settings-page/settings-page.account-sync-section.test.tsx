import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SettingsAccountSyncSection } from '../../settings-page/SettingsAccountSyncSection';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

describe('SettingsAccountSyncSection', () => {
  it('renders authenticated account and sync controls with stable visible behavior', () => {
    const onCloudModeToggle = jest.fn();
    const onShowSyncStatus = jest.fn();
    const onLogout = jest.fn();
    const onShowLogin = jest.fn();

    const screen = render(
      <SettingsAccountSyncSection
        isAuthenticated
        userEmail="tester@example.com"
        cloudMode={false}
        isSwitchingMode={false}
        currentServerUrl="https://server-a.example.com"
        backendDraftUrl="https://server-a.example.com"
        recentServerUrls={["https://server-b.example.com"]}
        backendTestStatus="idle"
        backendTestErrorMessage={null}
        isSavingBackendServer={false}
        canSaveBackendServer={false}
        onCloudModeToggle={onCloudModeToggle}
        onShowSyncStatus={onShowSyncStatus}
        onLogout={onLogout}
        onShowLogin={onShowLogin}
        onBackendDraftUrlChange={() => undefined}
        onTestBackendServer={() => undefined}
        onSaveBackendServer={() => undefined}
        onSelectRecentBackendServer={() => undefined}
      />
    );

    expect(screen.getByText('账户与同步')).toBeTruthy();
    expect(screen.getByText('后端连接')).toBeTruthy();
    expect(screen.getByText('当前生效地址：https://server-a.example.com')).toBeTruthy();
    expect(screen.getByText('tester@example.com')).toBeTruthy();
    expect(screen.getByText('云端模式')).toBeTruthy();
    expect(screen.getByText('数据存储在本地')).toBeTruthy();
    expect(screen.getByTestId('settings-switch-cloud-mode')).toBeTruthy();
    expect(screen.getByTestId('settings-show-sync-status')).toBeTruthy();
    expect(screen.getByText('退出登录')).toBeTruthy();

    fireEvent(screen.getByTestId('settings-switch-cloud-mode'), 'valueChange', true);
    fireEvent.press(screen.getByTestId('settings-show-sync-status'));
    fireEvent.press(screen.getByText('退出登录'));

    expect(onCloudModeToggle).toHaveBeenCalledWith(true);
    expect(onShowSyncStatus).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(onShowLogin).not.toHaveBeenCalled();
  });
});
