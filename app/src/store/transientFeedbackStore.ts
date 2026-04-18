import { create } from 'zustand';

export type TransientFeedbackAnchorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TransientFeedbackState = {
  currentMessage: string | null;
  anchorRect: TransientFeedbackAnchorRect | null;
  sequence: number;
  show: (message: string, anchorRect?: TransientFeedbackAnchorRect | null) => void;
  dismiss: (expectedSequence?: number) => void;
};

export const useTransientFeedbackStore = create<TransientFeedbackState>((set, get) => ({
  currentMessage: null,
  anchorRect: null,
  sequence: 0,
  show: (message, anchorRect = null) =>
    set((state) => ({
      currentMessage: message,
      anchorRect,
      sequence: state.sequence + 1,
    })),
  dismiss: (expectedSequence) => {
    if (expectedSequence != null && get().sequence !== expectedSequence) {
      return;
    }

    set({
      currentMessage: null,
      anchorRect: null,
    });
  },
}));
