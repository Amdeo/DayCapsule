import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import {
  renderSettingsPage,
  resetRenderSettingsPageMocks,
} from '../helpers/renderSettingsPage';

describe('SettingsPage repair entry', () => {
  beforeEach(() => {
    resetRenderSettingsPageMocks();
  });

  it('reopens the repair prompt from the dedicated repair entry', async () => {
    const { screen, mocks } = renderSettingsPage({ e2eSyncLab: true });

    fireEvent.press(await screen.findByTestId('e2e-sync-show-repair-prompt'));

    expect(mocks.showSyncRepairPrompt).toHaveBeenCalledTimes(1);
  });
});
