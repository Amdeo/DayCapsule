import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import {storageMonitorService} from '@services/storage/storageMonitor';
import {logger} from '@services/telemetry/logger';

interface DataManagementProps {
  testID?: string;
}

export const DataManagement: React.FC<DataManagementProps> = ({testID}) => {
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // 加载存储信息
  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      setIsLoading(true);
      const info = await storageMonitorService.getStorageInfo();
      const bd = await storageMonitorService.getStorageBreakdown();
      setStorageInfo(info);
      setBreakdown(bd);
    } catch (error) {
      logger.error('Failed to load storage info', {error});
    } finally {
      setIsLoading(false);
    }
  };

  // 格式化字节大小
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // 清理缓存
  const handleClearCache = async () => {
    Alert.alert('清理缓存', '确定要清理缓存吗？', [
      {text: '取消', onPress: () => {}},
      {
        text: '清理',
        onPress: async () => {
          try {
            setIsClearing(true);
            const clearedSize = await storageMonitorService.clearCache();
            Alert.alert('成功', `已清理 ${formatBytes(clearedSize)} 缓存`);
            await loadStorageInfo();
            logger.info('Cache cleared', {size: clearedSize});
          } catch (error) {
            logger.error('Failed to clear cache', {error});
            Alert.alert('失败', '清理缓存失败');
          } finally {
            setIsClearing(false);
          }
        },
      },
    ]);
  };

  // 清理过期数据
  const handleCleanupExpired = async () => {
    Alert.alert('清理过期数据', '确定要清理 30 天前的数据吗？', [
      {text: '取消', onPress: () => {}},
      {
        text: '清理',
        onPress: async () => {
          try {
            setIsClearing(true);
            const clearedSize = await storageMonitorService.cleanupExpiredData(30);
            Alert.alert('成功', `已清理 ${formatBytes(clearedSize)} 过期数据`);
            await loadStorageInfo();
            logger.info('Expired data cleaned', {size: clearedSize});
          } catch (error) {
            logger.error('Failed to cleanup expired data', {error});
            Alert.alert('失败', '清理过期数据失败');
          } finally {
            setIsClearing(false);
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.container} testID={testID}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} testID={testID}>
      {/* 存储概览 */}
      {storageInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>存储空间</Text>

          <View style={styles.storageCard}>
            <View style={styles.storageInfo}>
              <Text style={styles.storageLabel}>总容量</Text>
              <Text style={styles.storageValue}>
                {formatBytes(storageInfo.totalSpace)}
              </Text>
            </View>

            <View style={styles.storageInfo}>
              <Text style={styles.storageLabel}>已使用</Text>
              <Text style={[styles.storageValue, {color: '#FF3B30'}]}>
                {formatBytes(storageInfo.usedSpace)}
              </Text>
            </View>

            <View style={styles.storageInfo}>
              <Text style={styles.storageLabel}>可用</Text>
              <Text style={[styles.storageValue, {color: '#34C759'}]}>
                {formatBytes(storageInfo.availableSpace)}
              </Text>
            </View>
          </View>

          {/* 进度条 */}
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                {width: `${storageInfo.usagePercentage * 100}%`},
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            已使用 {(storageInfo.usagePercentage * 100).toFixed(1)}%
          </Text>
        </View>
      )}

      {/* 存储分布 */}
      {breakdown && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>存储分布</Text>

          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>📊 数据库</Text>
            <Text style={styles.breakdownValue}>{formatBytes(breakdown.database)}</Text>
          </View>

          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>🖼️ 媒体文件</Text>
            <Text style={styles.breakdownValue}>{formatBytes(breakdown.media)}</Text>
          </View>

          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>💾 缓存</Text>
            <Text style={styles.breakdownValue}>{formatBytes(breakdown.cache)}</Text>
          </View>

          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>📁 其他</Text>
            <Text style={styles.breakdownValue}>{formatBytes(breakdown.other)}</Text>
          </View>
        </View>
      )}

      {/* 清理操作 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>清理操作</Text>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleClearCache}
          disabled={isClearing}
          testID="clear_cache_button"
        >
          {isClearing ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.actionButtonText}>🗑️ 清理缓存</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleCleanupExpired}
          disabled={isClearing}
          testID="cleanup_expired_button"
        >
          {isClearing ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.actionButtonText}>🧹 清理过期数据</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.refreshButton]}
          onPress={loadStorageInfo}
          disabled={isLoading}
          testID="refresh_storage_button"
        >
          <Text style={styles.refreshButtonText}>🔄 刷新</Text>
        </TouchableOpacity>
      </View>

      {/* 提示信息 */}
      <View style={styles.tips}>
        <Text style={styles.tipsTitle}>💡 提示</Text>
        <Text style={styles.tipsText}>
          • 定期清理缓存可以释放存储空间{'\n'}
          • 清理过期数据不会影响最近的记录{'\n'}
          • 建议在 WiFi 环境下进行清理操作
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  storageCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  storageInfo: {
    alignItems: 'center',
  },
  storageLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  storageValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#333',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: '#f0f0f0',
  },
  refreshButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tips: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 12,
    color: '#0066CC',
    lineHeight: 18,
  },
});

