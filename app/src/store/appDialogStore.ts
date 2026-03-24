import { create } from 'zustand';

export type AppDialogAction = {
  label: string;
  role: 'primary' | 'secondary' | 'destructive';
  onPress?: () => void | Promise<void>;
  closeOnPress?: boolean;
  disabled?: boolean;
};

export type AppDialogDetail = {
  label: string;
  value: string;
};

export type AppDialogRequest = {
  title: string;
  message?: string;
  details?: AppDialogDetail[];
  tone?: 'neutral' | 'accent' | 'success' | 'error';
  blocking?: boolean;
  dedupeKey?: string;
  actions: AppDialogAction[];
};

type AppDialogState = {
  current: AppDialogRequest | null;
  activeDedupeKey: string | null;
  show: (request: AppDialogRequest) => void;
  dismiss: () => void;
};

export const useAppDialogStore = create<AppDialogState>((set, get) => ({
  current: null,
  activeDedupeKey: null,

  show: (request) => {
    const nextDedupeKey = request.dedupeKey ?? null;
    const { current, activeDedupeKey } = get();

    if (current && nextDedupeKey && activeDedupeKey === nextDedupeKey) {
      return;
    }

    set({
      current: request,
      activeDedupeKey: nextDedupeKey,
    });
  },

  dismiss: () => {
    set({
      current: null,
      activeDedupeKey: null,
    });
  },
}));
