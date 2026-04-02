import { useConfirmDialogStore, type ConfirmDialogRequest } from '@/src/store/confirmDialogStore';

export function showConfirmDialog(request: ConfirmDialogRequest): boolean {
  return useConfirmDialogStore.getState().show(request);
}
