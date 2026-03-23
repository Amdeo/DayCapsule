import React from 'react';
import * as Sentry from '@sentry/react-native';
import { logger } from '@/src/utils/logger';
import { ErrorBoundaryFallback } from './error-boundary/ErrorBoundaryFallback';
import {
  ERROR_BOUNDARY_INITIAL_STATE,
  ErrorBoundaryState,
} from './error-boundary/errorBoundaryState';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = ERROR_BOUNDARY_INITIAL_STATE;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('ErrorBoundary 捕获错误:', error, errorInfo);

    // 发送到 Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }

  handleReset = () => {
    this.setState(ERROR_BOUNDARY_INITIAL_STATE);
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorBoundaryFallback
          message={this.state.error?.message || '未知错误'}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
