export type DialogOverlayClassification =
  | 'global-overlay'
  | 'page-local-overlay'
  | 'native-alert-to-migrate'
  | 'native-alert-keep';

export type DialogOverlayInventoryItem = {
  id: string;
  classification: DialogOverlayClassification;
};

export const DIALOG_OVERLAY_INVENTORY: DialogOverlayInventoryItem[] = [
  { id: 'feedback', classification: 'global-overlay' },
  { id: 'confirm-dialog', classification: 'global-overlay' },
  { id: 'cloud-sync-monitor', classification: 'global-overlay' },
  { id: 'photo-repair-prompt', classification: 'native-alert-to-migrate' },
  { id: 'login-page', classification: 'page-local-overlay' },
  { id: 'help-page', classification: 'page-local-overlay' },
  { id: 'about-page', classification: 'page-local-overlay' },
  { id: 'tag-management-page', classification: 'page-local-overlay' },
];

export function getGlobalOverlayIds(): string[] {
  return DIALOG_OVERLAY_INVENTORY.filter(
    (item) => item.classification === 'global-overlay'
  ).map((item) => item.id);
}

export function getNativeAlertsToMigrate(): string[] {
  return DIALOG_OVERLAY_INVENTORY.filter(
    (item) => item.classification === 'native-alert-to-migrate'
  ).map((item) => item.id);
}
