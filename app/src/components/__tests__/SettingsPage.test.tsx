import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  renderSettingsPage,
  resetRenderSettingsPageMocks,
} from './helpers/renderSettingsPage';

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
});
