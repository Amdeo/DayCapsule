import { showAppDialog } from '@/src/services/showAppDialog';
import type { ErrorFeedbackRequest } from '@/src/store/errorFeedbackStore';

export function showErrorFeedback(request: ErrorFeedbackRequest): void {
  showAppDialog({
    ...request,
    tone: request.tone ?? 'error',
  });
}
