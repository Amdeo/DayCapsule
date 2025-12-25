import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundaryComponent extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback 
          error={this.state.error} 
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

const ErrorFallback: React.FC<{ error?: Error; onRetry: () => void }> = ({ 
  error, 
  onRetry 
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.icon, { color: theme.colors.error }]}>
          ⚠️
        </Text>
        
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>
          出现了一些问题
        </Text>
        
        <Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
          应用程序遇到了意外错误
        </Text>
        
        {__DEV__ && error && (
          <View style={[styles.errorDetails, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={[styles.errorText, { color: theme.colors.onSurfaceVariant }]}>
              {error.message}
            </Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
          onPress={onRetry}
        >
          <Text style={[styles.retryText, { color: theme.colors.onPrimary }]}>
            重试
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.resetButton]}
          onPress={() => {
            // Reset app state or navigate to initial screen
            onRetry();
          }}
        >
          <Text style={[styles.resetText, { color: theme.colors.primary }]}>
            重置应用
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const ErrorBoundary: React.FC<Props> = (props) => {
  return <ErrorBoundaryComponent {...props} />;
};

export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  return (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorDetails: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    maxHeight: 100,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resetText: {
    fontSize: 14,
  },
});
