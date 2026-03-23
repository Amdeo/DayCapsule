import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { logger } from '@/src/utils/logger';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
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
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View testID="error-boundary-root" className="flex-1 items-center justify-center bg-[#121212] px-5">
          <Text className="mb-4 text-2xl font-bold text-white">应用遇到错误</Text>
          <Text className="mb-6 text-center text-sm text-[#AAAAAA]">
            {this.state.error?.message || '未知错误'}
          </Text>
          <TouchableOpacity
            testID="error-boundary-reset"
            className="rounded-lg bg-[#6200ee] px-6 py-3"
            onPress={this.handleReset}
          >
            <Text className="text-base font-semibold text-white">重试</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
