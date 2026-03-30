import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { within } from '@testing-library/react-native';
import {
  getLatestLoginPageProps,
  renderSettingsPage,
  resetRenderSettingsPageMocks,
} from './renderSettingsPage';

const { getStorageStats } = require('@/src/utils/fileSystem');

describe('renderSettingsPage stability', () => {
  beforeEach(() => {
    resetRenderSettingsPageMocks();
  });

  it('does not emit act warnings after the initial settings page render settles', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    let resolveStorageStats: ((value: { totalSize: number }) => void) | null = null;
    getStorageStats.mockImplementationOnce(() => new Promise((resolve) => {
      resolveStorageStats = resolve;
    }));

    try {
      const renderPromise = renderSettingsPage({ authenticated: true, cloudMode: true });
      const settleState = await Promise.race([
        renderPromise.then(() => 'resolved' as const),
        new Promise<'timeout'>((resolve) => {
          setTimeout(() => resolve('timeout'), 100);
        }),
      ]);

      // The legacy helper used a fixed flush loop and returned early while
      // storage stats were still pending. The current helper must keep waiting.
      expect(settleState).toBe('timeout');

      resolveStorageStats?.({ totalSize: 1024 });

      const { screen } = await renderPromise;

      expect(within(screen.getByTestId('settings-storage-card')).getByText('< 0.1 MB')).toBeTruthy();

      const actWarnings = consoleErrorSpy.mock.calls
        .map((args) => args.map(String).join(' '))
        .filter((message) => message.includes('not wrapped in act'));

      expect(actWarnings).toHaveLength(0);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('re-initializes the captured login props for each render', async () => {
    const firstRender = await renderSettingsPage({ authenticated: false });

    fireEvent.press(firstRender.screen.getByTestId('settings-open-login'));
    expect(await firstRender.screen.findByTestId('settings-login-dialog')).toBeTruthy();
    expect(getLatestLoginPageProps()?.visible).toBe(true);

    firstRender.unmount();

    await renderSettingsPage({ authenticated: true });

    expect(getLatestLoginPageProps()).toBeNull();
  });
});
