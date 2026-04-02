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
  cloudMode: boolean | 'switching';
  isSwitchingMode: boolean;
  usedSpace: string;
  onCloudModeToggle: (value: boolean) => void | Promise<void>;
  onShowSyncStatus: () => void | Promise<void>;
  onLogout: () => void;
  onShowLogin: () => void;
};

let latestSettingsPageContentProps: LatestSettingsPageContentProps = null;

jest.mock('../../settings-page/SettingsPageContent', () => ({
  SettingsPageContent: (props: any) => {
    const React = require('react');
    const { Text, Switch, View } = require('react-native');

    latestSettingsPageContentProps = props;

    return (
      <View testID="settings-page-content-mock">
        <Text>{props.usedSpace}</Text>
        {props.isAuthenticated ? (
          <>
            <Text>{props.userEmail}</Text>
            <Switch
              testID="settings-switch-cloud-mode"
              value={props.cloudMode === true}
              onValueChange={props.onCloudModeToggle}
              disabled={props.cloudMode === 'switching' || props.isSwitchingMode}
            />
            <Text onPress={props.onShowSyncStatus}>同步状态</Text>
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

  it('opens login dialog (instead of enabling cloud mode) when unauthenticated users try to enable cloud mode', async () => {
    const { screen, mocks } = await renderSettingsPage({ authenticated: false, cloudMode: false });
    await settleInitialEffects(screen);

    expect(latestSettingsPageContentProps).toBeTruthy();

    await act(async () => {
      await latestSettingsPageContentProps?.onCloudModeToggle(true);
    });

    expect(await screen.findByTestId('settings-login-dialog')).toBeTruthy();
    expect(mocks.settings.setCloudMode).not.toHaveBeenCalled();
  });

  it('shows email, sync status, and logout when authenticated', async () => {
    const { screen } = await renderSettingsPage({ authenticated: true, userEmail: 'tester@example.com' });
    await settleInitialEffects(screen);

    expect(screen.getByText('tester@example.com')).toBeTruthy();
    expect(screen.getByText('同步状态')).toBeTruthy();
    expect(screen.getByText('退出登录')).toBeTruthy();
  });

  it('does not call logout when the user cancels the logout confirmation', async () => {
    const { screen, mocks } = await renderSettingsPage({ authenticated: true, cloudMode: false });
    await settleInitialEffects(screen);

    fireEvent.press(screen.getByText('退出登录'));

    await waitFor(() => {
      expect(mocks.showConfirmDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '退出登录',
          message: expect.any(String),
        }),
      );
    });

    const actions = mocks.showConfirmDialog.mock.calls[0][0].actions as Array<{ label?: string; onPress?: () => void }>;
    const cancel = actions.find((action) => action.label === '取消');
    await act(async () => {
      await cancel?.onPress?.();
    });

    expect(mocks.auth.logout).not.toHaveBeenCalled();
  });

  it('calls logout only when confirmed in offline mode', async () => {
    const { screen, mocks } = await renderSettingsPage({ authenticated: true, cloudMode: false });
    await settleInitialEffects(screen);

    fireEvent.press(screen.getByText('退出登录'));

    await waitFor(() => {
      expect(mocks.showConfirmDialog).toHaveBeenCalled();
    });

    const actions = mocks.showConfirmDialog.mock.calls[0][0].actions as Array<{ label?: string; onPress?: () => void }>;
    const confirm = actions.find((action) => action.label === '退出');

    await act(async () => {
      await confirm?.onPress?.();
    });

    await waitFor(() => {
      expect(mocks.auth.logout).toHaveBeenCalledTimes(1);
    });
    expect(mocks.settings.setCloudMode).not.toHaveBeenCalled();
    expect(mocks.entries.loadEntries).not.toHaveBeenCalled();
  });

  it('in cloud mode, logout confirmation disables cloud mode then reloads entries then logs out', async () => {
    const { screen, mocks } = await renderSettingsPage({ authenticated: true, cloudMode: true });
    await settleInitialEffects(screen);

    fireEvent.press(screen.getByText('退出登录'));

    await waitFor(() => {
      expect(mocks.showConfirmDialog).toHaveBeenCalled();
    });

    const actions = mocks.showConfirmDialog.mock.calls[0][0].actions as Array<{ label?: string; onPress?: () => void }>;
    const confirm = actions.find((action) => action.label === '退出');

    await act(async () => {
      await confirm?.onPress?.();
    });

    await waitFor(() => {
      expect(mocks.settings.setCloudMode).toHaveBeenNthCalledWith(1, false);
      expect(mocks.entries.loadEntries).toHaveBeenCalledTimes(1);
      expect(mocks.auth.logout).toHaveBeenCalledTimes(1);
    });

    const setCloudModeOrder = (mocks.settings.setCloudMode as jest.Mock).mock.invocationCallOrder[0];
    const loadEntriesOrder = (mocks.entries.loadEntries as jest.Mock).mock.invocationCallOrder[0];
    const logoutOrder = (mocks.auth.logout as jest.Mock).mock.invocationCallOrder[0];

    expect(setCloudModeOrder).toBeLessThan(loadEntriesOrder);
    expect(loadEntriesOrder).toBeLessThan(logoutOrder);
  });

  it("disables cloud mode switch when cloudMode is 'switching'", async () => {
    const { screen } = await renderSettingsPage({ authenticated: true, cloudMode: 'switching' });
    await settleInitialEffects(screen);

    expect(screen.getByTestId('settings-switch-cloud-mode').props.disabled).toBe(true);
  });

  it('closes login dialog on account login success without enabling cloud mode', async () => {
    const { screen, mocks } = await renderSettingsPage({ authenticated: false });
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
    expect(mocks.settings.setCloudMode).not.toHaveBeenCalled();
  });

  it('closes login dialog and enables cloud mode when login was triggered by cloud gating', async () => {
    const { screen, mocks } = await renderSettingsPage({ authenticated: false, cloudMode: false });
    await settleInitialEffects(screen);

    await act(async () => {
      await latestSettingsPageContentProps?.onCloudModeToggle(true);
    });

    expect(await screen.findByTestId('settings-login-dialog')).toBeTruthy();

    await act(async () => {
      await triggerLatestLoginSuccess();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('settings-login-dialog')).toBeNull();
    });

    expect(mocks.settings.setCloudMode).toHaveBeenCalledWith('switching');
  });
});
