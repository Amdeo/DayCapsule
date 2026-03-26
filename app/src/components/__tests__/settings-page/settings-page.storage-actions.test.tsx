import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import {
  renderSettingsPage,
  resetRenderSettingsPageMocks,
} from '../helpers/renderSettingsPage';

describe('SettingsPage storage actions', () => {
  beforeEach(() => {
    resetRenderSettingsPageMocks();
  });

  it('clears local app data when the user confirms clear cache', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { screen, mocks } = await renderSettingsPage();

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
