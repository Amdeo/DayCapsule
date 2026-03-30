import React from 'react';
import { within } from '@testing-library/react-native';
import {
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

    const renderPromise = renderSettingsPage({ authenticated: true, cloudMode: true });
    let renderResult:
      | Awaited<ReturnType<typeof renderSettingsPage>>
      | null = null;
    void renderPromise.then((value) => {
      renderResult = value;
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(renderResult).toBeNull();

    resolveStorageStats?.({ totalSize: 1024 });

    const { screen } = await renderPromise;

    expect(within(screen.getByTestId('settings-storage-card')).getByText('< 0.1 MB')).toBeTruthy();

    const actWarnings = consoleErrorSpy.mock.calls
      .map((args) => args.map(String).join(' '))
      .filter((message) => message.includes('not wrapped in act'));

    expect(actWarnings).toHaveLength(0);

    consoleErrorSpy.mockRestore();
  });
});
