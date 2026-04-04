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
    expect(within(profileCard).getByText('未登录时仅显示本地数据')).toBeTruthy();
    expect(screen.getByText('登录后可同步账号数据')).toBeTruthy();
  });

  it('shows account-scope copy while authenticated', async () => {
    const { screen } = await renderSettingsPage({ authenticated: true });

    await waitFor(() => {
      expect(screen.getAllByText('tester@example.com').length).toBeGreaterThan(0);
    });

    const profileCard = screen.getByTestId('settings-profile-card');
    expect(within(profileCard).getByText('账号同步（本地优先）')).toBeTruthy();
    expect(screen.getByText('账号同步')).toBeTruthy();
    expect(screen.getByText('已启用，本地优先写入并在稍后同步')).toBeTruthy();
  });
});
