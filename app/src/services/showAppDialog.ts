import { useAppDialogStore, type AppDialogRequest } from '@/src/store/appDialogStore';

export function showAppDialog(request: AppDialogRequest): void {
  useAppDialogStore.getState().show(request);
}
