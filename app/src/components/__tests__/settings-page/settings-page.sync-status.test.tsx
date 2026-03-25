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

  it('renders sync summary counts when opening sync status', async () => {
    const { screen, mocks } = renderSettingsPage({
      cloudMode: true,
      authenticated: true,
    });

    fireEvent.press(await screen.findByTestId('settings-show-sync-status'));

    await waitFor(() => {
      expect(mocks.showCloudSyncStatusAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          pendingEntries: 2,
          failedEntries: 1,
        })
      );
    });
  });
});
