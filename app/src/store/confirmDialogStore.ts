import { create } from 'zustand';

export type ConfirmDialogAction = {
  label: string;
  role: 'primary' | 'secondary' | 'danger';
  onPress?: () => void | Promise<void>;
  testID?: string;
};

export type ConfirmDialogRequest = {
  title: string;
  message?: string;
  dedupeKey?: string;
  dismissible?: boolean;
  actions: ConfirmDialogAction[];
};

type ConfirmDialogState = {
  current: ConfirmDialogRequest | null;
  activeDedupeKey: string | null;
  show: (request: ConfirmDialogRequest) => boolean;
  dismiss: () => void;
};

export const useConfirmDialogStore = create<ConfirmDialogState>((set, get) => ({
  current: null,
  activeDedupeKey: null,

  show: (request) => {
    const nextDedupeKey = request.dedupeKey ?? null;
    const { current, activeDedupeKey } = get();

    if (current) {
      if (nextDedupeKey && activeDedupeKey === nextDedupeKey) {
        return false;
      }

      return false;
    }

    set({
      current: request,
      activeDedupeKey: nextDedupeKey,
    });

    return true;
  },

  dismiss: () => {
    set({
      current: null,
      activeDedupeKey: null,
    });
  },
}));
