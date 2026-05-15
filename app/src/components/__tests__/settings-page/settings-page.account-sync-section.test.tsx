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
  function buildProps(overrides: Partial<React.ComponentProps<typeof SettingsAccountSyncSection>> = {}) {
    return {
      isAuthenticated: true,
      isCloudProtectionEnabled: false,
      isAccountScopeActive: true,
      isTransitioning: false,
      onShowSyncStatus: jest.fn(),
      onSwitchAccount: jest.fn(),
      onLogout: jest.fn(),
      onShowLogin: jest.fn(),
      currentServerUrl: 'https://server-a.example.com',
      backendDraftUrl: 'https://server-a.example.com',
      recentServerUrls: [],
      backendTestStatus: 'idle' as const,
      backendTestErrorMessage: null,
      isSavingBackendServer: false,
      canSaveBackendServer: false,
      onBackendDraftUrlChange: jest.fn(),
      onTestBackendServer: jest.fn(),
      onSaveBackendServer: jest.fn(),
      onSelectRecentBackendServer: jest.fn(),
      ...overrides,
    };
  }

  it('renders unauthenticated login entry only', () => {
    const onShowLogin = jest.fn();

    const screen = render(
      <SettingsAccountSyncSection
        {...buildProps({
          isAuthenticated: false,
          onShowLogin,
        })}
      />
    );

    expect(screen.getByText('账户与同步')).toBeTruthy();
    expect(screen.getByText('登录账号')).toBeTruthy();
    expect(screen.getByText('登录后即可开启云同步与备份')).toBeTruthy();
    expect(screen.queryByTestId('settings-show-sync-status')).toBeNull();

    fireEvent.press(screen.getByTestId('settings-open-login'));
    expect(onShowLogin).toHaveBeenCalledTimes(1);
  });

  it('renders authenticated but unprotected state without sync status entry', () => {
    const onEnableCloudProtection = jest.fn();

    const screen = render(
      <SettingsAccountSyncSection
        {...buildProps({
          isCloudProtectionEnabled: false,
          onEnableCloudProtection,
        })}
      />
    );

    expect(screen.getByText('开启云同步与备份')).toBeTruthy();
    expect(screen.getByText('当前数据仍仅保存在本机')).toBeTruthy();
    expect(screen.getByTestId('settings-enable-cloud-protection')).toBeTruthy();
    expect(screen.queryByTestId('settings-show-sync-status')).toBeNull();

    fireEvent.press(screen.getByTestId('settings-enable-cloud-protection'));
    expect(onEnableCloudProtection).toHaveBeenCalledTimes(1);
  });

  it('renders authenticated protected state with sync controls', () => {
    const onShowSyncStatus = jest.fn();
    const onSwitchAccount = jest.fn();
    const onLogout = jest.fn();
    const onShowLogin = jest.fn();

    const screen = render(
      <SettingsAccountSyncSection
        {...buildProps({
          isCloudProtectionEnabled: true,
          onShowSyncStatus,
          onSwitchAccount,
          onLogout,
          onShowLogin,
        })}
      />
    );

    expect(screen.getByText('账户与同步')).toBeTruthy();
    expect(screen.getByText('云同步与备份已开启')).toBeTruthy();
    expect(screen.getByText('云端已保护当前记忆')).toBeTruthy();
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
