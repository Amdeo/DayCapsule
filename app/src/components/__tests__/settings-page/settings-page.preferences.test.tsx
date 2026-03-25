import React from 'react';
import { Switch } from 'react-native';
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
    const { screen, unmount } = renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByText('自动备份')).toBeTruthy();
    });

    const switches = screen.UNSAFE_getAllByType(Switch);
    fireEvent(switches[1], 'valueChange', true);
    unmount();

    const reopened = renderSettingsPage();

    await waitFor(() => {
      expect(reopened.screen.UNSAFE_getAllByType(Switch)[1].props.value).toBe(true);
    });
  });
});
