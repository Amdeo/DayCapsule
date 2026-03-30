import React from 'react';
import {
  renderSettingsPage,
  resetRenderSettingsPageMocks,
} from './renderSettingsPage';

describe('renderSettingsPage persisted settings state', () => {
  beforeEach(() => {
    resetRenderSettingsPageMocks();
  });

  it('does not let one render cloudMode override become the next render baseline', async () => {
    const firstRender = await renderSettingsPage({ authenticated: true, cloudMode: true });

    expect(firstRender.mocks.settings.cloudMode).toBe(true);

    firstRender.unmount();

    const secondRender = await renderSettingsPage({ authenticated: true });

    expect(secondRender.mocks.settings.cloudMode).toBe(false);
  });
});
