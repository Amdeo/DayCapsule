import React from 'react';
import { waitFor } from '@testing-library/react-native';
import {
  renderSettingsPage,
  resetRenderSettingsPageMocks,
} from '../helpers/renderSettingsPage';

describe('SettingsPage preferences', () => {
  beforeEach(() => {
    resetRenderSettingsPageMocks();
  });

  it('does not render the auto backup preference toggle', async () => {
    const { screen } = await renderSettingsPage();

    await waitFor(() => {
      expect(screen.queryByText('自动备份')).toBeNull();
      expect(screen.queryByTestId('settings-switch-auto-backup')).toBeNull();
    });
  });
});
