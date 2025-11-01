import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Animated} from 'react-native';
import {Text, ProgressBar} from 'react-native-paper';

interface TranscriptionProgressProps {
  progress: number; // 0-100
  testID?: string;
}

export const TranscriptionProgress: React.FC<TranscriptionProgressProps> = ({
  progress,
  testID,
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  // 动画化进度条
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  // 动画化加载点
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(dotAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [dotAnim]);

  const dotOpacity = dotAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 0.3],
  });

  return (
    <View style={styles.container} testID={testID || 'transcription_progress'}>
      {/* 标题 */}
      <View style={styles.header}>
        <Text style={styles.title}>正在转写...</Text>
        <Text style={styles.percentage}>{Math.round(progress)}%</Text>
      </View>

      {/* 进度条 */}
      <View style={styles.progressBarContainer}>
        <ProgressBar
          progress={progress / 100}
          color="#2196f3"
          style={styles.progressBar}
        />
      </View>

      {/* 加载动画 */}
      <View style={styles.loadingContainer}>
        <Animated.View
          style={[
            styles.loadingDot,
            {
              opacity: dotOpacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.loadingDot,
            {
              opacity: dotOpacity,
              marginLeft: 8,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.loadingDot,
            {
              opacity: dotOpacity,
              marginLeft: 8,
            },
          ]}
        />
      </View>

      {/* 提示文本 */}
      <Text style={styles.hint}>
        {progress < 30
          ? '正在处理音频...'
          : progress < 60
          ? '正在识别语音...'
          : progress < 90
          ? '正在生成文本...'
          : '即将完成...'}
      </Text>

      {/* 预计时间 */}
      <Text style={styles.estimatedTime}>
        预计还需 {Math.max(0, Math.round((100 - progress) / 10))} 秒
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  percentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  progressBarContainer: {
    marginBottom: 12,
    overflow: 'hidden',
    borderRadius: 4,
  },
  progressBar: {
    height: 6,
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196f3',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  estimatedTime: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

