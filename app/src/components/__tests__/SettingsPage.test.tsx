import React from 'react';
import { Alert, Switch } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import {
  renderSettingsPage,
  resetRenderSettingsPageMocks,
} from './helpers/renderSettingsPage';
import * as DB from '@/src/database/operations';

describe('SettingsPage assembly', () => {
  beforeEach(() => {
    resetRenderSettingsPageMocks();
  });

  it('renders the core settings sections and shared entry points', async () => {
    const { screen } = renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByText('< 0.1 MB')).toBeTruthy();
    });

    expect(screen.getByTestId('settings-page-root')).toBeTruthy();
    expect(screen.getByTestId('settings-backend-card')).toBeTruthy();
    expect(screen.getByText('账户')).toBeTruthy();
    expect(screen.getByText('登录 / 注册')).toBeTruthy();
    expect(screen.getByText('日历内容区密度')).toBeTruthy();
    expect(screen.getByText('预制标签管理')).toBeTruthy();
  });

  it('opens the tag management dialog from the shared settings entry', async () => {
    const { screen } = renderSettingsPage();

    fireEvent.press(screen.getByTestId('settings-open-tag-management'));

    expect(await screen.findByTestId('settings-tag-management-dialog')).toBeTruthy();
  });

  it('opens the login dialog when unauthenticated users tap login', async () => {
    const { screen } = renderSettingsPage();

    fireEvent.press(screen.getByText('登录 / 注册'));

    expect(await screen.findByTestId('settings-login-dialog')).toBeTruthy();
  });

  it('keeps local entries when cloud is empty and user switches back to local mode', async () => {
    jest.spyOn(DB, 'getEntriesCount').mockResolvedValueOnce(3);

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { screen, mocks } = renderSettingsPage({
      cloudMode: true,
      authenticated: true,
      userEmail: 'mobile3@test.com',
    });
    mocks.apiClient.get.mockResolvedValueOnce({ entryCount: 0 });

    const switches = await waitFor(() => screen.UNSAFE_getAllByType(Switch));
    fireEvent(switches[0], 'valueChange', false);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        '切换到离线模式',
        expect.stringContaining('云端当前为空'),
        expect.any(Array),
      );
    });

    const actions = alertSpy.mock.calls[0][2] as Array<{ text?: string; onPress?: () => void }>;
    const keepLocal = actions.find((action) => action.text === '保留本地并切回离线');
    const cloudToLocal = actions.find((action) => action.text === '云端 → 本地');

    expect(keepLocal).toBeTruthy();
    expect(cloudToLocal).toBeUndefined();

    await act(async () => {
      await keepLocal?.onPress?.();
    });

    expect(mocks.settings.setCloudMode).toHaveBeenCalledWith(false);
  });

  it('clears local app data when the user confirms clear cache', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { screen, mocks } = renderSettingsPage();

    fireEvent.press(await screen.findByText('清除缓存'));

    const confirmActions = alertSpy.mock.calls[0][2] as Array<{ text?: string; onPress?: () => void }>;
    const confirmAction = confirmActions.find((action) => action.text === '清除');

    expect(confirmAction).toBeTruthy();

    await act(async () => {
      await confirmAction?.onPress?.();
    });

    await waitFor(() => {
      expect(mocks.clearLocalAppData).toHaveBeenCalledTimes(1);
      expect(mocks.entries.loadEntries).toHaveBeenCalledTimes(1);
    });

    expect(alertSpy).toHaveBeenCalledWith('成功', '本地数据已清除');
  });
});
