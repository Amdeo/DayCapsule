import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import {
  renderSettingsPage,
  resetRenderSettingsPageMocks,
  getLatestLoginPageProps,
  triggerLatestLoginSuccess,
} from '../helpers/renderSettingsPage';

type LatestSettingsPageContentProps = null | {
  isAuthenticated: boolean;
  userEmail?: string;
  usedSpace: string;
  onShowSyncStatus: () => void | Promise<void>;
  onSwitchAccount?: () => void | Promise<void>;
  onLogout: () => void;
  onShowLogin: () => void;
};

let latestSettingsPageContentProps: LatestSettingsPageContentProps = null;

jest.mock('../../settings-page/SettingsPageContent', () => ({
  SettingsPageContent: (props: any) => {
    const React = require('react');
    const { Text, View } = require('react-native');

    latestSettingsPageContentProps = props;

    return (
      <View testID="settings-page-content-mock">
        <Text>{props.usedSpace}</Text>
        {props.isAuthenticated ? (
          <>
            <Text>{props.userEmail}</Text>
            <Text testID="settings-show-sync-status" onPress={props.onShowSyncStatus}>同步状态</Text>
            <Text onPress={props.onSwitchAccount}>切换账号</Text>
            <Text onPress={props.onLogout}>退出登录</Text>
          </>
        ) : (
          <Text testID="settings-open-login" onPress={props.onShowLogin}>登录 / 注册</Text>
        )}
      </View>
    );
  },
}));

describe('SettingsPage account auth', () => {
  beforeEach(() => {
    latestSettingsPageContentProps = null;
    resetRenderSettingsPageMocks();
  });

  async function settleInitialEffects(screen: any) {
    await waitFor(() => {
      expect(screen.getByTestId('settings-page-content-mock')).toBeTruthy();
    });
  }

  it('shows only the login entry when unauthenticated', async () => {
    const { screen } = await renderSettingsPage({ authenticated: false });
    await settleInitialEffects(screen);

    expect(screen.getByText('登录 / 注册')).toBeTruthy();
    expect(screen.queryByText('同步状态')).toBeNull();
    expect(screen.queryByText('退出登录')).toBeNull();
  });

  it('shows email, sync status, switch account and logout when authenticated', async () => {
    const { screen } = await renderSettingsPage({ authenticated: true, userEmail: 'tester@example.com' });
    await settleInitialEffects(screen);

    expect(screen.getByText('tester@example.com')).toBeTruthy();
    expect(screen.getByText('同步状态')).toBeTruthy();
    expect(screen.getByText('切换账号')).toBeTruthy();
    expect(screen.getByText('退出登录')).toBeTruthy();
  });

  it('calls logout directly from the authenticated settings entry', async () => {
    const { screen, mocks } = await renderSettingsPage({ authenticated: true });
    await settleInitialEffects(screen);

    fireEvent.press(screen.getByText('退出登录'));

    await waitFor(() => {
      expect(mocks.auth.logout).toHaveBeenCalledTimes(1);
    });
    expect(mocks.entries.loadEntries).not.toHaveBeenCalled();
  });

  it('opens the login dialog from the real settings entry when unauthenticated', async () => {
    const { screen } = await renderSettingsPage({ authenticated: false });
    await settleInitialEffects(screen);

    fireEvent.press(screen.getByTestId('settings-open-login'));

    expect(await screen.findByTestId('settings-login-dialog')).toBeTruthy();
  });

  it('closes login dialog on login success', async () => {
    const { screen } = await renderSettingsPage({ authenticated: false });
    await settleInitialEffects(screen);

    fireEvent.press(screen.getByTestId('settings-open-login'));
    expect(await screen.findByTestId('settings-login-dialog')).toBeTruthy();
    expect(getLatestLoginPageProps()?.visible).toBe(true);

    await act(async () => {
      await triggerLatestLoginSuccess();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('settings-login-dialog')).toBeNull();
    });
  });

  it('does not render the legacy account mode switch', async () => {
    const { screen } = await renderSettingsPage({ authenticated: true });
    await settleInitialEffects(screen);

    expect(screen.queryByTestId('settings-switch-cloud-mode')).toBeNull();
  });
});
