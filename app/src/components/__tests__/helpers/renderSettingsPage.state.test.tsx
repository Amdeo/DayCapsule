import React from 'react';
import {
  renderSettingsPage,
  resetRenderSettingsPageMocks,
} from './renderSettingsPage';

describe('renderSettingsPage session state isolation', () => {
  beforeEach(() => {
    resetRenderSettingsPageMocks();
  });

  it('does not let one render session override become the next render baseline', async () => {
    const firstRender = await renderSettingsPage({
      authenticated: true,
      sessionScopeKey: 'account:user-1',
      sessionTransitioning: true,
    });

    expect(firstRender.screen.getByTestId('settings-page-root')).toBeTruthy();

    firstRender.unmount();

    const secondRender = await renderSettingsPage({ authenticated: true });

    expect(secondRender.screen.getByTestId('settings-page-root')).toBeTruthy();
  });
});
