import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  renderSettingsPage,
  resetRenderSettingsPageMocks,
} from '../helpers/renderSettingsPage';

describe('SettingsPage sync status', () => {
  beforeEach(() => {
    resetRenderSettingsPageMocks();
  });

  it('does not render the sync status entry when the user is unauthenticated', async () => {
    const { screen } = await renderSettingsPage({ authenticated: false });

    expect(screen.queryByTestId('settings-show-sync-status')).toBeNull();
  });

  it('does not trigger sync status actions when the user is unauthenticated', async () => {
    const { screen, mocks } = await renderSettingsPage({ authenticated: false });

    expect(screen.queryByTestId('settings-show-sync-status')).toBeNull();
    expect(mocks.showCloudSyncMonitor).not.toHaveBeenCalled();
  });

  it('does not render the sync status entry when authenticated without cloud protection', async () => {
    const { screen } = await renderSettingsPage({
      authenticated: true,
      cloudProtectionEnabled: false,
    });

    expect(screen.queryByTestId('settings-show-sync-status')).toBeNull();
  });

  it('renders the sync status entry for authenticated users with cloud protection enabled', async () => {
    const { screen } = await renderSettingsPage({
      authenticated: true,
      cloudProtectionEnabled: true,
    });

    expect(await screen.findByTestId('settings-show-sync-status')).toBeTruthy();
  });

  it('opens sync status from the page action when cloud protection is enabled', async () => {
    const { screen, mocks } = await renderSettingsPage({
      authenticated: true,
      cloudProtectionEnabled: true,
    });

    fireEvent.press(await screen.findByTestId('settings-show-sync-status'));

    await waitFor(() => {
      expect(mocks.showCloudSyncMonitor).toHaveBeenCalledTimes(1);
    });
  });
});
