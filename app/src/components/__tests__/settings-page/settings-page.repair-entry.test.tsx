import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import {
  renderSettingsPage,
  resetRenderSettingsPageMocks,
} from '../helpers/renderSettingsPage';

describe('SettingsPage repair entry', () => {
  beforeEach(() => {
    resetRenderSettingsPageMocks();
  });

  it('does not render the E2E sync lab section when the env flag is disabled', () => {
    const { screen } = renderSettingsPage({ e2eSyncLab: false });

    expect(screen.queryByTestId('e2e-sync-lab-root')).toBeNull();
  });

  it('injects the suspect + repairable fixture from the dedicated lab entry', async () => {
    const { screen, mocks } = renderSettingsPage({ e2eSyncLab: true });

    fireEvent.press(await screen.findByTestId('e2e-sync-fixture-suspect'));

    expect(mocks.injectSuspectRepairable).toHaveBeenCalledTimes(1);
  });

  it('injects the repair-pending fixture from the dedicated lab entry', async () => {
    const { screen, mocks } = renderSettingsPage({ e2eSyncLab: true });

    fireEvent.press(await screen.findByTestId('e2e-sync-fixture-repair-pending'));

    expect(mocks.injectRepairPending).toHaveBeenCalledTimes(1);
  });

  it('reopens the repair prompt from the dedicated repair entry', async () => {
    const { screen, mocks } = renderSettingsPage({ e2eSyncLab: true });

    fireEvent.press(await screen.findByTestId('e2e-sync-show-repair-prompt'));

    expect(mocks.showSyncRepairPrompt).toHaveBeenCalledTimes(1);
  });

  it('injects the text detail fixture from the dedicated lab entry', async () => {
    const { screen, mocks } = renderSettingsPage({ e2eSyncLab: true });

    fireEvent.press(await screen.findByTestId('e2e-sync-fixture-text-detail'));

    expect(mocks.injectTextDetailFixture).toHaveBeenCalledTimes(1);
  });

  it('clears injected sync fixtures from the dedicated lab entry', async () => {
    const { screen, mocks } = renderSettingsPage({ e2eSyncLab: true });

    fireEvent.press(await screen.findByTestId('e2e-sync-fixture-clear'));

    expect(mocks.clearSyncFixtures).toHaveBeenCalledTimes(1);
  });

  it('clears the E2E lab env flag during helper reset', () => {
    renderSettingsPage({ e2eSyncLab: true });

    expect(process.env.EXPO_PUBLIC_E2E_SYNC_LAB).toBe('1');

    resetRenderSettingsPageMocks();

    expect(process.env.EXPO_PUBLIC_E2E_SYNC_LAB).toBeUndefined();
  });
});
