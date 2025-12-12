import React, {useEffect} from 'react';
import {View, StyleSheet, ScrollView, ActivityIndicator} from 'react-native';
import {Text, useTheme, Button} from 'react-native-paper';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '@store';
import {fetchTranscriptionStats, clearError} from '@store/slices/statsSlice';
import {TranscriptionStatsCard} from '../components/TranscriptionStatsCard';
import {EmptyState} from '@ui';

export const StatsScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();
  const {transcriptionStats, loading, error} = useSelector((state: RootState) => state.stats);

  useEffect(() => {
    // 初始加载统计信息
    dispatch(fetchTranscriptionStats());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchTranscriptionStats());
  };

  const handleDismissError = () => {
    dispatch(clearError());
  };

  return (
    <View style={styles.container}>
      {/* 加载状态 */}
      {loading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            加载统计信息中...
          </Text>
        </View>
      )}

      {/* 错误状态 */}
      {error && !loading && (
        <View style={styles.centerContainer}>
          <Text variant="bodyMedium" style={{color: theme.colors.error, marginBottom: 16}}>
            加载失败: {error}
          </Text>
          <Button mode="contained" onPress={handleDismissError}><Text>关闭</Text></Button>
        </View>
      )}

      {/* 统计信息 */}
      {!loading && !error && transcriptionStats && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text variant="headlineSmall">转录统计分析</Text>
            <Button mode="outlined" onPress={handleRefresh} compact><Text>刷新</Text></Button>
          </View>

          {transcriptionStats.totalTranscribedEntries === 0 ? (
            <EmptyState
              icon="chart-box"
              title="暂无数据"
              message="还没有转录记录，开始记录您的语音吧"
            />
          ) : (
            <TranscriptionStatsCard stats={transcriptionStats} testID="transcription-stats-card" />
          )}
        </ScrollView>
      )}

      {/* 空状态 */}
      {!loading && !error && !transcriptionStats && (
        <View style={styles.centerContainer}>
          <EmptyState icon="chart-box" title="暂无统计信息" message="加载统计信息失败，请重试" />
          <Button mode="contained" onPress={handleRefresh} style={styles.retryButton}><Text>重试</Text></Button>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  loadingText: {
    marginTop: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 16,
  },
});
