import {
  useAppDialogStore,
  type AppDialogAction,
  type AppDialogDetail,
  type AppDialogRequest,
} from '@/src/store/appDialogStore';

export type ErrorFeedbackAction = Omit<AppDialogAction, 'role'> & {
  role: 'primary' | 'secondary';
};

export type ErrorFeedbackDetail = AppDialogDetail;

export type ErrorFeedbackRequest = Omit<AppDialogRequest, 'tone' | 'actions' | 'blocking'> & {
  tone?: 'error' | 'accent';
  actions: ErrorFeedbackAction[];
};

export const useErrorFeedbackStore = useAppDialogStore;
