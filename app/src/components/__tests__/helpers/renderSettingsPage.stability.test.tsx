import React from 'react';
import { act } from '@testing-library/react-native';
import {
  renderSettingsPage,
  resetRenderSettingsPageMocks,
} from './renderSettingsPage';

describe('renderSettingsPage stability', () => {
  beforeEach(() => {
    resetRenderSettingsPageMocks();
  });

  it('does not emit act warnings after the initial settings page render settles', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await renderSettingsPage({ authenticated: true, cloudMode: true });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const actWarnings = consoleErrorSpy.mock.calls
      .map((args) => args.map(String).join(' '))
      .filter((message) => message.includes('not wrapped in act'));

    expect(actWarnings).toHaveLength(0);

    consoleErrorSpy.mockRestore();
  });
});
