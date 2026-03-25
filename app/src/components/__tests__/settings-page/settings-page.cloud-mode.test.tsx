import React from 'react';
import { Switch } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  renderSettingsPage,
  resetRenderSettingsPageMocks,
} from '../helpers/renderSettingsPage';

describe('SettingsPage cloud mode', () => {
  beforeEach(() => {
    resetRenderSettingsPageMocks();
  });

  it('keeps local mode when enabling cloud mode fails', async () => {
    const { screen, mocks } = renderSettingsPage({
      authenticated: true,
      cloudMode: false,
    });

    mocks.syncBootstrap.inspectInitialState.mockRejectedValueOnce(new Error('network down'));

    await waitFor(() => {
      expect(screen.getByText('tester@example.com')).toBeTruthy();
    });

    const switches = screen.UNSAFE_getAllByType(Switch);
    fireEvent(switches[0], 'valueChange', true);

    await waitFor(() => {
      expect(mocks.showErrorFeedback).toHaveBeenCalled();
    });

    expect(screen.getByText('数据存储在本地')).toBeTruthy();
  });
});
