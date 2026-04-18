import { create } from 'zustand';

type TransientFeedbackState = {
  currentMessage: string | null;
  sequence: number;
  show: (message: string) => void;
  dismiss: () => void;
};

export const useTransientFeedbackStore = create<TransientFeedbackState>((set) => ({
  currentMessage: null,
  sequence: 0,
  show: (message) =>
    set((state) => ({
      currentMessage: message,
      sequence: state.sequence + 1,
    })),
  dismiss: () =>
    set({
      currentMessage: null,
    }),
}));
