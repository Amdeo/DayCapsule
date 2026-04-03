import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import {
  renderSettingsPage,
  resetRenderSettingsPageMocks,
} from '../helpers/renderSettingsPage';

describe('SettingsPage cloud mode', () => {
  beforeEach(() => {
    resetRenderSettingsPageMocks();
  });

  it('keeps local mode when enabling cloud mode fails', async () => {
    const { screen, mocks } = await renderSettingsPage({
      authenticated: true,
      cloudMode: false,
    });

    mocks.syncBootstrap.inspectInitialState.mockRejectedValueOnce(new Error('network down'));

    await waitFor(() => {
      expect(screen.getAllByText('tester@example.com').length).toBeGreaterThan(0);
    });

    fireEvent(screen.getByTestId('settings-switch-cloud-mode'), 'valueChange', true);

    await waitFor(() => {
      expect(mocks.showErrorFeedback).toHaveBeenCalled();
    });

    expect(screen.getAllByText('数据存储在本地').length).toBeGreaterThan(0);
  });

  it('shows simple confirmation dialog when disabling cloud mode', async () => {
    const { screen, mocks } = await renderSettingsPage({
      cloudMode: true,
      authenticated: true,
      userEmail: 'mobile3@test.com',
    });

    const cloudModeSwitch = await screen.findByTestId('settings-switch-cloud-mode');
    fireEvent(cloudModeSwitch, 'valueChange', false);

    await waitFor(() => {
      expect(mocks.showConfirmDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '切换到离线模式',
          message: '本地数据将保留，云端数据不受影响。是否继续？',
        }),
      );
    });

    // 不应发起任何 API 请求
    expect(mocks.apiClient.get).not.toHaveBeenCalled();

    const actions = mocks.showConfirmDialog.mock.calls[0][0].actions as Array<{
      label?: string;
      onPress?: () => void;
    }>;
    const confirmAction = actions.find((a) => a.label === '切换到离线');
    expect(confirmAction).toBeTruthy();

    await act(async () => {
      await confirmAction?.onPress?.();
    });

    expect(mocks.settings.setCloudMode).toHaveBeenCalledWith(false);
  });

  it('shows branded feedback when enabling cloud mode succeeds but the initial sync refresh fails', async () => {
    const { screen, mocks } = await renderSettingsPage({
      authenticated: true,
      cloudMode: false,
    });

    mocks.cloudSync.syncNow.mockRejectedValueOnce(new Error('sync refresh failed'));

    await waitFor(() => {
      expect(screen.getAllByText('tester@example.com').length).toBeGreaterThan(0);
    });

    fireEvent(screen.getByTestId('settings-switch-cloud-mode'), 'valueChange', true);

    await waitFor(() => {
      expect(mocks.settings.setCloudMode).toHaveBeenCalledWith(true);
    });

    await waitFor(() => {
      expect(mocks.showErrorFeedback).toHaveBeenCalledWith(expect.objectContaining({
        title: '同步未完成',
        message: '云同步已开启，但首次同步失败，请稍后重试。',
      }));
    });
  });
});
