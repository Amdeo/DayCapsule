import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  renderSettingsPage,
  resetRenderSettingsPageMocks,
} from '../helpers/renderSettingsPage';

describe('SettingsPage preferences', () => {
  beforeEach(() => {
    resetRenderSettingsPageMocks();
  });

  it('persists local preference toggles and restores them on re-open', async () => {
    const { screen, unmount } = await renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByText('自动备份')).toBeTruthy();
    });

    fireEvent(screen.getByTestId('settings-switch-auto-backup'), 'valueChange', true);
    unmount();

    const reopened = await renderSettingsPage();

    await waitFor(() => {
      expect(reopened.screen.getByTestId('settings-switch-auto-backup').props.value).toBe(true);
    });
  });
});
