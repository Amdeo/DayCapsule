import {
  type TransientFeedbackAnchorRect,
  useTransientFeedbackStore,
} from '@/src/store/transientFeedbackStore';

type ShowTransientFeedbackOptions = {
  anchorRect?: TransientFeedbackAnchorRect | null;
};

export function showTransientFeedback(
  message: string,
  options?: ShowTransientFeedbackOptions,
): void {
  useTransientFeedbackStore.getState().show(message, options?.anchorRect ?? null);
}
