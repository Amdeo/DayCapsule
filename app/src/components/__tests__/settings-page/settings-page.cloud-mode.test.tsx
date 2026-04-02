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

  it('keeps local entries when cloud is empty and user switches back to local mode', async () => {
    const DB = require('@/src/database/operations');
    jest.spyOn(DB, 'getEntriesCount').mockResolvedValueOnce(3);

    const { screen, mocks } = await renderSettingsPage({
      cloudMode: true,
      authenticated: true,
      userEmail: 'mobile3@test.com',
    });
    mocks.apiClient.get.mockResolvedValueOnce({ entryCount: 0 });

    const cloudModeSwitch = await screen.findByTestId('settings-switch-cloud-mode');
    fireEvent(cloudModeSwitch, 'valueChange', false);

    await waitFor(() => {
      expect(mocks.showConfirmDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '切换到离线模式',
          message: expect.stringContaining('云端当前为空'),
        }),
      );
    });

    const actions = mocks.showConfirmDialog.mock.calls[0][0].actions as Array<{ label?: string; onPress?: () => void }>;
    const keepLocal = actions.find((action) => action.label === '保留本地并切回离线');
    const cloudToLocal = actions.find((action) => action.label === '云端 → 本地');

    expect(keepLocal).toBeTruthy();
    expect(cloudToLocal).toBeUndefined();

    await act(async () => {
      await keepLocal?.onPress?.();
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
