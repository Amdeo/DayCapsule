import React from 'react';
import { waitFor, within } from '@testing-library/react-native';
import {
  renderSettingsPage,
  resetRenderSettingsPageMocks,
} from '../helpers/renderSettingsPage';

describe('SettingsPage account session copy', () => {
  beforeEach(() => {
    resetRenderSettingsPageMocks();
  });

  it('shows local-only copy while unauthenticated', async () => {
    const { screen } = await renderSettingsPage({ authenticated: false });

    const profileCard = await screen.findByTestId('settings-profile-card');
    expect(within(profileCard).getByText('本地优先，当前数据仅保存在本机')).toBeTruthy();
    expect(screen.getByText('登录 / 注册')).toBeTruthy();
  });

  it('shows local-device-only copy while authenticated without cloud protection', async () => {
    const { screen } = await renderSettingsPage({ authenticated: true });

    await waitFor(() => {
      expect(screen.getAllByText('tester@example.com').length).toBeGreaterThan(0);
    });

    const profileCard = screen.getByTestId('settings-profile-card');
    expect(within(profileCard).getByText('当前数据仍仅保存在本机')).toBeTruthy();
    expect(screen.getByText('开启云同步')).toBeTruthy();
    expect(screen.queryByTestId('settings-show-sync-status')).toBeNull();
  });

  it('shows protected-cloud copy while cloud protection is enabled', async () => {
    const { screen } = await renderSettingsPage({
      authenticated: true,
      cloudProtectionEnabled: true,
    });

    await waitFor(() => {
      expect(screen.getAllByText('tester@example.com').length).toBeGreaterThan(0);
    });

    const profileCard = screen.getByTestId('settings-profile-card');
    expect(within(profileCard).getByText('云端已保护当前记忆')).toBeTruthy();
    expect(screen.getByTestId('settings-show-sync-status')).toBeTruthy();
  });
});
