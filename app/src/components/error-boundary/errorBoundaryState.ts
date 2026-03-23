export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export const ERROR_BOUNDARY_INITIAL_STATE: ErrorBoundaryState = {
  hasError: false,
  error: null,
};
