/**
 * 转录进度显示组件
 *
 * 显示语音转文字的进度条和状态信息
 */

import React, {useEffect, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {ProgressBar, Text, Button, useTheme} from 'react-native-paper';

interface TranscriptionProgressProps {
  isVisible: boolean;
  progress?: number; // 0-1
  status?: 'transcribing' | 'completed' | 'error';
  message?: string;
  onCancel?: () => void;
  testID?: string;
}

export const TranscriptionProgress: React.FC<TranscriptionProgressProps> = ({
  isVisible,
  progress = 0,
  status = 'transcribing',
  message = '正在转录...',
  onCancel,
  testID,
}) => {
  const theme = useTheme();
  const [displayProgress, setDisplayProgress] = useState(progress);

  // 模拟进度条动画
  useEffect(() => {
    if (status === 'transcribing' && progress < 0.9) {
      const timer = setTimeout(() => {
        setDisplayProgress(prev => Math.min(prev + 0.1, 0.9));
      }, 500);

      return () => clearTimeout(timer);
    } else if (status === 'completed') {
      setDisplayProgress(1);
    }
  }, [status, progress]);

  if (!isVisible) {
    return null;
  }

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return theme.colors.primary;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.primary;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'completed':
        return '转录完成';
      case 'error':
        return '转录失败';
      default:
        return message;
    }
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.surface}]} testID={testID}>
      <View style={styles.content}>
        <Text variant="bodyMedium" style={styles.message}>
          {getStatusMessage()}
        </Text>

        <ProgressBar
          progress={displayProgress}
          color={getStatusColor()}
          style={styles.progressBar}
          testID={`${testID}-progress-bar`}
        />

        <Text variant="labelSmall" style={styles.percentage}>
          {Math.round(displayProgress * 100)}%
        </Text>
      </View>

      {status === 'transcribing' && onCancel && (
        <Button
          mode="text"
          onPress={onCancel}
          testID={`${testID}-cancel-button`}
          style={styles.cancelButton}>
          取消
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  content: {
    marginBottom: 12,
  },
  message: {
    marginBottom: 8,
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
  percentage: {
    textAlign: 'right',
    color: '#666',
  },
  cancelButton: {
    alignSelf: 'flex-end',
  },
});
