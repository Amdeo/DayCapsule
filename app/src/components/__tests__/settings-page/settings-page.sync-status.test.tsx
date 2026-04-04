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

  it('renders the sync status entry for authenticated users', async () => {
    const { screen } = await renderSettingsPage({ authenticated: true });

    expect(await screen.findByTestId('settings-show-sync-status')).toBeTruthy();
  });

  it('opens sync status from the page action', async () => {
    const { screen, mocks } = await renderSettingsPage({ authenticated: true });

    fireEvent.press(await screen.findByTestId('settings-show-sync-status'));

    await waitFor(() => {
      expect(mocks.showCloudSyncMonitor).toHaveBeenCalledTimes(1);
    });
  });
});
