import { create } from 'zustand';

type TransientFeedbackState = {
  currentMessage: string | null;
  sequence: number;
  show: (message: string) => void;
  dismiss: (expectedSequence?: number) => void;
};

export const useTransientFeedbackStore = create<TransientFeedbackState>((set, get) => ({
  currentMessage: null,
  sequence: 0,
  show: (message) =>
    set((state) => ({
      currentMessage: message,
      sequence: state.sequence + 1,
    })),
  dismiss: (expectedSequence) => {
    if (expectedSequence != null && get().sequence !== expectedSequence) {
      return;
    }

    set({
      currentMessage: null,
    });
  },
}));
