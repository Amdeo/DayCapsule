import React from 'react';
import { render } from '@testing-library/react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  renderSettingsPage,
  resetRenderSettingsPageMocks,
} from '../helpers/renderSettingsPage';

describe('SettingsPage backend environment', () => {
  beforeEach(() => {
    resetRenderSettingsPageMocks();
  });

  it('resets backend test state after editing the draft url again', async () => {
    const { screen, mocks } = await renderSettingsPage();

    // Expand advanced section
    fireEvent.press(screen.getByTestId('settings-advanced-toggle'));

    const input = await screen.findByDisplayValue('https://server-a.example.com');
    fireEvent.changeText(input, 'https://server-c.example.com');
    fireEvent.press(screen.getByTestId('settings-backend-test-button'));

    await waitFor(() => {
      expect(screen.getByText('连接成功')).toBeTruthy();
    });

    expect(screen.getByTestId('settings-backend-save-button').props.accessibilityState.disabled).toBe(false);

    fireEvent.changeText(input, 'https://server-d.example.com');

    expect(screen.getByText('请先测试连接，再保存并切换')).toBeTruthy();
    expect(screen.getByTestId('settings-backend-save-button').props.accessibilityState.disabled).toBe(true);

    fireEvent.press(screen.getByTestId('settings-backend-save-button'));

    expect(mocks.switchBackendEnvironment).not.toHaveBeenCalled();
  });

  it('loads backend state only after settings becomes visible', async () => {
    const backendEnvironmentService = jest.requireMock('@/src/services/backendEnvironmentService') as {
      getCurrentServerUrl: jest.Mock;
      getRecentServerUrls: jest.Mock;
    };
    const { SettingsPage } = require('../../SettingsPage');
    const onClose = jest.fn();
    const rendered = render(<SettingsPage visible={false} onClose={onClose} />);

    expect(backendEnvironmentService.getCurrentServerUrl).not.toHaveBeenCalled();
    expect(backendEnvironmentService.getRecentServerUrls).not.toHaveBeenCalled();

    rendered.rerender(<SettingsPage visible onClose={onClose} />);

    await waitFor(() => {
      expect(backendEnvironmentService.getCurrentServerUrl).toHaveBeenCalledTimes(1);
      expect(backendEnvironmentService.getRecentServerUrls).toHaveBeenCalledTimes(1);
    });

    // Expand advanced section to see the input
    fireEvent.press(rendered.getByTestId('settings-advanced-toggle'));

    expect(await rendered.findByDisplayValue('https://server-a.example.com')).toBeTruthy();
  });

  it('keeps the previous backend environment when switching fails', async () => {
    const { screen, mocks } = await renderSettingsPage();
    mocks.switchBackendEnvironment.mockRejectedValueOnce(new Error('timeout'));

    // Expand advanced section
    fireEvent.press(screen.getByTestId('settings-advanced-toggle'));

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
