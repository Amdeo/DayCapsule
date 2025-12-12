import React, {Component, ErrorInfo, ReactNode} from 'react';
import {View, StyleSheet} from 'react-native';
import {Text, Button} from 'react-native-paper';
import {logger} from '@services/telemetry/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 记录错误到日志系统
    logger.error('ErrorBoundary caught an error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // 保存错误信息到 state
    this.setState({
      errorInfo,
    });

    // 调用自定义错误处理
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误 UI
      return (
        <View style={styles.container}>
          <Text variant="headlineMedium" style={styles.title}>
            出错了
          </Text>
          <Text variant="bodyMedium" style={styles.message}>
            应用遇到了一个错误，请尝试重新加载
          </Text>
          {__DEV__ && this.state.error && (
            <View style={styles.errorDetails}>
              <Text variant="bodySmall" style={styles.errorText}>
                {this.state.error.message}
              </Text>
              {this.state.errorInfo && (
                <Text variant="bodySmall" style={styles.errorText}>
                  {this.state.errorInfo.componentStack}
                </Text>
              )}
            </View>
          )}
          <Button mode="contained" onPress={this.handleReset} style={styles.button}>
            重新加载
          </Button>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.7,
  },
  errorDetails: {
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    maxWidth: '100%',
  },
  errorText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  button: {
    minWidth: 120,
  },
});
