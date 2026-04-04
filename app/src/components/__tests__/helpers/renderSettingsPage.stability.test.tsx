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

  it('waits for the initial storage value before settling without act warnings', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    let resolveStorageStats: ((value: { totalSize: number }) => void) | null = null;
    getStorageStats.mockImplementationOnce(() => new Promise((resolve) => {
      resolveStorageStats = resolve;
    }));

    try {
      const renderPromise = renderSettingsPage({
        authenticated: true,
        sessionScopeKey: 'account:user-1',
      });
      const settleState = await Promise.race([
        renderPromise.then(() => 'resolved' as const),
        new Promise<'timeout'>((resolve) => {
          setTimeout(() => resolve('timeout'), 100);
        }),
      ]);

      expect(settleState).toBe('timeout');

      resolveStorageStats?.({ totalSize: 1024 });

      const { screen } = await renderPromise;

      expect(screen.getByText('< 0.1 MB')).toBeTruthy();

      const actWarnings = consoleErrorSpy.mock.calls
        .map((args) => args.map(String).join(' '))
        .filter((message) => message.includes('not wrapped in act'));

      expect(actWarnings).toHaveLength(0);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('starts each render with the login flow closed, then allows it to open again', async () => {
    const firstRender = await renderSettingsPage({ authenticated: false });

    fireEvent.press(firstRender.screen.getByTestId('settings-open-login'));
    expect(await firstRender.screen.findByTestId('settings-login-dialog')).toBeTruthy();
    expect(getLatestLoginPageProps()).not.toBeNull();

    firstRender.unmount();

    const secondRender = await renderSettingsPage({ authenticated: false });

    expect(secondRender.screen.queryByTestId('settings-login-dialog')).toBeNull();
    expect(getLatestLoginPageProps()).toBeNull();

    fireEvent.press(secondRender.screen.getByTestId('settings-open-login'));
    expect(await secondRender.screen.findByTestId('settings-login-dialog')).toBeTruthy();
  });
});
