import {
  DIALOG_OVERLAY_INVENTORY,
  getGlobalOverlayIds,
  getNativeAlertsToMigrate,
} from '../dialogOverlayInventory';

describe('dialogOverlayInventory', () => {
  it('returns the global overlay ids in inventory order', () => {
    expect(getGlobalOverlayIds()).toEqual([
      'feedback',
      'confirm-dialog',
      'cloud-sync-monitor',
    ]);
  });

  it('returns the native alerts to migrate', () => {
    expect(getNativeAlertsToMigrate()).toEqual(['photo-repair-prompt']);
  });

  it('marks login-page as a page-local overlay', () => {
    const loginPage = DIALOG_OVERLAY_INVENTORY.find((item) => item.id === 'login-page');

    expect(loginPage).toBeDefined();
    expect(loginPage?.classification).toBe('page-local-overlay');
  });
});
