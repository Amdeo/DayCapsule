import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ActivityIndicator, TouchableOpacity, ScrollView
} from 'react-native';

// Theme configuration
const theme = {
  dark: false,
  colors: {
    primary: '#6A89CC',
    primaryContainer: '#E8F0FE',
    secondary: '#F5A68D',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    onSurface: '#1C1B1F',
    onSurfaceVariant: '#6C6B70',
    outline: '#79747E',
    error: '#B00020',
    success: '#4CAF50',
  },
};

// Error Boundary Component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: string}> {
  state = { hasError: false, error: '' };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>出错了</Text>
          <Text style={styles.errorText}>{this.state.error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => this.setState({ hasError: false, error: '' })}
          >
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// Loading Component
const LoadingScreen: React.FC<{message?: string}> = ({ message = '加载中...' }) => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={theme.colors.primary} />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
);

// Main Content Component
const MainContent: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{title: string, time: string, status: string} | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate successful data
      setData({
        title: 'MemoryCapsule',
        time: new Date().toLocaleString('zh-CN'),
        status: '运行正常 ✅',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="正在初始化..." />;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>错误</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📱 MemoryCapsule</Text>
        <Text style={styles.headerSubtitle}>智能生活记录应用</Text>
      </View>

      {/* Status Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>应用状态</Text>
        <View style={styles.statusRow}>
          <View style={styles.statusIndicator} />
          <Text style={styles.statusText}>{data?.status}</Text>
        </View>
        <Text style={styles.timeText}>{data?.time}</Text>
      </View>

      {/* Features Preview */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>主要功能</Text>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>📝</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>多模态记录</Text>
            <Text style={styles.featureDesc}>照片、语音、文字，随时随地记录生活</Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>🔍</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>智能搜索</Text>
            <Text style={styles.featureDesc}>FTS5全文搜索，快速找到回忆</Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>📅</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>时间线回顾</Text>
            <Text style={styles.featureDesc}>按时间浏览，重温美好时刻</Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>🤖</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>AI智能标签</Text>
            <Text style={styles.featureDesc}>自动识别内容，智能分类整理</Text>
          </View>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity style={styles.actionButton} onPress={loadData}>
        <Text style={styles.actionButtonText}>刷新数据</Text>
      </TouchableOpacity>

      {/* Footer */}
      <Text style={styles.footerText}>MemoryCapsule v1.0.0</Text>
    </ScrollView>
  );
};

// Main App Component with Error Boundary
const App: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ErrorBoundary>
        <MainContent />
      </ErrorBoundary>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.error,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.success,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  timeText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 16,
  },
});

export default App;
