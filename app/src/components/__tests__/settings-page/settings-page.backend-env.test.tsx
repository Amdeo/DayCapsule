import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  renderSettingsPage,
  resetRenderSettingsPageMocks,
} from '../helpers/renderSettingsPage';

describe('SettingsPage backend environment', () => {
  beforeEach(() => {
    resetRenderSettingsPageMocks();
  });

  it('keeps the previous backend environment when switching fails', async () => {
    const { screen, mocks } = renderSettingsPage();
    mocks.switchBackendEnvironment.mockRejectedValueOnce(new Error('timeout'));

    const input = await screen.findByDisplayValue('https://server-a.example.com');
    fireEvent.changeText(input, 'https://server-c.example.com');
    fireEvent.press(screen.getByTestId('settings-backend-test-button'));

    await waitFor(() => {
      expect(screen.getByText('连接成功')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('settings-backend-save-button'));

    await waitFor(() => {
      expect(mocks.switchBackendEnvironment).toHaveBeenCalledWith('https://server-c.example.com');
    });

    expect(screen.getByText('当前生效地址：https://server-a.example.com')).toBeTruthy();
  });
});
