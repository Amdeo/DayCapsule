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

  it('opens sync status from the page action', async () => {
    const { screen, mocks } = renderSettingsPage({
      cloudMode: true,
      authenticated: true,
    });

    fireEvent.press(await screen.findByTestId('settings-show-sync-status'));

    await waitFor(() => {
      expect(mocks.showCloudSyncStatusAlert).toHaveBeenCalledTimes(1);
    });
  });
});
