import React, {useState, useEffect} from 'react';
import {View, StyleSheet, Text, TouchableOpacity, ActivityIndicator} from 'react-native';
import {useSelector} from 'react-redux';

interface SyncStatusIndicatorProps {
  onPress?: () => void;
  showDetails?: boolean;
  testID?: string;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  onPress,
  showDetails = false,
  testID,
}) => {
  const {isOnline, isSyncing, queueSize, lastSyncTime} = useSelector(
    (state: any) => state.sync,
  );

  const [showTooltip, setShowTooltip] = useState(false);

  // 获取状态文本和颜色
  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        text: '离线',
        color: '#FF9500',
        icon: '📡',
        description: '设备离线，数据将在恢复连接后同步',
      };
    }

    if (isSyncing) {
      return {
        text: '同步中',
        color: '#007AFF',
        icon: '🔄',
        description: `正在同步 ${queueSize} 项数据`,
      };
    }

    if (queueSize > 0) {
      return {
        text: `待同步 ${queueSize}`,
        color: '#FF3B30',
        icon: '⚠️',
        description: `有 ${queueSize} 项数据等待同步`,
      };
    }

    return {
      text: '已同步',
      color: '#34C759',
      icon: '✓',
      description: '所有数据已同步',
    };
  };

  const statusInfo = getStatusInfo();

  // 格式化最后同步时间
  const formatLastSyncTime = () => {
    if (!lastSyncTime) {
      return '从未同步';
    }

    const now = Date.now();
    const diff = now - lastSyncTime;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) {
      return '刚刚';
    } else if (minutes < 60) {
      return `${minutes} 分钟前`;
    } else if (hours < 24) {
      return `${hours} 小时前`;
    } else {
      return `${days} 天前`;
    }
  };

  return (
    <View style={styles.container} testID={testID}>
      {/* 状态指示器 */}
      <TouchableOpacity
        style={[styles.indicator, {borderColor: statusInfo.color}]}
        onPress={() => {
          setShowTooltip(!showTooltip);
          onPress?.();
        }}
        testID="sync_status_button"
      >
        {isSyncing ? (
          <ActivityIndicator size="small" color={statusInfo.color} />
        ) : (
          <Text style={styles.icon}>{statusInfo.icon}</Text>
        )}
        <Text style={[styles.text, {color: statusInfo.color}]}>
          {statusInfo.text}
        </Text>
      </TouchableOpacity>

      {/* 详细信息 */}
      {(showDetails || showTooltip) && (
        <View style={styles.tooltip} testID="sync_status_tooltip">
          <View style={styles.tooltipContent}>
            <Text style={styles.tooltipTitle}>同步状态</Text>

            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>状态：</Text>
              <Text style={[styles.tooltipValue, {color: statusInfo.color}]}>
                {statusInfo.text}
              </Text>
            </View>

            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>描述：</Text>
              <Text style={styles.tooltipValue}>{statusInfo.description}</Text>
            </View>

            {lastSyncTime && (
              <View style={styles.tooltipRow}>
                <Text style={styles.tooltipLabel}>最后同步：</Text>
                <Text style={styles.tooltipValue}>{formatLastSyncTime()}</Text>
              </View>
            )}

            {queueSize > 0 && (
              <View style={styles.tooltipRow}>
                <Text style={styles.tooltipLabel}>待同步项数：</Text>
                <Text style={styles.tooltipValue}>{queueSize}</Text>
              </View>
            )}

            {!isOnline && (
              <View style={styles.tooltipWarning}>
                <Text style={styles.tooltipWarningText}>
                  ⚠️ 设备离线，请检查网络连接
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#f9f9f9',
  },
  icon: {
    fontSize: 14,
    marginRight: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  tooltip: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
    minWidth: 250,
  },
  tooltipContent: {
    padding: 12,
  },
  tooltipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  tooltipRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  tooltipLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    minWidth: 60,
  },
  tooltipValue: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  tooltipWarning: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#FFF3E0',
    borderRadius: 4,
    padding: 8,
  },
  tooltipWarningText: {
    fontSize: 11,
    color: '#FF9500',
    fontWeight: '500',
  },
});

