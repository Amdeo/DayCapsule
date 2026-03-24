import { useErrorFeedbackStore, type ErrorFeedbackRequest } from '@/src/store/errorFeedbackStore';

export function showErrorFeedback(request: ErrorFeedbackRequest): void {
  useErrorFeedbackStore.getState().show(request);
}
