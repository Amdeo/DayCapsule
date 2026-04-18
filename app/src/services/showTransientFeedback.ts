import { useTransientFeedbackStore } from '@/src/store/transientFeedbackStore';

export function showTransientFeedback(message: string): void {
  useTransientFeedbackStore.getState().show(message);
}
