import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📝',
  title,
  message,
  action,
  secondaryAction,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.icon, { color: theme.colors.onSurfaceVariant }]}>
          {icon}
        </Text>
        
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>
          {title}
        </Text>
        
        <Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
          {message}
        </Text>
        
        {action && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            onPress={action.onPress}
          >
            <Text style={[styles.actionText, { color: theme.colors.onPrimary }]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        )}
        
        {secondaryAction && (
          <TouchableOpacity 
            style={[styles.secondaryActionButton]}
            onPress={secondaryAction.onPress}
          >
            <Text style={[styles.secondaryActionText, { color: theme.colors.primary }]}>
              {secondaryAction.label}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Predefined empty states
export const EmptyEntriesState: React.FC<{ onCreateEntry: () => void }> = ({ onCreateEntry }) => (
  <EmptyState
    icon="📱"
    title="还没有记录"
    message="开始记录你的美好生活时光吧！"
    action={{
      label: '创建第一条记录',
      onPress: onCreateEntry,
    }}
  />
);

export const EmptySearchResults: React.FC<{ onClearSearch: () => void }> = ({ onClearSearch }) => (
  <EmptyState
    icon="🔍"
    title="没有找到结果"
    message="试试调整搜索关键词或清除筛选条件"
    action={{
      label: '清除搜索',
      onPress: onClearSearch,
    }}
  />
);

export const EmptyTimelineState: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => (
  <EmptyState
    icon="📅"
    title="这个时间没有记录"
    message="选择其他日期查看记录"
    action={{
      label: '刷新',
      onPress: onRefresh,
    }}
  />
);

export const NetworkErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <EmptyState
    icon="🌐"
    title="网络连接失败"
    message="请检查网络连接后重试"
    action={{
      label: '重试',
      onPress: onRetry,
    }}
  />
);

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
    fontSize: 64,
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
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  secondaryActionText: {
    fontSize: 14,
  },
});
