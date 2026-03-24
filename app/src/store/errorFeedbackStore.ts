import { create } from 'zustand';

export type ErrorFeedbackAction = {
  label: string;
  role: 'primary' | 'secondary';
  onPress?: () => void | Promise<void>;
};

export type ErrorFeedbackDetail = {
  label: string;
  value: string;
};

export type ErrorFeedbackRequest = {
  title: string;
  message?: string;
  details?: ErrorFeedbackDetail[];
  tone?: 'error' | 'accent';
  dedupeKey?: string;
  actions: ErrorFeedbackAction[];
};

type ErrorFeedbackState = {
  current: ErrorFeedbackRequest | null;
  activeDedupeKey: string | null;
  show: (request: ErrorFeedbackRequest) => void;
  dismiss: () => void;
};

export const useErrorFeedbackStore = create<ErrorFeedbackState>((set, get) => ({
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
