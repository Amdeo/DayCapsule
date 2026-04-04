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
    const onShowSyncStatus = jest.fn();
    const onSwitchAccount = jest.fn();
    const onLogout = jest.fn();
    const onShowLogin = jest.fn();

    const screen = render(
      <SettingsAccountSyncSection
        isAuthenticated
        onShowSyncStatus={onShowSyncStatus}
        onSwitchAccount={onSwitchAccount}
        onLogout={onLogout}
        onShowLogin={onShowLogin}
        currentServerUrl="https://server-a.example.com"
        backendDraftUrl="https://server-a.example.com"
        recentServerUrls={[]}
        backendTestStatus="idle"
        backendTestErrorMessage={null}
        isSavingBackendServer={false}
        canSaveBackendServer={false}
        onBackendDraftUrlChange={jest.fn()}
        onTestBackendServer={jest.fn()}
        onSaveBackendServer={jest.fn()}
        onSelectRecentBackendServer={jest.fn()}
      />
    );

    expect(screen.getByText('账户与同步')).toBeTruthy();
    expect(screen.getByText('账号同步')).toBeTruthy();
    expect(screen.getByText('已启用，本地优先写入并在稍后同步')).toBeTruthy();
    expect(screen.getByTestId('settings-show-sync-status')).toBeTruthy();
    expect(screen.getByText('切换账号')).toBeTruthy();
    expect(screen.getByText('退出登录')).toBeTruthy();

    fireEvent.press(screen.getByTestId('settings-show-sync-status'));
    fireEvent.press(screen.getByText('切换账号'));
    fireEvent.press(screen.getByText('退出登录'));

    expect(onShowSyncStatus).toHaveBeenCalledTimes(1);
    expect(onSwitchAccount).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(onShowLogin).not.toHaveBeenCalled();
  });
});
