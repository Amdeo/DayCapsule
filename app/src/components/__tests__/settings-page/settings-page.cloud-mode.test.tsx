import React from 'react';
import { Alert, Switch } from 'react-native';
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
    const { screen, mocks } = renderSettingsPage({
      authenticated: true,
      cloudMode: false,
    });

    mocks.syncBootstrap.inspectInitialState.mockRejectedValueOnce(new Error('network down'));

    await waitFor(() => {
      expect(screen.getByText('tester@example.com')).toBeTruthy();
    });

    const switches = screen.UNSAFE_getAllByType(Switch);
    fireEvent(switches[0], 'valueChange', true);

    await waitFor(() => {
      expect(mocks.showErrorFeedback).toHaveBeenCalled();
    });

    expect(screen.getByText('数据存储在本地')).toBeTruthy();
  });

  it('keeps local entries when cloud is empty and user switches back to local mode', async () => {
    const DB = require('@/src/database/operations');
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
});
